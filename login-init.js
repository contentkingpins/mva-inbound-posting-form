// Login page initialization
console.log('Login page loading...');

// Initialize Cognito Authentication
// Import from the global object since we're loading the SDK via script tag
const { CognitoUserPool, CognitoUser, AuthenticationDetails } = AmazonCognitoIdentity;

// Cognito configuration object
const poolData = {
  UserPoolId: 'us-east-1_lhc964tLD',  // Fixed case: lowercase 'l'
  ClientId: '5t6mane4fnvineksoqb4ta0iu1'  // Reverted to original working Client ID
};

// Initialize the Cognito User Pool
const userPool = new CognitoUserPool(poolData);

/**
 * Get username by email using backend API endpoint
 * This is more secure than using AWS SDK directly from the browser
 * @param {string} email - User's email address
 * @returns {Promise<string>} - User's Cognito username
 */
async function getUsernameByEmail(email) {
              const response = await fetch('https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/auth/get-username', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('User with this email does not exist');
    }
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error looking up username');
  }

  const data = await response.json();
  return data.username;
}

// User sign-in function - modified to look up username by email first
async function signIn(email, password) {
  try {
    // First find the username for this email using backend API
    const username = await getUsernameByEmail(email);
    console.log('Found username for login:', username);
    
    // Proceed with authentication using the found username
    const authenticationData = {
      Username: username, // Use the found username instead of email
      Password: password
    };
   
    const authenticationDetails = new AuthenticationDetails(authenticationData);
   
    const userData = {
      Username: username, // Use the found username instead of email
      Pool: userPool
    };
   
    const cognitoUser = new CognitoUser(userData);
   
    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          // Successfully authenticated
          const tokens = {
            accessToken: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
            refreshToken: result.getRefreshToken().getToken()
          };
          
          // Store tokens in localStorage as expected by backend
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('idToken', tokens.idToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          
          // For backward compatibility with our code
          localStorage.setItem('auth_token', tokens.idToken);
          
          resolve(result);
        },
        onFailure: (err) => {
          console.error('Authentication failed:', err);
          
          // Special handling for common Cognito errors
          if (err.code === 'UserNotConfirmedException') {
            // User hasn't verified their email yet
            err.userNotConfirmed = true;
          }
          
          reject(err);
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          // Handle new password required challenge
          console.log('User needs to set a new password');
          
          // Store user data in sessionStorage (never store in localStorage for security)
          sessionStorage.setItem('cognitoUser', username);
          sessionStorage.setItem('userEmail', email);
          sessionStorage.setItem('userAttributes', JSON.stringify(userAttributes));
          
          // Resolve with challenge info and cognitoUser for later use
          resolve({
            challengeName: 'NEW_PASSWORD_REQUIRED',
            userAttributes,
            requiredAttributes,
            cognitoUser // Include the cognitoUser object for later use
          });
        }
      });
    });
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
}

/**
 * Validate password against Cognito requirements
 */
