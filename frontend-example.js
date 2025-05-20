/**
 * Example code for frontend team - Username lookup and authentication
 * 
 * This approach:
 * 1. Uses our new backend endpoint to look up username by email
 * 2. Then uses the username for authentication
 * 3. Keeps admin permissions on the backend, not in the browser
 */

// Import the Cognito Identity SDK (not the full AWS SDK)
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

// Cognito configuration
const poolData = {
  UserPoolId: 'us-east-1_lhc964tLD',
  ClientId: '5t6mane4fnvineksoqb4ta0iu1'  // Our new client ID without secret
};

// Initialize the Cognito User Pool
const userPool = new CognitoUserPool(poolData);

/**
 * Get username by email using our secure backend endpoint
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

/**
 * Sign in with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise} - Authentication result
 */
async function signIn(email, password) {
  try {
    // Step 1: Get the actual username from email
    const username = await getUsernameByEmail(email);
    
    // Step 2: Use the username to authenticate
    const authenticationData = {
      Username: username, // Use the looked-up username, not email
      Password: password
    };
    
    const authenticationDetails = new AuthenticationDetails(authenticationData);
    
    const userData = {
      Username: username, // Use the looked-up username, not email
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
          
          // Store tokens in localStorage or secure storage
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('idToken', tokens.idToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          
          resolve(result);
        },
        onFailure: (err) => {
          console.error('Authentication failed:', err);
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
    console.error('Sign in process failed:', error);
    throw error;
  }
}

/**
 * Complete new password challenge
 * @param {CognitoUser} user - Cognito user object
 * @param {string} newPassword - New password
 * @returns {Promise} - Authentication result
 */
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

/**
 * Example login handler
 */
async function handleLogin(email, password) {
  try {
    document.getElementById('loginStatus').textContent = 'Logging in...';
    
    const result = await signIn(email, password);
    
    if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
      // Show new password form to the user
      document.getElementById('newPasswordForm').style.display = 'block';
      document.getElementById('loginForm').style.display = 'none';
      
      // Store user object for completing the challenge later
      window.cognitoUser = result.user;
    } else {
      // Authentication successful
      document.getElementById('loginStatus').textContent = 'Logged in successfully!';
      
      // Redirect user to dashboard or home page
      window.location.href = '/dashboard.html';
    }
  } catch (error) {
    document.getElementById('loginStatus').textContent = `Login failed: ${error.message}`;
  }
}

/**
 * Example handler for completing new password challenge
 */
async function handleNewPassword(newPassword) {
  try {
    document.getElementById('newPasswordStatus').textContent = 'Setting new password...';
    
    await completeNewPasswordChallenge(window.cognitoUser, newPassword);
    
    document.getElementById('newPasswordStatus').textContent = 'Password updated successfully!';
    
    // Redirect user to dashboard or home page
    window.location.href = '/dashboard.html';
  } catch (error) {
    document.getElementById('newPasswordStatus').textContent = `Failed to set new password: ${error.message}`;
  }
}

// For testing in browser console
window.getUsernameByEmail = getUsernameByEmail;
window.signIn = signIn;
window.completeNewPasswordChallenge = completeNewPasswordChallenge;
window.handleLogin = handleLogin;
window.handleNewPassword = handleNewPassword; 