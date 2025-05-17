const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

// Constants
const USERS_TABLE = process.env.USERS_TABLE || 'Users';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use a secure secret in production
const TOKEN_EXPIRATION = '24h'; // Token expires in 24 hours

/**
 * Register a new user
 * @param {Object} userData - User data to register
 * @returns {Promise<Object>} Registration result
 */
async function registerUser(userData) {
  try {
    // Check if username already exists
    const userCheck = await dynamoDB.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { username: userData.username }
      })
    );

    if (userCheck.Item) {
      return {
        success: false,
        message: 'Username already exists'
      };
    }

    // Check if email already exists
    const emailCheck = await dynamoDB.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': userData.email
        }
      })
    );

    if (emailCheck.Items && emailCheck.Items.length > 0) {
      return {
        success: false,
        message: 'Email already in use'
      };
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Prepare user record
    const userRecord = {
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'agent', // Default to agent if not specified
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      created_at: new Date().toISOString(),
      last_login: null,
      active: true
    };

    // Save the user
    await dynamoDB.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: userRecord
      })
    );

    // Return success (don't include password)
    const { password, ...userWithoutPassword } = userRecord;
    return {
      success: true,
      message: 'User registered successfully',
      user: userWithoutPassword
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      message: 'Error registering user'
    };
  }
}

/**
 * Authenticate a user
 * @param {string} username - Username to authenticate
 * @param {string} password - Password to verify
 * @returns {Promise<Object>} Authentication result with JWT token if successful
 */
async function loginUser(username, password) {
  try {
    // Find the user
    const userResult = await dynamoDB.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { username }
      })
    );

    const user = userResult.Item;

    // Check if user exists
    if (!user) {
      return {
        success: false,
        message: 'Invalid credentials'
      };
    }

    // Check if user is active
    if (!user.active) {
      return {
        success: false,
        message: 'Account is disabled'
      };
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return {
        success: false,
        message: 'Invalid credentials'
      };
    }

    // Update last login time
    await dynamoDB.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { username },
        UpdateExpression: 'SET last_login = :lastLogin',
        ExpressionAttributeValues: {
          ':lastLogin': new Date().toISOString()
        }
      })
    );

    // Create JWT token
    const payload = {
      username: user.username,
      email: user.email,
      role: user.role,
      name: `${user.first_name} ${user.last_name}`.trim()
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

    // Return user info and token (don't include password)
    const { password: pwd, ...userWithoutPassword } = user;
    return {
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      token
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Error during login'
    };
  }
}

/**
 * Verify JWT token and extract user info
 * @param {string} token - JWT token to verify
 * @returns {Object} Token verification result
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      success: true,
      user: decoded
    };
  } catch (error) {
    return {
      success: false,
      message: 'Invalid or expired token'
    };
  }
}

/**
 * Get user by username
 * @param {string} username - Username to find
 * @returns {Promise<Object>} User information
 */
async function getUser(username) {
  try {
    const userResult = await dynamoDB.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { username }
      })
    );

    if (!userResult.Item) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Don't return password
    const { password, ...userWithoutPassword } = userResult.Item;
    return {
      success: true,
      user: userWithoutPassword
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return {
      success: false,
      message: 'Error retrieving user'
    };
  }
}

/**
 * Update user information
 * @param {string} username - Username to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Update result
 */
async function updateUser(username, updates) {
  try {
    // Don't allow updating sensitive fields directly
    const { password, role, username: newUsername, ...allowedUpdates } = updates;

    // Check if user exists
    const userCheck = await dynamoDB.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { username }
      })
    );

    if (!userCheck.Item) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Build update expression
    const updateExpressionParts = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    Object.entries(allowedUpdates).forEach(([key, value]) => {
      updateExpressionParts.push(`#${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
      expressionAttributeNames[`#${key}`] = key;
    });

    if (updateExpressionParts.length === 0) {
      return {
        success: true,
        message: 'No fields to update'
      };
    }

    // Update the user
    await dynamoDB.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { username },
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames
      })
    );

    return {
      success: true,
      message: 'User updated successfully'
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      success: false,
      message: 'Error updating user'
    };
  }
}

/**
 * Change user password
 * @param {string} username - Username
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Password change result
 */
