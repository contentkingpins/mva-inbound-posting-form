// Cognito Authentication Service
import { 
    CognitoUserPool, 
    CognitoUser, 
    AuthenticationDetails, 
    CognitoUserAttribute 
} from 'amazon-cognito-identity-js';

// Configuration
const COGNITO_CONFIG = {
    UserPoolId: 'us-east-1_lhc964tLD',
    ClientId: '5t6mane4fnvineksoqb4ta0iu1'
};

// Initialize the Cognito user pool
const userPool = new CognitoUserPool(COGNITO_CONFIG);

// Cognito Authentication Service
const CognitoAuth = {
    // Get the current user
    getCurrentUser: function() {
        return userPool.getCurrentUser();
    },
    
    // Sign in with Cognito
    signIn: function(email, password) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Starting direct Cognito login...');
                
                // Create authentication details
                const authenticationData = {
                    Username: email,
                    Password: password
                };
                const authenticationDetails = new AuthenticationDetails(authenticationData);
                
                // Create the Cognito user
                const userData = {
                    Username: email,
                    Pool: userPool
                };
                const cognitoUser = new CognitoUser(userData);
                
                // Authenticate with Cognito
                cognitoUser.authenticateUser(authenticationDetails, {
                    onSuccess: function(result) {
                        console.log('Cognito authentication successful');
                        
                        // Get token details
                        const accessToken = result.getAccessToken().getJwtToken();
                        const idToken = result.getIdToken().getJwtToken();
                        const refreshToken = result.getRefreshToken().getToken();
                        
                        // Store tokens in localStorage
                        localStorage.setItem('access_token', accessToken);
                        localStorage.setItem('id_token', idToken);
                        localStorage.setItem('refresh_token', refreshToken);
                        
                        // Get user attributes
                        cognitoUser.getUserAttributes(function(err, attributes) {
                            if (err) {
                                console.error('Error getting user attributes:', err);
                            } else {
                                // Create user object
                                const user = {};
                                attributes.forEach(attr => {
                                    user[attr.getName()] = attr.getValue();
                                });
                                
                                // Add role from custom attributes
                                if (user['custom:role']) {
                                    user.role = user['custom:role'];
                                }
                                
                                // Store user info
                                localStorage.setItem('user_info', JSON.stringify(user));
                                
                                // Resolve with user and token info
                                resolve({
                                    user,
                                    accessToken,
                                    idToken,
                                    refreshToken
                                });
                            }
                        });
                    },
                    
                    onFailure: function(err) {
                        console.error('Cognito authentication failed:', err);
                        reject(err);
                    },
                    
                    newPasswordRequired: function(userAttributes, requiredAttributes) {
                        console.log('New password required');
                        // Save the current user for later use
                        this.newPasswordUser = cognitoUser;
                        // Return challenge details
                        resolve({
                            requiresNewPassword: true,
                            userAttributes: userAttributes,
                            requiredAttributes: requiredAttributes
                        });
                    }
                });
            } catch (error) {
                console.error('Error in Cognito signIn:', error);
                reject(error);
            }
        });
    },
    
    // Complete new password challenge
    completeNewPasswordChallenge: function(newPassword, userAttributes = {}) {
        return new Promise((resolve, reject) => {
            try {
                // Check if we have a user in new password required state
                if (!this.newPasswordUser) {
                    return reject(new Error('No user in new password required state'));
                }
                
                // Complete the new password challenge
                this.newPasswordUser.completeNewPasswordChallenge(newPassword, userAttributes, {
                    onSuccess: (result) => {
                        console.log('Password changed successfully');
                        
                        // Get token details
                        const accessToken = result.getAccessToken().getJwtToken();
                        const idToken = result.getIdToken().getJwtToken();
                        const refreshToken = result.getRefreshToken().getToken();
                        
                        // Store tokens in localStorage
                        localStorage.setItem('access_token', accessToken);
                        localStorage.setItem('id_token', idToken);
                        localStorage.setItem('refresh_token', refreshToken);
                        
                        // Get user attributes
                        this.newPasswordUser.getUserAttributes((err, attributes) => {
                            // Clear the saved user
                            this.newPasswordUser = null;
                            
                            if (err) {
                                console.error('Error getting user attributes:', err);
                                resolve({ accessToken, idToken, refreshToken });
                            } else {
                                // Create user object
                                const user = {};
                                attributes.forEach(attr => {
                                    user[attr.getName()] = attr.getValue();
                                });
                                
                                // Add role from custom attributes
                                if (user['custom:role']) {
                                    user.role = user['custom:role'];
                                }
                                
                                // Store user info
                                localStorage.setItem('user_info', JSON.stringify(user));
                                
                                // Resolve with user and token info
                                resolve({
                                    user,
                                    accessToken,
                                    idToken,
                                    refreshToken
                                });
                            }
                        });
                    },
                    
                    onFailure: (err) => {
                        console.error('Failed to change password:', err);
                        // Clear the saved user
                        this.newPasswordUser = null;
                        reject(err);
                    }
                });
            } catch (error) {
                console.error('Error in completeNewPasswordChallenge:', error);
                reject(error);
            }
        });
    },
    
    // Sign up with Cognito
    signUp: function(email, password, firstName, lastName) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Starting direct Cognito signup...');
                
                // Prepare attributes
                const attributeList = [
                    new CognitoUserAttribute({
                        Name: 'given_name',
                        Value: firstName
                    }),
                    new CognitoUserAttribute({
                        Name: 'family_name',
                        Value: lastName
                    }),
                    new CognitoUserAttribute({
                        Name: 'email',
                        Value: email
                    })
                ];
                
                // Sign up with Cognito
                userPool.signUp(email, password, attributeList, null, (err, result) => {
                    if (err) {
                        console.error('Cognito signup failed:', err);
                        reject(err);
                    } else {
                        console.log('Cognito signup successful');
                        resolve(result);
                    }
                });
            } catch (error) {
                console.error('Error in Cognito signUp:', error);
                reject(error);
            }
        });
    },
    
    // Forgot password
    forgotPassword: function(email) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Starting direct Cognito forgot password...');
                
                // Create the Cognito user
                const userData = {
                    Username: email,
                    Pool: userPool
                };
                const cognitoUser = new CognitoUser(userData);
                
                // Initiate forgot password
                cognitoUser.forgotPassword({
                    onSuccess: function() {
                        console.log('Cognito forgot password successful');
                        resolve();
                    },
                    
                    onFailure: function(err) {
                        console.error('Cognito forgot password failed:', err);
                        reject(err);
                    }
                });
            } catch (error) {
                console.error('Error in Cognito forgotPassword:', error);
                reject(error);
            }
        });
    },
    
    // Sign out
    signOut: function() {
        // Get the current user
        const cognitoUser = this.getCurrentUser();
        
        // Sign out
        if (cognitoUser) {
            cognitoUser.signOut();
        }
        
        // Clear local storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('id_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
    },
    
    // Check if user is authenticated
    isAuthenticated: function() {
        return new Promise((resolve) => {
            // Get the current user
            const cognitoUser = this.getCurrentUser();
            
            if (!cognitoUser) {
                return resolve(false);
            }
            
            // Check if the session is valid
            cognitoUser.getSession((err, session) => {
                if (err || !session.isValid()) {
                    return resolve(false);
                }
                
                resolve(true);
            });
        });
    }
};

export default CognitoAuth; 