const AWS = require('aws-sdk');
const cognitoISP = new AWS.CognitoIdentityServiceProvider();

/**
 * Lambda function to handle password reset requests for Cognito users
 */
exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
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
    let username;
    
    try {
      const body = JSON.parse(event.body || '{}');
      username = body.username;
      console.log('Parsed username:', username);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid request body" })
      };
    }
    
    if (!username) {
      console.log('Username is missing from request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Username is required" })
      };
    }
    
    // Initiate forgot password flow
    console.log('Initiating forgot password for user:', username);
    const params = {
      ClientId: process.env.COGNITO_CLIENT_ID || '4ue5rgkh0j9fdnl56sthcmsv3i', // You may need to set this in environment variables
      Username: username
    };
    
    console.log('Cognito params:', JSON.stringify(params, null, 2));
    
    const result = await cognitoISP.forgotPassword(params).promise();
    console.log('Cognito result:', JSON.stringify(result, null, 2));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: "Password reset initiated. Check your email for the verification code." 
      })
    };
  } catch (error) {
    console.error('Error initiating password reset:', error);
    
    // Handle different types of errors
    if (error.code === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "User not found" })
      };
    }
    
    if (error.code === 'LimitExceededException') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: "Too many requests. Please try again later." })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        code: error.code,
        name: error.name
      })
    };
  }
};

/**
 * Forgot Password Implementation using Backend API
 * This uses the new backend endpoints for password reset functionality
 */

// Initialize forgot password functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeForgotPasswordForm();
});

function initializeForgotPasswordForm() {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('email');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const submitButton = document.getElementById('submit-btn');
    const loader = document.getElementById('loader');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(event) {
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
                // Get email value
                const email = emailInput.value.trim();
                
                if (!email) {
                    throw new Error('Please enter your email address');
                }
                
                // First, get the username for this email
                const username = await getUsernameByEmail(email);
                
                // Then initiate forgot password flow
                await initiateForgotPassword(username);
                
                // Show success message
                successMessage.textContent = 'Password reset code sent to your email. Please check your inbox.';
                successMessage.style.display = 'block';
                
                // Optionally redirect to confirm page after delay
                setTimeout(() => {
                    window.location.href = `reset-password.html?email=${encodeURIComponent(email)}`;
                }, 3000);
                
            } catch (error) {
                console.error('Forgot password error:', error);
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
 * Initiate forgot password using backend API endpoint
 */
async function initiateForgotPassword(username) {
    const response = await fetch('https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/auth/forgot-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send password reset code');
    }

    return await response.json();
} 