async function changePassword(username, oldPassword, newPassword) {
  try {
    // Get user with current password
    const userResult = await dynamoDB.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { username }
      })
    );

    if (!userResult.Item) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, userResult.Item.password);
    if (!isMatch) {
      return {
        success: false,
        message: 'Current password is incorrect'
      };
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await dynamoDB.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { username },
        UpdateExpression: 'SET password = :password',
        ExpressionAttributeValues: {
          ':password': hashedPassword
        }
      })
    );

    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      success: false,
      message: 'Error changing password'
    };
  }
}

/**
 * List all users (admin only)
 * @returns {Promise<Object>} List of users
 */
async function listUsers() {
  try {
    const usersResult = await dynamoDB.send({
      TableName: USERS_TABLE,
      Select: 'ALL_ATTRIBUTES'
    });

    // Remove passwords from results
    const users = usersResult.Items.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      success: true,
      users
    };
  } catch (error) {
    console.error('Error listing users:', error);
    return {
      success: false,
      message: 'Error retrieving users'
    };
  }
}

/**
 * Get a user by email
 * @param {string} email - User email
 * @returns {Object|null} - User object or null if not found
 */
async function getUserByEmail(email) {
    const params = {
        TableName: process.env.USERS_TABLE,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
            ':email': email
        }
    };

    try {
        const result = await dynamoDB.query(params).promise();
        return result.Items.length > 0 ? result.Items[0] : null;
    } catch (error) {
        console.error('Error getting user by email:', error);
        return null;
    }
}

/**
 * Update user's reset token and expiration
 * @param {string} username - Username
 * @param {string} resetToken - Generated reset token
 * @param {string} expiryTimestamp - Token expiration timestamp (ISO format)
 * @returns {boolean} - Success status
 */
async function updateUserResetToken(username, resetToken, expiryTimestamp) {
    const params = {
        TableName: process.env.USERS_TABLE,
        Key: { username },
        UpdateExpression: 'SET reset_token = :token, reset_token_expires = :expiry, updated_at = :updatedAt',
        ExpressionAttributeValues: {
            ':token': resetToken,
            ':expiry': expiryTimestamp,
            ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'UPDATED_NEW'
    };

    try {
        await dynamoDB.update(params).promise();
        return true;
    } catch (error) {
        console.error('Error updating reset token:', error);
        return false;
    }
}

/**
 * Verify if a reset token is valid and not expired
 * @param {string} token - Reset token to verify
 * @returns {boolean} - Whether token is valid
 */
async function verifyResetToken(token) {
    try {
        const user = await getUserByResetToken(token);
        
        if (!user) {
            return false;
        }

        // Check if token is expired
        const tokenExpiry = new Date(user.reset_token_expires);
        if (tokenExpiry < new Date()) {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error verifying reset token:', error);
        return false;
    }
}

/**
 * Get a user by reset token
 * @param {string} token - Reset token
 * @returns {Object|null} - User object or null if not found
 */
async function getUserByResetToken(token) {
    const params = {
        TableName: process.env.USERS_TABLE,
        IndexName: 'ResetTokenIndex',
        KeyConditionExpression: 'reset_token = :token',
        ExpressionAttributeValues: {
            ':token': token
        }
    };

    try {
        const result = await dynamoDB.query(params).promise();
        return result.Items.length > 0 ? result.Items[0] : null;
    } catch (error) {
        console.error('Error getting user by reset token:', error);
        return null;
    }
}

/**
 * Reset a user's password and clear reset token
 * @param {string} username - Username
 * @param {string} newPassword - New password (plain text)
 * @returns {boolean} - Success status
 */
async function resetPassword(username, newPassword) {
    try {
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user record with new password and clear reset token
        const params = {
            TableName: process.env.USERS_TABLE,
            Key: { username },
            UpdateExpression: 'SET password = :password, reset_token = :nullToken, reset_token_expires = :nullExpiry, updated_at = :updatedAt',
            ExpressionAttributeValues: {
                ':password': hashedPassword,
                ':nullToken': null,
                ':nullExpiry': null,
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'UPDATED_NEW'
        };

        await dynamoDB.update(params).promise();
        return true;
    } catch (error) {
        console.error('Error resetting password:', error);
        return false;
    }
}

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  getUser,
  updateUser,
  changePassword,
  listUsers,
  getUserByEmail,
  updateUserResetToken,
  verifyResetToken,
  getUserByResetToken,
  resetPassword
}; 