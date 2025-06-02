// Simple Cognito Authentication
const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

async function getSimpleCognitoToken() {
  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: '5t6mane4fnvineksoqb4ta0iu1',
    AuthParameters: {
      USERNAME: 'testadmin',
      PASSWORD: 'TestPassword123!'
    }
  };

  try {
    console.log('🔑 Attempting simple Cognito authentication...');
    const result = await cognito.initiateAuth(params).promise();
    
    if (result.AuthenticationResult && result.AuthenticationResult.AccessToken) {
      const token = result.AuthenticationResult.AccessToken;
      console.log('✅ Cognito authentication successful!');
      console.log('==========================================');
      console.log('Access Token:');
      console.log(token);
      console.log('==========================================');
      console.log('💡 Copy this token to use in tests');
      return token;
    } else {
      console.log('❌ Authentication failed - no token returned');
      console.log('Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('❌ Simple auth failed:', error.message);
    if (error.code === 'NotAuthorizedException') {
      console.log('💡 Check username/password combination');
    } else if (error.code === 'UserNotConfirmedException') {
      console.log('💡 User needs to be confirmed');
    }
  }
}

getSimpleCognitoToken(); 