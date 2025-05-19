const AWS = require('aws-sdk');
const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  UpdateCommand 
} = require('@aws-sdk/lib-dynamodb');

// Initialize Cognito Identity Service Provider client
const cognitoISP = new AWS.CognitoIdentityServiceProvider();

// Initialize DynamoDB client
const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

// Environment variables for Cognito and DynamoDB
const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const USERS_TABLE = process.env.USERS_TABLE;

/**
 * Register a new user in Cognito
 * @param {Object} userData - User data including email, password, and attributes
 * @returns {Promise} - Cognito signup result
 */
async function signUp(userData) {
  const { email, password, firstName, lastName, role } = userData;
  
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      {
        Name: 'email',
        Value: email
      },
      {
        Name: 'given_name',
        Value: firstName
      },
      {
        Name: 'family_name',
        Value: lastName
      },
      {
        Name: 'custom:role',
        Value: role || 'user' // Default role if not provided
      }
    ]
  };
  
  try {
    // Register the user in Cognito
    const result = await cognitoISP.signUp(params).promise();
    
    // Also create an entry in the Users table for extended profile data
    await createUserProfile({
      user_id: result.UserSub,
      email,
      firstName,
      lastName,
      role: role || 'user',
      created_at: new Date().toISOString()
    });
    
    return {
      success: true,
      message: 'User registered successfully',
      data: {
        userSub: result.UserSub,
        userConfirmed: result.UserConfirmed
      }
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Create user profile in DynamoDB
 * @param {Object} profileData - User profile data
 * @returns {Promise}
 */
async function createUserProfile(profileData) {
  try {
    await dynamoDB.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: profileData
      })
    );
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile in DynamoDB:', error);
    throw error;
  }
}

/**
 * Update user profile in DynamoDB
 * @param {string} userId - User ID
 * @param {Object} profileData - Updated profile data
 * @returns {Promise}
 */
