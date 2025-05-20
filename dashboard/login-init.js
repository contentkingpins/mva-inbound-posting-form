// Initialize AWS SDK for Cognito Authentication
import awsconfig from '../aws-exports.js';

document.addEventListener('DOMContentLoaded', function() {
    // Configure AWS SDK
    AWS.config.region = awsconfig.aws_cognito_region || 'us-east-1';
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: awsconfig.aws_cognito_identity_pool_id
    });
    
    // Initialize login functionality
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loginLoader = document.getElementById('login-loader');
    
    // Check if already logged in
    const redirectIfLoggedIn = async () => {
        try {
            const userPool = new AmazonCognitoIdentity.CognitoUserPool({
                UserPoolId: awsconfig.aws_user_pools_id,
                ClientId: awsconfig.aws_user_pools_web_client_id
            });
            
            const cognitoUser = userPool.getCurrentUser();
            if (cognitoUser) {
                cognitoUser.getSession((err, session) => {
                    if (err) {
                        console.error('Error getting session:', err);
                        return;
                    }
                    
                    if (session.isValid()) {
                        console.log('User already logged in, redirecting...');
                        window.location.href = 'index.html';
                    }
                });
            }
        } catch (error) {
            console.error('Error checking login status:', error);
        }
    };
    
    // Call redirect check
    redirectIfLoggedIn();
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            // Clear previous error messages
            errorMessage.style.display = 'none';
            errorMessage.textContent = '';
            
            // Show loader
            loginLoader.style.display = 'inline-block';
            
            try {
                // Get form values
                const email = emailInput.value.trim();
                const password = passwordInput.value;
                
                // Authentication details
                const authenticationData = {
                    Username: email,
                    Password: password
                };
                
                // Authenticate using Cognito user pool
                const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
                
                const userData = {
                    Username: email,
                    Pool: new AmazonCognitoIdentity.CognitoUserPool({
                        UserPoolId: awsconfig.aws_user_pools_id,
                        ClientId: awsconfig.aws_user_pools_web_client_id
                    })
                };
                
                const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
                
                cognitoUser.authenticateUser(authenticationDetails, {
                    onSuccess: function(result) {
                        console.log('Authentication successful');
                        
                        // Store tokens
                        const idToken = result.getIdToken().getJwtToken();
                        localStorage.setItem('auth_token', idToken);
                        
                        // Get user attributes
                        cognitoUser.getUserAttributes(function(err, attributes) {
                            if (err) {
                                console.error('Error getting user attributes:', err);
                            } else {
                                // Create user object
                                const user = { username: email };
                                attributes.forEach(attr => {
                                    user[attr.getName()] = attr.getValue();
                                });
                                
                                // Store user info
                                localStorage.setItem('user', JSON.stringify(user));
                            }
                            
                            // Redirect to dashboard
                            window.location.href = 'index.html';
                        });
                    },
                    onFailure: function(err) {
                        console.error('Authentication failed:', err);
                        loginLoader.style.display = 'none';
                        
                        // Display error message
                        errorMessage.textContent = err.message || 'Authentication failed. Please check your credentials.';
                        errorMessage.style.display = 'block';
                    },
                    newPasswordRequired: function(userAttributes, requiredAttributes) {
                        console.log('New password required');
                        loginLoader.style.display = 'none';
                        
                        // Redirect to password reset page
                        sessionStorage.setItem('username', email);
                        sessionStorage.setItem('newPasswordRequired', 'true');
                        window.location.href = 'reset-password.html';
                    }
                });
            } catch (error) {
                console.error('Error during login:', error);
                loginLoader.style.display = 'none';
                
                // Display error message
                errorMessage.textContent = error.message || 'An error occurred during login. Please try again.';
                errorMessage.style.display = 'block';
            }
        });
    }
}); 