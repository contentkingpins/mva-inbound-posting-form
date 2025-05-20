// Initialize Cognito Authentication
// Import from the global object since we're loading the SDK via script tag
const { CognitoUserPool, CognitoUser, AuthenticationDetails } = AmazonCognitoIdentity;

// Cognito configuration object
const poolData = {
  UserPoolId: 'us-east-1_Lhc964tLD',
  ClientId: '5t6mane4fnvineksoqb4ta0iu1'  // Client ID without secret
};

// Initialize the Cognito User Pool
const userPool = new CognitoUserPool(poolData);

// Find user by email (requires AWS SDK)
function findUserByEmail(email) {
  return new Promise((resolve, reject) => {
    try {
      // Configure AWS SDK
      AWS.config.region = 'us-east-1';
      
      // Create CognitoIdentityServiceProvider
      const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
      
      // Prepare parameters for listUsers API call
      const params = {
        UserPoolId: poolData.UserPoolId,
        Filter: `email = "${email}"`
      };
      
      // Call listUsers API to find user by email
      cognitoIdentityServiceProvider.listUsers(params, (err, data) => {
        if (err) {
          console.error('Error finding user by email:', err);
          reject(err);
          return;
        }
        
        // Check if any users were found
        if (data.Users && data.Users.length > 0) {
          // Return the username of the first matching user
          const user = data.Users[0];
          console.log('Found user by email:', user.Username);
          resolve(user.Username);
        } else {
          // No user found with this email
          console.error('No user found with email:', email);
          reject(new Error('No user found with this email address'));
        }
      });
    } catch (error) {
      console.error('Error in findUserByEmail:', error);
      reject(error);
    }
  });
}

// User sign-in function - modified to look up username by email first
async function signIn(email, password) {
  try {
    // First find the username for this email
    const username = await findUserByEmail(email);
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
          resolve(result);
        },
        onFailure: (err) => {
          reject(err);
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          // Handle new password required challenge
          resolve({
            challengeName: 'NEW_PASSWORD_REQUIRED',
            userAttributes,
            requiredAttributes,
            user: cognitoUser
          });
        }
      });
    });
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
}

// Complete new password challenge
function completeNewPasswordChallenge(user, newPassword) {
  return new Promise((resolve, reject) => {
    user.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: (result) => {
        resolve(result);
      },
      onFailure: (err) => {
        reject(err);
      }
    });
  });
}

// Initialize login functionality
document.addEventListener('DOMContentLoaded', function() {
  // Add the AWS SDK if it's not already included
  if (typeof AWS === 'undefined') {
    const awsScript = document.createElement('script');
    awsScript.src = 'https://cdn.jsdelivr.net/npm/aws-sdk@2.1001.0/dist/aws-sdk.min.js';
    awsScript.async = true;
    awsScript.onload = initializeLoginForm;
    document.head.appendChild(awsScript);
  } else {
    initializeLoginForm();
  }
  
  function initializeLoginForm() {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loginLoader = document.getElementById('login-loader');

    // Check if already logged in
    const redirectIfLoggedIn = () => {
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
          
          // Sign in using Cognito
          const result = await signIn(email, password);
          
          if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
            console.log('New password required');
            loginLoader.style.display = 'none';
            
            // Redirect to password reset page
            sessionStorage.setItem('username', email);
            sessionStorage.setItem('newPasswordRequired', 'true');
            window.location.href = 'reset-password.html';
          } else {
            console.log('Authentication successful');
            
            // Store tokens
            const idToken = result.getIdToken().getJwtToken();
            localStorage.setItem('auth_token', idToken);
            
            // Get user attributes
            const cognitoUser = userPool.getCurrentUser();
            cognitoUser.getUserAttributes((err, attributes) => {
              if (err) {
                console.error('Error getting user attributes:', err);
              } else {
                // Create user object
                const user = { username: email };
                if (attributes) {
                  attributes.forEach(attr => {
                    user[attr.getName()] = attr.getValue();
                  });
                }
                
                // Store user info
                localStorage.setItem('user', JSON.stringify(user));
              }
              
              // Redirect to dashboard
              window.location.href = 'index.html';
            });
          }
        } catch (error) {
          console.error('Authentication failed:', error);
          loginLoader.style.display = 'none';
          
          // Display error message
          if (error.message === 'No user found with this email address') {
            errorMessage.textContent = 'No account found with this email. Please check your email or sign up.';
          } else {
            errorMessage.textContent = error.message || 'Authentication failed. Please check your credentials.';
          }
          errorMessage.style.display = 'block';
        }
      });
    }
  }
}); 