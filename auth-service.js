import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import config from './config.json';

const userPool = new CognitoUserPool({
  UserPoolId: config.userPoolId,
  ClientId: config.clientId
});

class AuthService {
  signIn(username, password) {
    return new Promise((resolve, reject) => {
      const authDetails = new AuthenticationDetails({
        Username: username,
        Password: password
      });
      
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: userPool
      });
      
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (result) => {
          // Store tokens
          const token = result.getIdToken().getJwtToken();
          localStorage.setItem('auth_token', token);
          
          // Store user info
          const user = {
            username: cognitoUser.getUsername(),
            // Extract additional user attributes if needed
            role: this.extractRoleFromToken(result) || 'agent', // Default to agent role if not specified
            name: this.extractNameFromToken(result) || cognitoUser.getUsername()
          };
          localStorage.setItem('user', JSON.stringify(user));
          
          resolve(result);
        },
        onFailure: (err) => {
          console.error('Authentication failed:', err);
          reject(err);
        }
      });
    });
  }
  
  isAuthenticated() {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) return Promise.resolve(false);
    
    return new Promise((resolve) => {
      currentUser.getSession((err, session) => {
        if (err || !session.isValid()) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  signOut() {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }
  
  refreshTokens() {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) return Promise.reject('No user found');
    
    return new Promise((resolve, reject) => {
      currentUser.getSession((err, session) => {
        if (err) {
          reject(err);
        } else {
          // Update token in localStorage
          const token = session.getIdToken().getJwtToken();
          localStorage.setItem('auth_token', token);
          resolve(session);
        }
      });
    });
  }
  
  extractRoleFromToken(result) {
    try {
      // This assumes your Cognito User Pool has custom:role attribute or 
      // you're using Cognito groups to determine roles
      const payload = result.getIdToken().decodePayload();
      return payload['custom:role'] || payload['cognito:groups']?.[0];
    } catch (error) {
      console.error('Error extracting role from token:', error);
      return null;
    }
  }
  
  extractNameFromToken(result) {
    try {
      const payload = result.getIdToken().decodePayload();
      const firstName = payload.given_name || '';
      const lastName = payload.family_name || '';
      return firstName && lastName ? `${firstName} ${lastName}` : null;
    } catch (error) {
      console.error('Error extracting name from token:', error);
      return null;
    }
  }
  
  getCurrentUser() {
    return userPool.getCurrentUser();
  }
  
  getUserAttributes() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return Promise.reject('No user found');
    
    return new Promise((resolve, reject) => {
      currentUser.getUserAttributes((err, attributes) => {
        if (err) {
          reject(err);
        } else {
          const userAttributes = {};
          attributes.forEach(attribute => {
            userAttributes[attribute.getName()] = attribute.getValue();
          });
          resolve(userAttributes);
        }
      });
    });
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService; 