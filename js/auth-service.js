// Authentication Service for Lead Management System

class AuthService {
    constructor() {
        this.cognitoConfig = null;
        this.userPool = null;
        this.currentUser = null;
        this.initialized = false;
        this.initializationPromise = null;
        this.refreshInterval = null;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Initialize the authentication service
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = new Promise(async (resolve, reject) => {
            try {
                // Wait for Cognito SDK
                await this.waitForCognitoSDK();

                // Get configuration
                this.cognitoConfig = window.AppConfig ? 
                    window.AppConfig.getCognitoConfig() :
                    {
                        UserPoolId: 'us-east-1_lhc964tLD',
                        ClientId: '5t6mane4fnvineksoqb4ta0iu1'
                    };

                // Initialize user pool
                this.userPool = new AmazonCognitoIdentity.CognitoUserPool(this.cognitoConfig);
                
                // Try to get current user
                this.currentUser = this.userPool.getCurrentUser();

                // Setup token refresh
                this.setupTokenRefresh();

                this.initialized = true;
                resolve(true);
            } catch (error) {
                console.error('Failed to initialize auth service:', error);
                reject(error);
            }
        });

        return this.initializationPromise;
    }

    /**
     * Wait for Cognito SDK to load
     */
    waitForCognitoSDK() {
        return new Promise((resolve, reject) => {
            if (typeof AmazonCognitoIdentity !== 'undefined') {
                resolve();
                return;
            }

            let attempts = 0;
            const maxAttempts = 10;
            const interval = setInterval(() => {
                attempts++;
                if (typeof AmazonCognitoIdentity !== 'undefined') {
                    clearInterval(interval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    reject(new Error('Cognito SDK failed to load'));
                }
            }, 500);
        });
    }

    /**
     * Check if user is authenticated
     */
    async checkAuth(retryCount = 0) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            if (!this.currentUser) {
                throw new Error('No user session found');
            }

            // Get user data from localStorage
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                throw new Error('No user data found');
            }

            const userData = JSON.parse(userStr);
            if (!userData.email || !userData.role) {
                throw new Error('Invalid user data');
            }

            // Verify session is valid
            const session = await this.getSession();
            if (!session.isValid()) {
                throw new Error('Invalid session');
            }

            // Update tokens
            this.updateTokens(session);

            return {
                isAuthenticated: true,
                user: userData
            };

        } catch (error) {
            console.error('Auth check failed:', error);

            // Retry logic
            if (retryCount < this.retryAttempts) {
                console.log(`Retrying auth check (${retryCount + 1}/${this.retryAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.checkAuth(retryCount + 1);
            }

            // Clear auth data
            this.clearAuthData();
            
            return {
                isAuthenticated: false,
                error: error.message
            };
        }
    }

    /**
     * Get current session
     */
    getSession() {
        return new Promise((resolve, reject) => {
            if (!this.currentUser) {
                reject(new Error('No user session'));
                return;
            }

            this.currentUser.getSession((err, session) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(session);
            });
        });
    }

    /**
     * Update tokens in localStorage
     */
    updateTokens(session) {
        const accessToken = session.getAccessToken().getJwtToken();
        const idToken = session.getIdToken().getJwtToken();
        const refreshToken = session.getRefreshToken().getToken();

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('idToken', idToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('auth_token', idToken); // For backward compatibility
    }

    /**
     * Setup token refresh
     */
    setupTokenRefresh() {
        // Clear existing interval if any
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Refresh immediately
        this.refreshToken();

        // Setup periodic refresh (45 minutes)
        this.refreshInterval = setInterval(() => {
            this.refreshToken();
        }, 45 * 60 * 1000);
    }

    /**
     * Refresh token
     */
    async refreshToken(retryCount = 0) {
        try {
            const session = await this.getSession();
            this.updateTokens(session);
        } catch (error) {
            console.error('Token refresh failed:', error);

            // Retry logic
            if (retryCount < this.retryAttempts) {
                console.log(`Retrying token refresh (${retryCount + 1}/${this.retryAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.refreshToken(retryCount + 1);
            }

            // Clear auth data and redirect
            this.clearAuthData();
            window.location.href = 'login.html';
        }
    }

    /**
     * Clear authentication data
     */
    clearAuthData() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('idToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.currentUser = null;
    }

    /**
     * Sign out user
     */
    signOut() {
        if (this.currentUser) {
            this.currentUser.signOut();
        }
        this.clearAuthData();
        window.location.href = 'login.html';
    }
}

// Create and export singleton instance
const authService = new AuthService();
window.authService = authService; // Make available globally 