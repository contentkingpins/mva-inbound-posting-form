/**
 * Production Authentication Service
 * NO localStorage - uses proper security patterns
 */
class ProductionAuthService {
  constructor() {
    this.userPoolId = 'us-east-1_lhc964tLD';
    this.clientId = '5t6mane4fnvineksoqb4ta0iu1';
    this.apiEndpoint = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
    this.currentUser = null;
    this.tokenRefreshTimer = null;
  }

  /**
   * Secure login - tokens never stored in localStorage
   */
  async login(email, password) {
    try {
      // Use Cognito SDK for authentication
      const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username: email,
        Password: password
      });

      const userData = {
        Username: email,
        Pool: new AmazonCognitoIdentity.CognitoUserPool({
          UserPoolId: this.userPoolId,
          ClientId: this.clientId
        })
      };

      const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

      return new Promise((resolve, reject) => {
        cognitoUser.authenticateUser(authDetails, {
          onSuccess: (result) => {
            // Store user info in memory only (not localStorage)
            this.currentUser = {
              email: email,
              idToken: result.getIdToken().getJwtToken(),
              accessToken: result.getAccessToken().getJwtToken(),
              refreshToken: result.getRefreshToken().getToken(),
              cognitoUser: cognitoUser
            };

            // Setup automatic token refresh
            this.setupTokenRefresh();

            resolve(this.currentUser);
          },
          onFailure: reject,
          newPasswordRequired: (userAttributes) => {
            resolve({ newPasswordRequired: true, userAttributes, cognitoUser });
          }
        });
      });
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Get current authentication token (from memory, not localStorage)
   */
  getAuthToken() {
    return this.currentUser?.idToken || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!(this.currentUser?.idToken);
  }

  /**
   * Get user info
   */
  getCurrentUser() {
    if (!this.currentUser) return null;

    try {
      // Decode token to get user info
      const tokenPayload = JSON.parse(atob(this.currentUser.idToken.split('.')[1]));
      return {
        email: tokenPayload.email,
        sub: tokenPayload.sub,
        role: this.determineUserRole(tokenPayload.email),
        emailVerified: tokenPayload.email_verified
      };
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }

  /**
   * Determine user role (matches backend logic)
   */
  determineUserRole(email) {
    const adminEmails = [
      'george@contentkingpins.com',
      'admin@contentkingpins.com',
      'alex@contentkingpins.com'
    ];

    return adminEmails.includes(email.toLowerCase()) ? 'admin' : 'agent';
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(endpoint, options = {}) {
    const token = this.getAuthToken();
    
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

    const response = await fetch(`${this.apiEndpoint}${endpoint}`, config);

    if (response.status === 401) {
      // Token expired, try refresh
      await this.refreshToken();
      // Retry with new token
      config.headers.Authorization = `Bearer ${this.getAuthToken()}`;
      return fetch(`${this.apiEndpoint}${endpoint}`, config);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Refresh token automatically
   */
  async refreshToken() {
    if (!this.currentUser?.cognitoUser) {
      throw new Error('No user to refresh');
    }

    return new Promise((resolve, reject) => {
      this.currentUser.cognitoUser.getSession((err, session) => {
        if (err) {
          this.logout();
          reject(err);
          return;
        }

        if (session.isValid()) {
          // Update tokens in memory
          this.currentUser.idToken = session.getIdToken().getJwtToken();
          this.currentUser.accessToken = session.getAccessToken().getJwtToken();
          resolve(session);
        } else {
          this.logout();
          reject(new Error('Session expired'));
        }
      });
    });
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
        await this.refreshToken();
        console.log('Token refreshed successfully');
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.logout();
      }
    }, 45 * 60 * 1000);
  }

  /**
   * Secure logout - clears memory only
   */
  logout() {
    if (this.currentUser?.cognitoUser) {
      this.currentUser.cognitoUser.signOut();
    }

    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    this.currentUser = null;
    window.location.href = '/login.html';
  }

  /**
   * Check user role
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  isAgent() {
    const user = this.getCurrentUser();
    return user?.role === 'agent';
  }
}

// Export for production use
window.ProductionAuthService = ProductionAuthService;
window.prodAuth = new ProductionAuthService();

console.log('🔐 Production Authentication Service loaded - NO localStorage used'); 