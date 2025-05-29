// Force Logout Script - Clears all auth data to fix boot loop
// This runs once and then removes itself

(function() {
    console.log('🔄 Running one-time force logout to fix auth issues...');
    
    // Check if we've already run this - using v2 to force re-run
    const forceLogoutCompleted = localStorage.getItem('force_logout_completed_v2');
    
    if (!forceLogoutCompleted) {
        console.log('🧹 Clearing all authentication data...');
        
        // Clear all auth-related localStorage items
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('idToken');
        localStorage.removeItem('refreshToken');
        
        // Clear the old version flag too
        localStorage.removeItem('force_logout_completed_v1');
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Try to sign out of Cognito if possible
        if (typeof AmazonCognitoIdentity !== 'undefined') {
            try {
                const poolData = {
                    UserPoolId: 'us-east-1_lhc964tLD',
                    ClientId: '5t6mane4fnvineksoqb4ta0iu1'
                };
                const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
                const cognitoUser = userPool.getCurrentUser();
                
                if (cognitoUser) {
                    // First try to get and clear the session
                    cognitoUser.getSession((err, session) => {
                        if (!err && session) {
                            // Global sign out to invalidate all tokens
                            cognitoUser.globalSignOut({
                                onSuccess: function(result) {
                                    console.log('✅ Global sign out successful');
                                },
                                onFailure: function(err) {
                                    console.log('Global sign out failed:', err);
                                }
                            });
                        }
                    });
                    
                    // Also do a local signout
                    cognitoUser.signOut();
                    console.log('✅ Signed out of Cognito locally');
                    
                    // Clear any cached user data
                    cognitoUser.clearCachedTokens();
                }
                
                // Also try to clear the user pool's current user
                userPool.getCurrentUser()?.signOut();
                
                // Clear Cognito's storage
                if (window.localStorage) {
                    // Clear any Cognito-specific keys
                    Object.keys(localStorage).forEach(key => {
                        if (key.includes('CognitoIdentityServiceProvider') || 
                            key.includes('aws.cognito') ||
                            key.includes('amplify')) {
                            localStorage.removeItem(key);
                            console.log(`Cleared Cognito key: ${key}`);
                        }
                    });
                }
            } catch (e) {
                console.log('Error during Cognito cleanup:', e);
            }
        }
        
        // Mark that we've completed the force logout v2
        localStorage.setItem('force_logout_completed_v2', 'true');
        
        console.log('✅ Force logout completed - all users must log in again');
        
        // If we're not already on the login page, redirect there
        if (!window.location.pathname.includes('login')) {
            window.location.href = 'login.html';
        }
    } else {
        console.log('ℹ️ Force logout already completed previously');
    }
})(); 