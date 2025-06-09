// Import AWS SDK v3 modules
const { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } = require("@aws-sdk/client-cognito-identity-provider");

// Initialize the client
const client = new CognitoIdentityProviderClient();

// Define CORS headers upfront to ensure consistency
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://main.d21xta9fg9b6w.amplifyapp.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Content-Type": "application/json"
};

/**
 * Lambda function to handle confirmation of password reset requests
 */
exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  
  // Wrap all logic in try/catch to ensure CORS headers are always returned
  try {
    console.log('Processing request body');
    let username, confirmationCode, newPassword;
    
    try {
      const body = JSON.parse(event.body || '{}');
      username = body.username;
      confirmationCode = body.code;
      newPassword = body.password;
      console.log('Parsed username:', username);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid request body" })
      };
    }
    
    if (!username || !confirmationCode || !newPassword) {
      console.log('Required fields missing from request');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Username, confirmation code, and new password are required" })
      };
    }
    
    // Confirm forgot password
    console.log('Confirming password reset for user:', username);
    const params = {
      ClientId: process.env.COGNITO_CLIENT_ID || '5t6mane4fnvineksoqb4ta0iu1', // Fixed to match main client ID
      Username: username,
      ConfirmationCode: confirmationCode,
      Password: newPassword
    };
    
    console.log('Cognito params:', JSON.stringify({...params, Password: '***REDACTED***'}, null, 2));
    
    // Use SDK v3 command pattern
    const command = new ConfirmForgotPasswordCommand(params);
    const result = await client.send(command);
    
    console.log('Cognito result:', JSON.stringify(result, null, 2));
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: "Password has been reset successfully. You can now log in with your new password." 
      })
    };
  } catch (error) {
    console.error('Error confirming password reset:', error);
    
    // Handle different types of errors
    if (error.code === 'CodeMismatchException') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid verification code provided" })
      };
    }
    
    if (error.code === 'ExpiredCodeException') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Verification code has expired. Please request a new code." })
      };
    }
    
    if (error.code === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "User not found" })
      };
    }
    
    if (error.code === 'LimitExceededException') {
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Too many requests. Please try again later." })
      };
    }
    
    if (error.code === 'InvalidPasswordException') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Password does not meet complexity requirements" })
      };
    }
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error.message,
        code: error.code,
        name: error.name
      })
    };
  }
}; 