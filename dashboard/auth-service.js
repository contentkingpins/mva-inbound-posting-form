// AWS Cognito configuration
const AUTH_CONFIG = {
    userPoolId: process.env.USER_POOL_ID,
    clientId: process.env.USER_POOL_CLIENT_ID,
    region: 'us-east-1'
};

// Authentication service
class AuthService {
    constructor() {
        this.session = null;
    }

    // Sign in user
    async signIn(username, password) {
        try {
            const response = await fetch('/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: username, password })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            if (data.success) {
                // Store tokens
                localStorage.setItem('accessToken', data.tokens.accessToken);
                localStorage.setItem('refreshToken', data.tokens.refreshToken);
                localStorage.setItem('idToken', data.tokens.idToken);
                localStorage.setItem('userProfile', JSON.stringify(data.profile));
                
                this.session = {
                    accessToken: data.tokens.accessToken,
                    refreshToken: data.tokens.refreshToken,
                    idToken: data.tokens.idToken,
                    profile: data.profile
                };

                return true;
            }
            return false;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    // Sign out user
    signOut() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('idToken');
        localStorage.removeItem('userProfile');
        this.session = null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        const accessToken = localStorage.getItem('accessToken');
        return !!accessToken;
    }

    // Get current session
    getSession() {
        if (!this.session) {
            const accessToken = localStorage.getItem('accessToken');
            const refreshToken = localStorage.getItem('refreshToken');
            const idToken = localStorage.getItem('idToken');
            const profile = JSON.parse(localStorage.getItem('userProfile') || 'null');

            if (accessToken && refreshToken && idToken) {
                this.session = { accessToken, refreshToken, idToken, profile };
            }
        }
        return this.session;
    }

    // Refresh tokens
    async refreshTokens() {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch('/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            if (data.success) {
                // Update tokens
                localStorage.setItem('accessToken', data.tokens.accessToken);
                localStorage.setItem('idToken', data.tokens.idToken);
                
                this.session = {
                    ...this.session,
                    accessToken: data.tokens.accessToken,
                    idToken: data.tokens.idToken
                };

                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh error:', error);
            throw error;
        }
    }

    // Get user profile
    async getUserProfile() {
        try {
            const session = this.getSession();
            if (!session) {
                throw new Error('No active session');
            }

            const response = await fetch('/auth/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get user profile');
            }

            const data = await response.json();
            if (data.success) {
                localStorage.setItem('userProfile', JSON.stringify(data.profile));
                this.session.profile = data.profile;
                return data.profile;
            }
            return null;
        } catch (error) {
            console.error('Get profile error:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const authService = new AuthService(); 