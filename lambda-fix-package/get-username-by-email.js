// Import AWS SDK v3 modules
const { CognitoIdentityProviderClient, ListUsersCommand } = require("@aws-sdk/client-cognito-identity-provider");

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
 * Lambda function to lookup a Cognito username by email address
 * This keeps credential and admin privileges on the backend
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
    let email;
    
    try {
      const body = JSON.parse(event.body || '{}');
      email = body.email;
      console.log('Parsed email:', email);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid request body" })
      };
    }
    
    if (!email) {
      console.log('Email is missing from request');
      return {
        statusCode: 400,
        headers: corsHeaders,
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
    
    // Use SDK v3 command pattern
    const command = new ListUsersCommand(params);
    const result = await client.send(command);
    
    console.log('Cognito result:', JSON.stringify(result, null, 2));
    
    if (result.Users && result.Users.length > 0) {
      const username = result.Users[0].Username;
      console.log('Found username:', username);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ username })
      };
    } else {
      console.log('User not found');
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "User not found" })
      };
    }
  } catch (error) {
    console.error('Error looking up username by email:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        name: error.name
      })
    };
  }
}; 