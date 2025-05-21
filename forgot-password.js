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