async function updateUserProfile(userId, profileData) {
  // Remove any fields that shouldn't be directly updated
  const { user_id, email, created_at, ...updatableData } = profileData;
  
  // Build expression attributes
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  const updateExpressions = [];
  
  Object.entries(updatableData).forEach(([key, value]) => {
    const attributeName = `#${key}`;
    const attributeValue = `:${key}`;
    
    expressionAttributeNames[attributeName] = key;
    expressionAttributeValues[attributeValue] = value;
    updateExpressions.push(`${attributeName} = ${attributeValue}`);
  });
  
  // If no updateable data, return early
  if (updateExpressions.length === 0) {
    return { success: true, message: 'No fields to update' };
  }
  
  const params = {
    TableName: USERS_TABLE,
    Key: { user_id: userId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };
  
  try {
    const result = await dynamoDB.send(new UpdateCommand(params));
    return { 
      success: true, 
      message: 'Profile updated successfully',
      profile: result.Attributes
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Get user profile from DynamoDB
 * @param {string} userId - User ID
 * @returns {Promise} - User profile data
 */
async function getUserProfile(userId) {
  try {
    const result = await dynamoDB.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { user_id: userId }
      })
    );
    
    if (!result.Item) {
      return {
        success: false,
        message: 'User profile not found'
      };
    }
    
    return {
      success: true,
      profile: result.Item
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Find user profile by email
 * @param {string} email - User email
 * @returns {Promise} - User profile data
 */
async function findUserByEmail(email) {
  try {
    const result = await dynamoDB.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email
        }
      })
    );
    
    if (!result.Items || result.Items.length === 0) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    
    return {
      success: true,
      profile: result.Items[0]
    };
  } catch (error) {
    console.error('Error finding user by email:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Confirm user registration with verification code
 * @param {string} email - User email
 * @param {string} code - Verification code
 * @returns {Promise} - Confirmation result
 */
async function confirmSignUp(email, code) {
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code
  };
  
  try {
    await cognitoISP.confirmSignUp(params).promise();
    return {
      success: true,
      message: 'User confirmed successfully'
    };
  } catch (error) {
    console.error('Error confirming user:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Authenticate user and get tokens
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Authentication result with tokens or challenge
 */
async function signIn(email, password) {
  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  };
  
  try {
    const result = await cognitoISP.initiateAuth(params).promise();
    
    // Check if there's a challenge to complete
    if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      // User needs to set a new password
      return {
        success: true,
        challengeName: result.ChallengeName,
        challengeParameters: result.ChallengeParameters,
        session: result.Session,
        message: 'Password change required'
      };
    }
    
    // Get user profile from DynamoDB
    const userResult = await findUserByEmail(email);
    let profile = null;
    
    if (userResult.success) {
      profile = userResult.profile;
    }
    
    return {
      success: true,
      message: 'User authenticated successfully',
      tokens: {
        idToken: result.AuthenticationResult.IdToken,
        accessToken: result.AuthenticationResult.AccessToken,
        refreshToken: result.AuthenticationResult.RefreshToken,
        expiresIn: result.AuthenticationResult.ExpiresIn
      },
      profile
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Complete the NEW_PASSWORD_REQUIRED challenge
 * @param {string} email - User's email
 * @param {string} newPassword - New password to set
 * @param {string} session - Session from the challenge
 * @returns {Promise} - Auth result with tokens
 */
async function completeNewPasswordChallenge(email, newPassword, session) {
  const params = {
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    ClientId: CLIENT_ID,
    ChallengeResponses: {
      USERNAME: email,
      NEW_PASSWORD: newPassword
    },
    Session: session
  };
  
  try {
    const result = await cognitoISP.respondToAuthChallenge(params).promise();
    
    // Get user profile from DynamoDB
    const userResult = await findUserByEmail(email);
    let profile = null;
    
    if (userResult.success) {
      profile = userResult.profile;
    }
    
    return {
      success: true,
      message: 'Password changed successfully and user authenticated',
      tokens: {
        idToken: result.AuthenticationResult.IdToken,
        accessToken: result.AuthenticationResult.AccessToken,
        refreshToken: result.AuthenticationResult.RefreshToken,
        expiresIn: result.AuthenticationResult.ExpiresIn
      },
      profile
    };
  } catch (error) {
    console.error('Error completing new password challenge:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Refresh authentication tokens
 * @param {string} refreshToken - Refresh token
 * @returns {Promise} - New tokens
 */
async function refreshTokens(refreshToken) {
  const params = {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken
    }
  };
  
  try {
    const result = await cognitoISP.initiateAuth(params).promise();
    return {
      success: true,
      message: 'Tokens refreshed successfully',
      tokens: {
        idToken: result.AuthenticationResult.IdToken,
        accessToken: result.AuthenticationResult.AccessToken,
        expiresIn: result.AuthenticationResult.ExpiresIn
      }
    };
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Get user attributes from Cognito
 * @param {string} accessToken - User's access token
 * @returns {Promise} - User attributes
 */
async function getUserAttributes(accessToken) {
  const params = {
    AccessToken: accessToken
  };
  
  try {
    const result = await cognitoISP.getUser(params).promise();
    
    // Transform attributes array to a more usable object
    const attributes = {};
    result.UserAttributes.forEach(attr => {
      attributes[attr.Name] = attr.Value;
    });
    
    // Get extended profile from DynamoDB
    let profile = null;
    if (attributes.sub) {
      const profileResult = await getUserProfile(attributes.sub);
      if (profileResult.success) {
        profile = profileResult.profile;
      }
    }
    
    return {
      success: true,
      message: 'User attributes retrieved successfully',
      attributes,
      username: result.Username,
      profile
    };
  } catch (error) {
    console.error('Error getting user attributes:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Reset user password (forgot password flow)
 * @param {string} email - User email
 * @returns {Promise} - Result of password reset initiation
 */
async function forgotPassword(email) {
  const params = {
    ClientId: CLIENT_ID,
    Username: email
  };
  
  try {
    await cognitoISP.forgotPassword(params).promise();
    return {
      success: true,
      message: 'Password reset code sent successfully'
    };
  } catch (error) {
    console.error('Error initiating password reset:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Confirm new password with verification code
 * @param {string} email - User email
 * @param {string} password - New password
 * @param {string} code - Verification code
 * @returns {Promise} - Result of password confirmation
 */
async function confirmPassword(email, password, code) {
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    ConfirmationCode: code
  };
  
  try {
    await cognitoISP.confirmForgotPassword(params).promise();
    return {
      success: true,
      message: 'Password reset successfully'
    };
  } catch (error) {
    console.error('Error confirming password reset:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Change password (when user is authenticated)
 * @param {string} accessToken - User's access token
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise} - Result of password change
 */
async function changePassword(accessToken, oldPassword, newPassword) {
  const params = {
    AccessToken: accessToken,
    PreviousPassword: oldPassword,
    ProposedPassword: newPassword
  };
  
  try {
    await cognitoISP.changePassword(params).promise();
    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * List users in the Cognito User Pool (admin only)
 * @returns {Promise} - List of users
 */
async function listUsers() {
  const params = {
    UserPoolId: USER_POOL_ID,
    AttributesToGet: [
      'email',
      'given_name',
      'family_name',
      'custom:role'
    ]
  };
  
  try {
    const result = await cognitoISP.listUsers(params).promise();
    
    // Get extended profiles from DynamoDB
    const users = await Promise.all(
      result.Users.map(async user => {
        const attributes = {};
        user.Attributes.forEach(attr => {
          attributes[attr.Name] = attr.Value;
        });
        
        let profile = null;
        if (attributes.sub) {
          const profileResult = await getUserProfile(attributes.sub);
          if (profileResult.success) {
            profile = profileResult.profile;
          }
        }
        
        return {
          username: user.Username,
          userStatus: user.UserStatus,
          enabled: user.Enabled,
          createdAt: user.UserCreateDate,
          lastModified: user.UserLastModifiedDate,
          ...attributes,
          profile
        };
      })
    );
    
    return {
      success: true,
      message: 'Users retrieved successfully',
      users
    };
  } catch (error) {
    console.error('Error listing users:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

module.exports = {
  signUp,
  confirmSignUp,
  signIn,
  refreshTokens,
  getUserAttributes,
  forgotPassword,
  confirmPassword,
  changePassword,
  listUsers,
  createUserProfile,
  updateUserProfile,
  getUserProfile,
  findUserByEmail,
  completeNewPasswordChallenge
}; 