// Emergency Auth Clear Script
// Run this in browser console to completely clear all auth data

function clearAllAuth() {
    console.log('🧹 Clearing all authentication data...');
    
    // Clear localStorage
    const authKeys = ['auth_token', 'user', 'accessToken', 'idToken', 'refreshToken'];
    authKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`✓ Removed ${key}`);
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('✓ Cleared sessionStorage');
    
    // Clear Cognito session if SDK is loaded
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
                console.log('✓ Signed out from Cognito');
            }
        } catch (e) {
            console.log('⚠️  Could not sign out from Cognito:', e.message);
        }
    }
    
    console.log('✅ All auth data cleared! Redirecting to login...');
    
    // Redirect to login
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// Auto-run if called directly
if (typeof module === 'undefined') {
    clearAllAuth();
} 