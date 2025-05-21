const AWS = require('aws-sdk');
const cognitoISP = new AWS.CognitoIdentityServiceProvider();

/**
 * Lambda function to handle forgot password requests
 * This endpoint initiates the reset password flow in Cognito
 */
exports.handler = async (event) => {
  console.log('Forgot password request received:', JSON.stringify(event, null, 2));
  
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
    let email;
    
    try {
      const body = JSON.parse(event.body || '{}');
      email = body.email;
      console.log('Parsed email:', email);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Invalid request body" })
      };
    }
    
    if (!email) {
      console.log('Email is missing from request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Email is required" })
      };
    }
    
    // Find the username for this email
    console.log('Looking up user with email:', email);
    const userParams = {
      UserPoolId: process.env.USER_POOL_ID || 'us-east-1_lhc964tLD',
      Filter: `email = "${email}"`,
      Limit: 1
    };
    
    const userResult = await cognitoISP.listUsers(userParams).promise();
    console.log('Cognito listUsers result:', JSON.stringify(userResult, null, 2));
    
    if (!userResult.Users || userResult.Users.length === 0) {
      console.log('User not found');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "No account found with this email" })
      };
    }
    
    const username = userResult.Users[0].Username;
    console.log('Found username:', username);
    
    // Initiate forgot password flow
    const forgotPasswordParams = {
      ClientId: '5t6mane4fnvineksoqb4ta0iu1', // Client ID from your Cognito User Pool
      Username: username
    };
    
    const forgotPasswordResult = await cognitoISP.forgotPassword(forgotPasswordParams).promise();
    console.log('Forgot password initiated:', JSON.stringify(forgotPasswordResult, null, 2));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: "Password reset code has been sent to your email",
        delivery: forgotPasswordResult.CodeDeliveryDetails
      })
    };
    
  } catch (error) {
    console.error('Error in forgot password flow:', error);
    
    // Specific error handling
    if (error.code === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "No account found with this email" })
      };
    } else if (error.code === 'LimitExceededException') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ message: "Too many requests. Please try again later" })
      };
    }
    
    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: "Failed to initiate password reset",
        error: error.message
      })
    };
  }
}; 