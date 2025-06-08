const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

// Cognito JWKS client
const client = jwksClient({
  jwksUri: `https://cognito-idp.us-east-1.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000 // 10 minutes
});

/**
 * PROPER Production Authentication
 * Verifies Cognito JWTs against AWS public keys
 */
async function verifyProductionToken(event) {
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.slice(7);
    
    // Decode token header to get key ID
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || !decodedHeader.header.kid) {
      throw new Error('Invalid token header');
    }
    
    // Get public key from Cognito
    const key = await new Promise((resolve, reject) => {
      client.getSigningKey(decodedHeader.header.kid, (err, key) => {
        if (err) reject(err);
        else resolve(key.getPublicKey());
      });
    });
    
    // Verify token with Cognito's public key
    const decoded = jwt.verify(token, key, {
      issuer: `https://cognito-idp.us-east-1.amazonaws.com/${process.env.USER_POOL_ID}`,
      audience: process.env.USER_POOL_CLIENT_ID
    });
    
    // Extract user info from VERIFIED Cognito token
    const user = {
      sub: decoded.sub,
      email: decoded.email,
      email_verified: decoded.email_verified,
      username: decoded['cognito:username'],
      role: getUserRole(decoded.email), // Determine role server-side
      groups: decoded['cognito:groups'] || []
    };
    
    return user;
    
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Determine user role based on business logic
 * Replace hardcoded email lists with proper role management
 */
function getUserRole(email) {
  // Option 1: Check Cognito groups
  // Option 2: Database lookup
  // Option 3: Environment-based config
  
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  
  if (adminEmails.includes(email.toLowerCase())) {
    return 'admin';
  }
  
  // Default role
  return 'agent';
}

/**
 * Production-ready authentication middleware
 */
async function authenticateProduction(event) {
  const user = await verifyProductionToken(event);
  
  if (!user) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_DOMAIN,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Valid Cognito token required' 
      })
    };
  }
  
  // Attach verified user to request
  event.requestContext = event.requestContext || {};
  event.requestContext.authorizer = user;
  
  return null; // Success
}

module.exports = {
  verifyProductionToken,
  authenticateProduction,
  getUserRole
}; 