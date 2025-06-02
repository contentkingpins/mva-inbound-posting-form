const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

async function getFreshToken() {
  const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });
  
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: '5t6mane4fnvineksoqb4ta0iu1',
    AuthParameters: {
      USERNAME: 'testadmin',
      PASSWORD: 'TestPassword123!'
    }
  });

  try {
    const response = await client.send(command);
    console.log('Fresh Access Token:');
    console.log(response.AuthenticationResult.AccessToken);
    return response.AuthenticationResult.AccessToken;
  } catch (error) {
    console.error('Error getting token:', error.message);
    throw error;
  }
}

getFreshToken().catch(console.error); 