// Get Cognito JWT Token for Testing
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });

const cognito = new AWS.CognitoIdentityServiceProvider();

async function getCognitoToken() {
  const params = {
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    UserPoolId: 'us-east-1_lhc964tLD',
    ClientId: '5t6mane4fnvineksoqb4ta0iu1',
    AuthParameters: {
      USERNAME: 'test@admin.com', // Replace with actual test user
      PASSWORD: 'TestPassword123!' // Replace with actual password
    }
  };

  try {
    console.log('🔑 Attempting Cognito authentication...');
    const result = await cognito.adminInitiateAuth(params).promise();
    
    if (result.AuthenticationResult && result.AuthenticationResult.AccessToken) {
      const token = result.AuthenticationResult.AccessToken;
      console.log('✅ Cognito authentication successful!');
      console.log('==========================================');
      console.log('Access Token:', token);
      console.log('==========================================');
      console.log('💡 Use this token in your tests');
      return token;
    } else {
      console.log('❌ Authentication failed - no token returned');
    }
  } catch (error) {
    console.log('❌ Cognito authentication failed:', error.message);
    console.log('💡 You may need to:');
    console.log('   - Create a test user in Cognito');
    console.log('   - Set a temporary password');
    console.log('   - Update the username/password in this script');
  }
}

getCognitoToken(); 