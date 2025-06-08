/**
 * Token Consistency Fix
 * This ensures all parts of the system use the same token keys
 */

// Fix for login-init.js - add this after token storage
function ensureTokenConsistency() {
    const accessToken = localStorage.getItem('accessToken');
    const authToken = localStorage.getItem('auth_token');
    
    // If we have tokens but missing mva_token, set it for consistency
    if ((accessToken || authToken) && !localStorage.getItem('mva_token')) {
        const tokenToUse = accessToken || authToken;
        localStorage.setItem('mva_token', tokenToUse);
        console.log('✅ Token consistency fixed - mva_token set');
    }
}

// Fix for api-service.js - make isAuthenticated more robust
function enhanceAuthenticationCheck() {
    if (window.MVACRMAPIService) {
        const originalIsAuthenticated = window.MVACRMAPIService.prototype.isAuthenticated;
        
        window.MVACRMAPIService.prototype.isAuthenticated = function() {
            // Check all possible token locations
            const tokens = [
                localStorage.getItem('mva_token'),
                localStorage.getItem('accessToken'),
                localStorage.getItem('auth_token'),
                localStorage.getItem('idToken')
            ];
            
            const hasToken = tokens.some(token => token && token.length > 0);
            const hasApiKey = localStorage.getItem('vendor_api_key');
            
            return hasToken || hasApiKey;
        };
    }
}

// Auto-fix on page load
function autoFixTokens() {
    ensureTokenConsistency();
    enhanceAuthenticationCheck();
    console.log('🔧 Token consistency fixes applied');
}

// Export fixes
if (typeof module !== 'undefined') {
    module.exports = { ensureTokenConsistency, enhanceAuthenticationCheck, autoFixTokens };
} else {
    window.TokenFixes = { ensureTokenConsistency, enhanceAuthenticationCheck, autoFixTokens };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', autoFixTokens);
} 