function validatePassword(password) {
  // Password requirements (adjust based on your Cognito settings)
  const minLength = 8;
  const requireNumbers = true;
  const requireSpecialChars = true;
  const requireUppercase = true;
  const requireLowercase = true;
  
  let errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long.`);
  }
  
  if (requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }
  
  if (requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character.');
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Complete the new password challenge
 */
async function completePasswordReset() {
  const messageElement = document.getElementById('password-reset-error');
  const successElement = document.getElementById('password-reset-success');
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const passwordResetLoader = document.getElementById('password-reset-loader');
  
  // Show loader
  passwordResetLoader.style.display = 'inline-block';
  
  // Clear messages
  messageElement.style.display = 'none';
  messageElement.textContent = '';
  successElement.style.display = 'none';
  
  // Validate passwords match
  if (newPassword !== confirmPassword) {
    messageElement.textContent = 'Passwords do not match.';
    messageElement.style.display = 'block';
    passwordResetLoader.style.display = 'none';
    return;
  }
  
  // Validate password strength
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    messageElement.textContent = validation.errors.join(' ');
    messageElement.style.display = 'block';
    passwordResetLoader.style.display = 'none';
    return;
  }
  
  try {
    // Get stored user data
    const username = sessionStorage.getItem('cognitoUser');
    const email = sessionStorage.getItem('userEmail');
    const userAttributes = JSON.parse(sessionStorage.getItem('userAttributes') || '{}');
    
    if (!username) {
      throw new Error('User session data is missing.');
    }
    
    // Create Cognito user object
    const userData = {
      Username: username,
      Pool: userPool
    };
    const cognitoUser = new CognitoUser(userData);
    
    // Complete the new password challenge
    return new Promise((resolve, reject) => {
      cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, {
        onSuccess: (result) => {
          console.log('Password changed successfully');
          
          // Store tokens in localStorage
          const tokens = {
            accessToken: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
            refreshToken: result.getRefreshToken().getToken()
          };
          
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('idToken', tokens.idToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          localStorage.setItem('auth_token', tokens.idToken); // For compatibility
          
          // Create user object with email first
          const user = { email: email };
          
          // Get user attributes after password reset
          cognitoUser.getUserAttributes((err, attributes) => {
            if (err) {
              console.error('Error getting user attributes:', err);
              // Try to get user info from the ID token
              try {
                const idToken = result.getIdToken();
                const payload = idToken.decodePayload();
                console.log('ID Token payload:', payload);
                
                // Extract user info from token
                if (payload.email) user.email = payload.email;
                if (payload['custom:role']) user['custom:role'] = payload['custom:role'];
                if (payload.name) user.name = payload.name;
                
                localStorage.setItem('user', JSON.stringify(user));
              } catch (tokenError) {
                console.error('Error parsing ID token:', tokenError);
                // Save basic user info anyway
                localStorage.setItem('user', JSON.stringify(user));
              }
            } else if (attributes) {
              attributes.forEach(attr => {
                const name = attr.getName();
                const value = attr.getValue();
                console.log(`User attribute: ${name} = ${value}`);
                user[name] = value;
              });
              
              // Store user info
              localStorage.setItem('user', JSON.stringify(user));
            }
            
            // Clear session storage
            sessionStorage.removeItem('cognitoUser');
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('userAttributes');
            
            // Show success message
            successElement.textContent = 'Password changed successfully! Redirecting to dashboard...';
            successElement.style.display = 'block';
            messageElement.style.display = 'none';
            passwordResetLoader.style.display = 'none';
            
            // Redirect after a delay based on role
            setTimeout(() => {
              const userData = JSON.parse(localStorage.getItem('user') || '{}');
              const userRole = userData['custom:role'] || userData.role || 'agent'; // Default to agent if no role
              
              // Route users based on their actual role
              if (userRole === 'admin') {
                window.location.href = 'admin.html';
              } else if (userRole === 'vendor') {
                window.location.href = 'vendor-dashboard.html';
              } else {
                window.location.href = 'agent-aurora.html';
              }
            }, 2000);
            
            resolve(result);
          });
        },
        onFailure: (err) => {
          console.error('Failed to change password:', err);
          
          // Show error message
          messageElement.textContent = err.message || 'Failed to change password. Please try again.';
          messageElement.style.display = 'block';
          passwordResetLoader.style.display = 'none';
          
          reject(err);
        }
      });
    });
  } catch (error) {
    console.error('Error in password reset:', error);
    
    // Show error message
    messageElement.textContent = error.message || 'An error occurred. Please try again.';
    messageElement.style.display = 'block';
    passwordResetLoader.style.display = 'none';
    
    throw error;
  }
}

/**
 * Cancel the password reset
 */
function cancelPasswordReset() {
  // Clear session storage
  sessionStorage.removeItem('cognitoUser');
  sessionStorage.removeItem('userEmail');
  sessionStorage.removeItem('userAttributes');
  
  // Show login form
  document.getElementById('passwordResetForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
}

// Initialize login functionality
document.addEventListener('DOMContentLoaded', function() {
  // No longer need AWS SDK since we're using the backend API endpoint
  initializeLoginForm();
  
  function initializeLoginForm() {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const loginLoader = document.getElementById('login-loader');

    // Check if already logged in
    const redirectIfLoggedIn = () => {
      // First check if we have the required localStorage data
      const authToken = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user');
      
      // If localStorage is missing required data, don't redirect
      if (!authToken || !userStr) {
        console.log('Missing required localStorage data, not redirecting');
        return;
      }
      
      // Verify user object has email
      try {
        const user = JSON.parse(userStr);
        if (!user.email) {
          console.log('User object missing email, not redirecting');
          return;
        }
      } catch (e) {
        console.log('Invalid user data in localStorage, not redirecting');
        return;
      }
      
      // Now check if Cognito session is also valid
      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.getSession((err, session) => {
          if (err) {
            console.error('Error getting session:', err);
            return;
          }
          
          if (session && session.isValid()) {
            console.log('User already logged in with valid data, redirecting...');
            // Check user role and redirect appropriately
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = userData['custom:role'] || userData.role || 'agent'; // Default to agent if no role
            
            if (userRole === 'admin') {
              window.location.href = 'admin.html';
            } else {
              window.location.href = 'agent-aurora.html';
            }
          }
        });
      }
    };
    
    // Call redirect check
    redirectIfLoggedIn();
    
    // Add verification resend UI if needed
    function showResendVerificationUI(email) {
      // Create resend verification link if it doesn't exist
      if (!document.getElementById('resend-verification')) {
        const resendLink = document.createElement('a');
        resendLink.id = 'resend-verification';
        resendLink.href = '#';
        resendLink.textContent = 'Resend verification email';
        resendLink.style.display = 'block';
        resendLink.style.marginTop = '10px';
        resendLink.style.textAlign = 'center';
        resendLink.style.color = 'var(--primary-light)';
        
        // Insert after error message
        errorMessage.parentNode.insertBefore(resendLink, errorMessage.nextSibling);
        
        // Add click event
        resendLink.addEventListener('click', async (e) => {
          e.preventDefault();
          
          try {
            // Get the username for this email
            const username = await getUsernameByEmail(email);
            
            // Create Cognito user
            const userData = {
              Username: username,
              Pool: userPool
            };
            const cognitoUser = new CognitoUser(userData);
            
            // Resend verification
            cognitoUser.resendConfirmationCode((err, result) => {
              if (err) {
                console.error('Error resending verification:', err);
                errorMessage.textContent = 'Failed to resend verification email. Please try again.';
                errorMessage.style.display = 'block';
                return;
              }
              
              // Show success message
              errorMessage.style.display = 'none';
              successMessage.textContent = 'Verification email sent! Please check your inbox.';
              successMessage.style.display = 'block';
            });
          } catch (error) {
            console.error('Error finding user for verification:', error);
            errorMessage.textContent = 'Unable to resend verification email. Please contact support.';
            errorMessage.style.display = 'block';
          }
        });
      }
    }
    
    // Add password reset handlers
    document.getElementById('submitNewPassword').addEventListener('click', completePasswordReset);
    document.getElementById('cancelPasswordReset').addEventListener('click', cancelPasswordReset);

    // Handle login form submission
    if (loginForm) {
      loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Clear previous error/success messages
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        successMessage.style.display = 'none';
        
        // Show loader
        loginLoader.style.display = 'inline-block';
        
        try {
          // Get form values
          const email = emailInput.value.trim();
          const password = passwordInput.value;
          
          // Sign in using Cognito
          const result = await signIn(email, password);
          
          if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
            console.log('New password required');
            loginLoader.style.display = 'none';
            
            // Show password reset form, hide login form
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('passwordResetForm').style.display = 'block';
          } else {
            console.log('Authentication successful');
            
            // Get user attributes
            const cognitoUser = userPool.getCurrentUser();
            await new Promise((resolve, reject) => {
              cognitoUser.getUserAttributes((err, attributes) => {
                if (err) {
                  console.error('Error getting user attributes:', err);
                  // Even if we can't get attributes, save basic user info with default role
                  const user = { 
                    email: email,
                    role: 'agent' // Default role
                  };
                  localStorage.setItem('user', JSON.stringify(user));
                  resolve();
                } else {
                  // Create user object with default role
                  const user = { 
                    email: email,
                    role: 'agent' // Default role
                  };
                  
                  // Add all Cognito attributes
                  if (attributes) {
                    attributes.forEach(attr => {
                      const name = attr.getName();
                      const value = attr.getValue();
                      
                      // Handle custom attributes
                      if (name === 'custom:role') {
                        user.role = value;
                      } else {
                        user[name] = value;
                      }
                    });
                  }
                  
                  // Store complete user info
                  console.log('Storing user data:', user);
                  localStorage.setItem('user', JSON.stringify(user));
                  resolve();
                }
                
                // Check user role and redirect appropriately
                console.log('User data saved, redirecting based on role...');
                const userData = JSON.parse(localStorage.getItem('user'));
                const userRole = userData.role || 'agent';
                
                if (userRole === 'admin') {
                  window.location.href = 'admin.html';
                } else {
                  window.location.href = 'agent-aurora.html';
                }
              });
            });
          }
        } catch (error) {
          console.error('Authentication failed:', error);
          loginLoader.style.display = 'none';
          
          // Display appropriate error message
          if (error.code === 'UserNotConfirmedException' || error.userNotConfirmed) {
            errorMessage.textContent = 'Your account needs verification. Click here to verify.';
            errorMessage.style.cursor = 'pointer';
            errorMessage.onclick = function() {
              window.location.href = `verify.html?email=${encodeURIComponent(emailInput.value.trim())}`;
            };
          } else if (error.message === 'User with this email does not exist') {
            errorMessage.textContent = 'No account found with this email. Please check your email or sign up.';
          } else if (error.code === 'NotAuthorizedException') {
            errorMessage.textContent = 'Incorrect username or password.';
          } else {
            errorMessage.textContent = error.message || 'Authentication failed. Please check your credentials.';
          }
          errorMessage.style.display = 'block';
        }
      });
    }
  }
  
  // Export functions for global access if needed
  window.getUsernameByEmail = getUsernameByEmail;
  window.signIn = signIn;
  window.completePasswordReset = completePasswordReset;
}); 