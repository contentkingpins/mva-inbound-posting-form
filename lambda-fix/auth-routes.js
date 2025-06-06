const express = require('express');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');
const config = require('./config.json');

const router = express.Router();

// Configure the AWS SDK with the region
AWS.config.update({ region: config.region });

// Create Cognito Identity Service Provider
const cognitoISP = new AWS.CognitoIdentityServiceProvider();

// Store the JWKs for token verification
let jwks = null;
let pemKeys = {};

// Fetch the JWKs from Cognito
async function fetchJwks() {
  try {
    const url = `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}/.well-known/jwks.json`;
    const response = await axios.get(url);
    jwks = response.data.keys;
    
    // Convert JWKs to PEM format for verification
    jwks.forEach(jwk => {
      const kid = jwk.kid;
      const pem = jwkToPem(jwk);
      pemKeys[kid] = pem;
    });
  } catch (error) {
    console.error('Error fetching JWKs:', error);
  }
}

// Fetch JWKs on startup
fetchJwks();

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    // Ensure we have JWKs
    if (!jwks) {
      await fetchJwks();
    }
    
    // Decode the token header to get the key ID (kid)
    const decodedHeader = jwt.decode(token, { complete: true })?.header;
    if (!decodedHeader || !decodedHeader.kid) {
      return res.status(401).json({ message: 'Invalid token format' });
    }
    
    // Get the PEM key for the key ID
    const pem = pemKeys[decodedHeader.kid];
    if (!pem) {
      return res.status(401).json({ message: 'Invalid token signature' });
    }
    
    // Verify the token
    jwt.verify(token, pem, {
      issuer: `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`
    }, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token verification failed', error: err.message });
      }
      
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ message: 'Error verifying token' });
  }
};

// Routes for user management
router.get('/users', verifyToken, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user['cognito:groups']?.includes('admin') || req.user['custom:role'] === 'admin') {
      // List users from Cognito User Pool
      const params = {
        UserPoolId: config.userPoolId,
        Limit: 60
      };
      
      const result = await cognitoISP.listUsers(params).promise();
      
      const users = result.Users.map(user => {
        const userObj = {
          username: user.Username,
          status: user.Enabled ? 'active' : 'inactive',
          created: user.UserCreateDate,
          lastModified: user.UserLastModifiedDate,
          attributes: {}
        };
        
        // Extract user attributes
        user.Attributes.forEach(attr => {
          userObj.attributes[attr.Name] = attr.Value;
        });
        
        return userObj;
      });
      
      return res.json({ users });
    } else {
      return res.status(403).json({ message: 'Unauthorized access: Admin role required' });
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
});

// Create new user (admin only)
router.post('/users', verifyToken, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user['cognito:groups']?.includes('admin') || req.user['custom:role'] === 'admin') {
      const { username, email, password, firstName, lastName, role } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const params = {
        UserPoolId: config.userPoolId,
        Username: username,
        TemporaryPassword: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:role', Value: role || 'agent' }
        ]
      };
      
      // Add optional attributes if provided
      if (firstName) params.UserAttributes.push({ Name: 'given_name', Value: firstName });
      if (lastName) params.UserAttributes.push({ Name: 'family_name', Value: lastName });
      
      await cognitoISP.adminCreateUser(params).promise();
      
      // If role is admin, add to admin group
      if (role === 'admin') {
        await cognitoISP.adminAddUserToGroup({
          GroupName: 'admin',
          UserPoolId: config.userPoolId,
          Username: username
        }).promise();
      }
      
      return res.json({ message: 'User created successfully', username });
    } else {
      return res.status(403).json({ message: 'Unauthorized access: Admin role required' });
    }
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Update user (admin only)
router.put('/users/:username', verifyToken, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user['cognito:groups']?.includes('admin') || req.user['custom:role'] === 'admin') {
      const { username } = req.params;
      const { email, firstName, lastName, role, enabled } = req.body;
      
      // Update user attributes
      const userAttributes = [];
      if (email) userAttributes.push({ Name: 'email', Value: email });
      if (firstName) userAttributes.push({ Name: 'given_name', Value: firstName });
      if (lastName) userAttributes.push({ Name: 'family_name', Value: lastName });
      if (role) userAttributes.push({ Name: 'custom:role', Value: role });
      
      if (userAttributes.length > 0) {
        await cognitoISP.adminUpdateUserAttributes({
          UserPoolId: config.userPoolId,
          Username: username,
          UserAttributes: userAttributes
        }).promise();
      }
      
      // Update user enabled status if specified
      if (enabled !== undefined) {
        if (enabled) {
          await cognitoISP.adminEnableUser({
            UserPoolId: config.userPoolId,
            Username: username
          }).promise();
        } else {
          await cognitoISP.adminDisableUser({
            UserPoolId: config.userPoolId,
            Username: username
          }).promise();
        }
      }
      
      // Update user group if role changed
      if (role) {
        try {
          // First, get current groups
          const groupsResponse = await cognitoISP.adminListGroupsForUser({
            UserPoolId: config.userPoolId,
            Username: username
          }).promise();
          
          const currentGroups = groupsResponse.Groups.map(g => g.GroupName);
          
          // If role is admin and not in admin group, add to admin group
          if (role === 'admin' && !currentGroups.includes('admin')) {
            await cognitoISP.adminAddUserToGroup({
              GroupName: 'admin',
              UserPoolId: config.userPoolId,
              Username: username
            }).promise();
          }
          
          // If role is not admin but in admin group, remove from admin group
          if (role !== 'admin' && currentGroups.includes('admin')) {
            await cognitoISP.adminRemoveUserFromGroup({
              GroupName: 'admin',
              UserPoolId: config.userPoolId,
              Username: username
            }).promise();
          }
        } catch (groupError) {
          console.error('Error updating user groups:', groupError);
        }
      }
      
      return res.json({ message: 'User updated successfully', username });
    } else {
      return res.status(403).json({ message: 'Unauthorized access: Admin role required' });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// Change password (admin only)
router.post('/users/:username/password', verifyToken, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user['cognito:groups']?.includes('admin') || req.user['custom:role'] === 'admin') {
      const { username } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }
      
      await cognitoISP.adminSetUserPassword({
        UserPoolId: config.userPoolId,
        Username: username,
        Password: password,
        Permanent: true
      }).promise();
      
      return res.json({ message: 'Password updated successfully', username });
    } else {
      return res.status(403).json({ message: 'Unauthorized access: Admin role required' });
    }
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({ message: 'Error updating password', error: error.message });
  }
});

module.exports = router; 