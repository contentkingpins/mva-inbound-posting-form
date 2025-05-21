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