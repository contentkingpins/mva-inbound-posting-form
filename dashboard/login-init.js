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

// User sign-in function
function signIn(email, password) {
  const authenticationData = {
    Username: email,
    Password: password
  };
 
  const authenticationDetails = new AuthenticationDetails(authenticationData);
 
  const userData = {
    Username: email,
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
        errorMessage.textContent = error.message || 'Authentication failed. Please check your credentials.';
        errorMessage.style.display = 'block';
      }
    });
  }
}); 