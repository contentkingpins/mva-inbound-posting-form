// Force Logout Script - Clears all auth data to fix boot loop
// This runs once and then removes itself

(function() {
    console.log('🔄 Running one-time force logout to fix auth issues...');
    
    // Check if we've already run this
    const forceLogoutCompleted = localStorage.getItem('force_logout_completed_v1');
    
    if (!forceLogoutCompleted) {
        console.log('🧹 Clearing all authentication data...');
        
        // Clear all auth-related localStorage items
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('idToken');
        localStorage.removeItem('refreshToken');
        
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
                    cognitoUser.signOut();
                    console.log('✅ Signed out of Cognito');
                }
            } catch (e) {
                console.log('Could not sign out of Cognito:', e);
            }
        }
        
        // Mark that we've completed the force logout
        localStorage.setItem('force_logout_completed_v1', 'true');
        
        console.log('✅ Force logout completed - all users must log in again');
        
        // If we're not already on the login page, redirect there
        if (!window.location.pathname.includes('login')) {
            window.location.href = 'login.html';
        }
    } else {
        console.log('ℹ️ Force logout already completed previously');
    }
})(); 