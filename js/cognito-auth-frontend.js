/**
 * Cognito Authentication Frontend
 * Works with API Gateway Cognito Authorizer
 * NO localStorage dependencies
 */
class CognitoAuthService {
  constructor() {
    this.userPoolId = 'us-east-1_lhc964tLD';
    this.clientId = '5t6mane4fnvineksoqb4ta0iu1';
    this.apiEndpoint = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
    this.userPool = null;
    this.currentUser = null;
    this.session = null;
    this.tokenRefreshTimer = null;
  }

  /**
   * Initialize Cognito
   */
  async initialize() {
    if (typeof AmazonCognitoIdentity === 'undefined') {
      throw new Error('Cognito SDK not loaded');
    }

    this.userPool = new AmazonCognitoIdentity.CognitoUserPool({
      UserPoolId: this.userPoolId,
      ClientId: this.clientId
    });

    // Check for existing session
    this.currentUser = this.userPool.getCurrentUser();
    
    if (this.currentUser) {
      try {
        this.session = await this.getValidSession();
        this.setupTokenRefresh();
        console.log('✅ Existing session found and validated');
        return true;
      } catch (error) {
        console.log('⚠️ Existing session invalid, need fresh login');
        this.currentUser = null;
        this.session = null;
      }
    }

    return false;
  }

  /**
   * Login with email/password
   */
  async login(email, password) {
    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username: email,
      Password: password
    });

    const userData = {
      Username: email,
      Pool: this.userPool
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: async (session) => {
          this.currentUser = cognitoUser;
          this.session = session;
          this.setupTokenRefresh();
          
          console.log('✅ Login successful');
          resolve({
            success: true,
            user: this.getCurrentUserInfo(),
            needsRedirect: true
          });
        },
        onFailure: (error) => {
          console.error('❌ Login failed:', error);
          reject(error);
        },
        newPasswordRequired: (userAttributes) => {
          resolve({
            success: false,
            newPasswordRequired: true,
            userAttributes,
            cognitoUser
          });
        }
      });
    });
  }

  /**
   * Get valid session (automatically refreshes if needed)
   */
  async getValidSession() {
    if (!this.currentUser) {
      throw new Error('No current user');
    }

    return new Promise((resolve, reject) => {
      this.currentUser.getSession((err, session) => {
        if (err) {
          reject(err);
          return;
        }

        if (session && session.isValid()) {
          this.session = session;
          resolve(session);
        } else {
          reject(new Error('Invalid session'));
        }
      });
    });
  }

  /**
   * Get current ID token for API calls
   */
  getIdToken() {
    return this.session?.getIdToken()?.getJwtToken() || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!(this.session && this.session.isValid());
  }

  /**
   * Get current user info from token
   */
  getCurrentUserInfo() {
    if (!this.session) return null;

    try {
      const idToken = this.session.getIdToken();
      const payload = idToken.getPayload();
      
      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified,
        username: payload['cognito:username'] || payload.email,
        role: this.determineRole(payload.email),
        auth_time: payload.auth_time,
        exp: payload.exp
      };
    } catch (error) {
      console.error('Error parsing user info:', error);
      return null;
    }
  }

  /**
   * Determine user role (matches backend logic)
   */
  determineRole(email) {
    const adminEmails = [
      'george@contentkingpins.com',
      'admin@contentkingpins.com', 
      'alex@contentkingpins.com'
    ];

    return adminEmails.includes(email?.toLowerCase()) ? 'admin' : 'agent';
  }

  /**
   * Check if current user is admin
   */
  isAdmin() {
    const user = this.getCurrentUserInfo();
    return user?.role === 'admin';
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(endpoint, options = {}) {
    const token = this.getIdToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    };

    try {
      const response = await fetch(`${this.apiEndpoint}${endpoint}`, config);

      if (response.status === 401) {
        // Token might be expired, try to refresh
        await this.refreshSession();
        // Retry with new token
        config.headers.Authorization = `Bearer ${this.getIdToken()}`;
        const retryResponse = await fetch(`${this.apiEndpoint}${endpoint}`, config);
        
        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
        }
        
        return retryResponse.json();
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Refresh session
   */
  async refreshSession() {
    try {
      this.session = await this.getValidSession();
      console.log('🔄 Session refreshed successfully');
    } catch (error) {
      console.error('Session refresh failed:', error);
      this.logout();
      throw error;
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh() {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    // Refresh every 45 minutes
    this.tokenRefreshTimer = setInterval(async () => {
      try {
        await this.refreshSession();
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
        this.logout();
      }
    }, 45 * 60 * 1000);
  }

  /**
   * Logout user
   */
  logout() {
    if (this.currentUser) {
      this.currentUser.signOut();
    }

    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    this.currentUser = null;
    this.session = null;
    
    // Redirect to login
    window.location.href = '/login.html';
  }

  /**
   * Complete new password challenge
   */
  async completeNewPassword(cognitoUser, newPassword, userAttributes = {}) {
    return new Promise((resolve, reject) => {
      cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, {
        onSuccess: (session) => {
          this.currentUser = cognitoUser;
          this.session = session;
          this.setupTokenRefresh();
          resolve(session);
        },
        onFailure: reject
      });
    });
  }
}

// API Service that uses Cognito auth
class CognitoAPIService {
  constructor() {
    this.auth = new CognitoAuthService();
  }

  async initialize() {
    return this.auth.initialize();
  }

  // Publisher management methods
  async getVendors(queryParams = {}) {
    const searchParams = new URLSearchParams(queryParams);
    const endpoint = searchParams.toString() ? `/vendors?${searchParams}` : '/vendors';
    return this.auth.apiRequest(endpoint);
  }

  async createVendor(vendorData) {
    return this.auth.apiRequest('/vendors', {
      method: 'POST',
      body: JSON.stringify(vendorData)
    });
  }

  async updateVendor(vendorId, vendorData) {
    return this.auth.apiRequest(`/vendors/${vendorId}`, {
      method: 'PUT',
      body: JSON.stringify(vendorData)
    });
  }

  async deleteVendor(vendorId) {
    return this.auth.apiRequest(`/vendors/${vendorId}`, {
      method: 'DELETE'
    });
  }

  async regenerateVendorApiKey(vendorId) {
    return this.auth.apiRequest(`/vendors/${vendorId}/api-key`, {
      method: 'PUT'
    });
  }

  // Authentication helpers
  isAuthenticated() {
    return this.auth.isAuthenticated();
  }

  isAdmin() {
    return this.auth.isAdmin();
  }

  getCurrentUser() {
    return this.auth.getCurrentUserInfo();
  }

  async login(email, password) {
    return this.auth.login(email, password);
  }

  logout() {
    this.auth.logout();
  }
}

// Export for use
window.CognitoAuthService = CognitoAuthService;
window.CognitoAPIService = CognitoAPIService;

// Create global instance
window.cognitoAuth = new CognitoAuthService();
window.cognitoAPI = new CognitoAPIService();

console.log('🔐 Cognito Authentication Service loaded - Enterprise-grade security'); 