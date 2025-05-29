// Debug Authentication Issues
console.log('=== AUTH DEBUG START ===');

// Check localStorage
console.log('1. Checking localStorage:');
console.log('   - auth_token:', localStorage.getItem('auth_token') ? 'EXISTS' : 'MISSING');
console.log('   - user:', localStorage.getItem('user'));
console.log('   - accessToken:', localStorage.getItem('accessToken') ? 'EXISTS' : 'MISSING');
console.log('   - idToken:', localStorage.getItem('idToken') ? 'EXISTS' : 'MISSING');

// Parse user object
const userStr = localStorage.getItem('user');
if (userStr) {
    try {
        const user = JSON.parse(userStr);
        console.log('2. User object parsed:');
        console.log('   - email:', user.email);
        console.log('   - username:', user.username);
        console.log('   - name:', user.name);
        console.log('   - role:', user.role);
        console.log('   - All keys:', Object.keys(user));
    } catch (e) {
        console.error('2. Failed to parse user object:', e);
    }
} else {
    console.log('2. No user object in localStorage');
}

// Check JWT token
const token = localStorage.getItem('auth_token');
if (token) {
    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('3. JWT Token payload:');
            console.log('   - exp:', new Date(payload.exp * 1000).toLocaleString());
            console.log('   - iat:', new Date(payload.iat * 1000).toLocaleString());
            console.log('   - email:', payload.email);
            console.log('   - cognito:username:', payload['cognito:username']);
            
            // Check if expired
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                console.log('   ⚠️  TOKEN IS EXPIRED!');
            } else {
                console.log('   ✅ Token is valid');
            }
        }
    } catch (e) {
        console.error('3. Failed to parse JWT token:', e);
    }
} else {
    console.log('3. No JWT token found');
}

// Check current page
console.log('4. Current page:', window.location.pathname);

// Check if Cognito session exists
if (typeof AmazonCognitoIdentity !== 'undefined') {
    const poolData = {
        UserPoolId: 'us-east-1_lhc964tLD',
        ClientId: '5t6mane4fnvineksoqb4ta0iu1'
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    const cognitoUser = userPool.getCurrentUser();
    
    if (cognitoUser) {
        console.log('5. Cognito user exists:', cognitoUser.username);
        cognitoUser.getSession((err, session) => {
            if (err) {
                console.error('5. Cognito session error:', err);
            } else if (session) {
                console.log('5. Cognito session valid:', session.isValid());
            }
        });
    } else {
        console.log('5. No Cognito user');
    }
} else {
    console.log('5. Cognito SDK not loaded');
}

console.log('=== AUTH DEBUG END ==='); 