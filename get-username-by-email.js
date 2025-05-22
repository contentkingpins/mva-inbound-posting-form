const AWS = require('aws-sdk');
const cognitoISP = new AWS.CognitoIdentityServiceProvider();

/**
 * Lambda function to lookup a Cognito username by email address
 * This keeps credential and admin privileges on the backend
 */
exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  // Enable CORS for browser requests
  const headers = {
    "Access-Control-Allow-Origin": "*", // Allow any origin for testing
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
        body: JSON.stringify({ error: "Invalid request body" })
      };
    }
    
    if (!email) {
      console.log('Email is missing from request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Email is required" })
      };
    }
    
    console.log('Looking up user with email:', email);
    const params = {
      UserPoolId: process.env.USER_POOL_ID || 'us-east-1_Lhc964tLD',
      Filter: `email = "${email}"`,
      Limit: 1
    };
    
    console.log('Cognito params:', JSON.stringify(params, null, 2));
    const result = await cognitoISP.listUsers(params).promise();
    console.log('Cognito result:', JSON.stringify(result, null, 2));
    
    if (result.Users && result.Users.length > 0) {
      const username = result.Users[0].Username;
      console.log('Found username:', username);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ username })
      };
    } else {
      console.log('User not found');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "User not found" })
      };
    }
  } catch (error) {
    console.error('Error looking up username by email:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        name: error.name
      })
    };
  }
}; 