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
  }

  /**
   * Initialize Cognito
   */
  async initialize() {
    this.userPool = new AmazonCognitoIdentity.CognitoUserPool({
      UserPoolId: this.userPoolId,
      ClientId: this.clientId
    });

    this.currentUser = this.userPool.getCurrentUser();
    
    if (this.currentUser) {
      try {
        this.session = await this.getValidSession();
        console.log('✅ Session validated');
        return true;
      } catch (error) {
        console.log('⚠️ Session invalid');
        this.currentUser = null;
      }
    }
    return false;
  }

  /**
   * Get valid session
   */
  async getValidSession() {
    return new Promise((resolve, reject) => {
      this.currentUser.getSession((err, session) => {
        if (err || !session.isValid()) {
          reject(err || new Error('Invalid session'));
        } else {
          resolve(session);
        }
      });
    });
  }

  /**
   * Get ID token for API calls
   */
  getIdToken() {
    return this.session?.getIdToken()?.getJwtToken() || null;
  }

  /**
   * Check authentication
   */
  isAuthenticated() {
    return !!(this.session && this.session.isValid());
  }

  /**
   * Make API request with Cognito token
   */
  async apiRequest(endpoint, options = {}) {
    const token = this.getIdToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${this.apiEndpoint}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Login
   */
  async login(email, password) {
    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username: email,
      Password: password
    });

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
      Username: email,
      Pool: this.userPool
    });

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session) => {
          this.currentUser = cognitoUser;
          this.session = session;
          resolve({ success: true });
        },
        onFailure: reject
      });
    });
  }

  /**
   * Logout
   */
  logout() {
    if (this.currentUser) {
      this.currentUser.signOut();
    }
    this.currentUser = null;
    this.session = null;
    window.location.href = '/login.html';
  }
}

// Global instance
window.cognitoAuth = new CognitoAuthService();

console.log('🔐 Enterprise Cognito Auth loaded'); 