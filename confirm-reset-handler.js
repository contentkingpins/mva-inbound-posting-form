const AWS = require('aws-sdk');
const cognitoISP = new AWS.CognitoIdentityServiceProvider();

/**
 * Lambda function to confirm a password reset
 * This endpoint completes the reset password flow in Cognito
 */
exports.handler = async (event) => {
  console.log('Password reset confirmation request received:', JSON.stringify(event, null, 2));
  
  // Enable CORS for browser requests
  const headers = {
    "Access-Control-Allow-Origin": "https://main.d21xta9fg9b6w.amplifyapp.com",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Content-Type": "application/json"
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    console.log('Processing request body');
    let username, code, password;
    
    try {
      const body = JSON.parse(event.body || '{}');
      username = body.username;
      code = body.code;
      password = body.password;
      console.log('Parsed username:', username);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Invalid request body" })
      };
    }
    
    if (!username || !code || !password) {
      console.log('Missing required fields');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Username, code, and password are all required" })
      };
    }
    
    // Confirm password reset
    const confirmResetParams = {
      ClientId: '5t6mane4fnvineksoqb4ta0iu1', // Client ID from your Cognito User Pool
      Username: username,
      ConfirmationCode: code,
      Password: password
    };
    
    await cognitoISP.confirmForgotPassword(confirmResetParams).promise();
    console.log('Password reset confirmed for user:', username);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: "Password reset successful"
      })
    };
    
  } catch (error) {
    console.error('Error in confirming password reset:', error);
    
    // Specific error handling
    if (error.code === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "User not found" })
      };
    } else if (error.code === 'ExpiredCodeException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Verification code has expired. Please request a new code." })
      };
    } else if (error.code === 'CodeMismatchException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Invalid verification code. Please check and try again." })
      };
    } else if (error.code === 'InvalidPasswordException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Password does not meet requirements. It must include uppercase, lowercase, numbers, and special characters." })
      };
    } else if (error.code === 'LimitExceededException') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ message: "Too many attempts. Please try again later." })
      };
    }
    
    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: "Failed to reset password",
        error: error.message
      })
    };
  }
};

/**
 * Confirm Password Reset Implementation using Backend API
 * This handles the confirmation step of the password reset flow
 */

// Initialize confirm reset functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeConfirmResetForm();
    populateEmailFromURL();
});

function initializeConfirmResetForm() {
    const confirmResetForm = document.getElementById('confirm-reset-form');
    const emailInput = document.getElementById('email');
    const codeInput = document.getElementById('verification-code');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const submitButton = document.getElementById('submit-btn');
    const loader = document.getElementById('loader');

    if (confirmResetForm) {
        confirmResetForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            // Clear previous messages
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            errorMessage.textContent = '';
            successMessage.textContent = '';
            
            // Show loader and disable button
            loader.style.display = 'inline-block';
            submitButton.disabled = true;
            
            try {
                // Get form values
                const email = emailInput.value.trim();
                const code = codeInput.value.trim();
                const newPassword = newPasswordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                
                // Validate inputs
                validateInputs(email, code, newPassword, confirmPassword);
                
                // Get username for this email
                const username = await getUsernameByEmail(email);
                
                // Confirm password reset
                await confirmPasswordReset(username, code, newPassword);
                
                // Show success message
                successMessage.textContent = 'Password reset successful! You can now log in with your new password.';
                successMessage.style.display = 'block';
                
                // Redirect to login after delay
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
                
            } catch (error) {
                console.error('Confirm reset error:', error);
                errorMessage.textContent = error.message || 'An error occurred. Please try again.';
                errorMessage.style.display = 'block';
            } finally {
                // Hide loader and re-enable button
                loader.style.display = 'none';
                submitButton.disabled = false;
            }
        });
    }
}

function populateEmailFromURL() {
    // Get email from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    
    if (email) {
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = email;
            emailInput.readOnly = true; // Make it read-only since it came from forgot password flow
        }
    }
}

function validateInputs(email, code, newPassword, confirmPassword) {
    if (!email) {
        throw new Error('Email address is required');
    }
    
    if (!code) {
        throw new Error('Verification code is required');
    }
    
    if (!newPassword) {
        throw new Error('New password is required');
    }
    
    if (!confirmPassword) {
        throw new Error('Please confirm your new password');
    }
    
    if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
    }
    
    // Validate password strength
    validatePasswordStrength(newPassword);
}

function validatePasswordStrength(password) {
    // Password requirements (should match your Cognito settings)
    const minLength = 8;
    const requireNumbers = true;
    const requireSpecialChars = true;
    const requireUppercase = true;
    const requireLowercase = true;
    
    let errors = [];
    
    if (password.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters long`);
    }
    
    if (requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    if (requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (errors.length > 0) {
        throw new Error(errors.join('. '));
    }
}

/**
 * Get username by email using backend API endpoint
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
            throw new Error('No account found with this email address');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error looking up account');
    }

    const data = await response.json();
    return data.username;
}

/**
 * Confirm password reset using backend API endpoint
 */
async function confirmPasswordReset(username, confirmationCode, newPassword) {
    const response = await fetch('https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/auth/confirm', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            confirmationCode,
            newPassword
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error cases
        if (response.status === 400) {
            throw new Error(errorData.error || 'Invalid verification code or password');
        } else if (response.status === 404) {
            throw new Error('User not found');
        } else {
            throw new Error(errorData.error || 'Failed to reset password');
        }
    }

    return await response.json();
} 