/**
 * Authentication Module
 * Handles all authentication-related functionality
 */

// Configuration
let CONFIG = null;

/**
 * Load configuration from config.json
 */
async function loadAuthConfig() {
    try {
        const response = await fetch('config.json');
        if (response.ok) {
            CONFIG = await response.json();
            console.log('Auth configuration loaded');
        } else {
            console.warn('Could not load config.json, using default configuration');
            CONFIG = {
                userPoolId: 'us-east-1_Lhc964tLD',
                clientId: '5t6mane4fnvineksoqb4ta0iu1'
            };
        }
    } catch (error) {
        console.error('Error loading auth configuration:', error);
        CONFIG = {
            userPoolId: 'us-east-1_Lhc964tLD',
            clientId: '5t6mane4fnvineksoqb4ta0iu1'
        };
    }
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user is authenticated
 */
function isAuthenticated() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return !!(token && user.username);
}

/**
 * Get current user data
 * @returns {Object} - Current user object
 */
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || '{}');
}

/**
 * Get authentication token
 * @returns {string|null} - Auth token or null
 */
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

/**
 * Refresh Cognito token
 */
function refreshCognitoToken() {
    try {
        if (typeof AmazonCognitoIdentity === 'undefined') {
            console.warn('Cognito SDK not loaded');
            return;
        }
        
        if (!CONFIG) {
            console.warn('Auth config not loaded');
            return;
        }
        
        const userPool = new AmazonCognitoIdentity.CognitoUserPool({
            UserPoolId: CONFIG.userPoolId,
            ClientId: CONFIG.clientId
        });
        
        const currentUser = userPool.getCurrentUser();
        if (!currentUser) {
            console.warn('No user session found');
            return;
        }
        
        currentUser.getSession((err, session) => {
            if (err) {
                console.error('Error refreshing session:', err);
                
                if (err.name === 'NotAuthorizedException') {
                    signOut();
                }
                return;
            }
            
            if (session.isValid()) {
                const token = session.getIdToken().getJwtToken();
                localStorage.setItem('auth_token', token);
                console.log('Token refreshed successfully');
            } else {
                console.warn('Session is not valid');
                signOut();
            }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
    }
}

/**
 * Setup automatic token refresh
 */
function setupTokenRefresh() {
    // Refresh immediately on load
    refreshCognitoToken();
    
    // Setup periodic refresh (45 minutes = 2,700,000 ms)
    setInterval(refreshCognitoToken, 2700000);
}

/**
 * Sign out user
 */
function signOut() {
    try {
        if (typeof AmazonCognitoIdentity !== 'undefined' && CONFIG) {
            const userPool = new AmazonCognitoIdentity.CognitoUserPool({
                UserPoolId: CONFIG.userPoolId,
                ClientId: CONFIG.clientId
            });
            
            const currentUser = userPool.getCurrentUser();
            if (currentUser) {
                currentUser.signOut();
            }
        }
    } catch (error) {
        console.error('Error during Cognito sign out:', error);
    }
    
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
    
    // Redirect to login
    window.location.href = 'login.html';
}

/**
 * Redirect to login if not authenticated
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/**
 * Initialize authentication for dashboard pages
 */
async function initAuth() {
    await loadAuthConfig();
    
    if (!requireAuth()) {
        return false;
    }
    
    setupTokenRefresh();
    return true;
}

/**
 * Add user info to header
 */
function addUserInfoToHeader() {
    const user = getCurrentUser();
    const headerControls = document.querySelector('.controls');
    
    if (headerControls && user.username) {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <span>Welcome, <strong>${user.name || user.username}</strong></span>
            <span class="role-badge ${user.role === 'admin' ? 'role-admin' : 'role-agent'}">
                ${user.role === 'admin' ? 'Admin' : 'Agent'}
            </span>
            <button id="logout-btn" class="btn btn-sm btn-secondary" style="margin-left: 10px;">Logout</button>
        `;
        headerControls.appendChild(userInfo);
        
        // Add logout handler
        document.getElementById('logout-btn').addEventListener('click', signOut);
        
        // Show admin link if user is admin
        if (user.role === 'admin') {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.className = 'btn';
            adminLink.textContent = 'Admin Panel';
            headerControls.insertBefore(adminLink, headerControls.firstChild);
        }
    }
}

// Export functions for use in other modules
window.AuthModule = {
    isAuthenticated,
    getCurrentUser,
    getAuthToken,
    signOut,
    requireAuth,
    initAuth,
    addUserInfoToHeader,
    setupTokenRefresh,
    refreshCognitoToken
}; 