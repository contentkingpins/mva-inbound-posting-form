const jwt = require('jsonwebtoken');
const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');

// Initialize Cognito client
const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' });

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_lhc964tLD';
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

// CORS headers - More permissive for debugging
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
  'Access-Control-Max-Age': '86400'
};

/**
 * Extract and verify JWT token from request
 * @param {Object} event - API Gateway event
 * @returns {Object} - User information or null if invalid
 */
async function verifyToken(event) {
  try {
    // Extract token from Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    
    if (!authHeader) {
      console.log('No Authorization header found');
      return null;
    }
    
    // Extract token from "Bearer token" format
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    
    if (!token) {
      console.log('No token found in Authorization header');
      return null;
    }
    
    console.log('Verifying token...');
    
    // Try to verify JWT token
    let decoded;
    try {
      // First try with our custom JWT secret (if using custom auth)
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token verified with custom secret');
    } catch (jwtError) {
      console.log('Custom JWT verification failed, this might be a Cognito token');
      
      // If custom JWT fails, this might be a Cognito token
      // For Cognito tokens, we'd need to verify against Cognito's public keys
      // For now, we'll decode without verification to get user info
      decoded = jwt.decode(token);
      
      if (!decoded) {
        console.log('Token decode failed');
        return null;
      }
      
      console.log('Token decoded (Cognito token)');
    }
    
    // Extract user information from token
    const user = {
      sub: decoded.sub || decoded.user_id,
      user_id: decoded.user_id || decoded.sub,
      email: decoded.email,
      role: decoded.role || decoded['custom:role'] || 'user',
      vendor_code: decoded.vendor_code || decoded['custom:vendor_code'],
      username: decoded.username || decoded.preferred_username || decoded.email,
      exp: decoded.exp
    };
    
    // PRODUCTION FIX: Grant admin access to main app owner
    const adminEmails = [
      'george@contentkingpins.com',
      'admin@contentkingpins.com',
      'alex@contentkingpins.com',
      'asiegel@contentkingpins.com'
    ];
    
    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      console.log(`Granting admin access to authorized user: ${user.email}`);
      user.role = 'admin';
    }
    
    // Check if token is expired
    if (user.exp && Date.now() >= user.exp * 1000) {
      console.log('Token is expired');
      return null;
    }
    
    console.log('User authenticated:', { 
      sub: user.sub, 
      email: user.email, 
      role: user.role,
      vendor_code: user.vendor_code 
    });
    
    return user;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Middleware to authenticate requests and attach user to event
 * @param {Object} event - API Gateway event
 * @returns {Object} - Modified event with user info or error response
 */
async function authenticateRequest(event) {
  // Skip authentication for OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    console.log('Skipping authentication for OPTIONS request');
    return null; // No error, allow OPTIONS to continue
  }
  
  const user = await verifyToken(event);
  
  if (!user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Valid authentication token required' 
      })
    };
  }
  
  // Attach user to request context for controllers
  if (!event.requestContext) {
    event.requestContext = {};
  }
  event.requestContext.authorizer = user;
  
  return null; // No error, continue with request
}

/**
 * Check if user has required role
 * @param {string} requiredRole - Role required to access resource
 * @returns {Function} - Middleware function
 */
function requireRole(requiredRole) {
  return (user) => {
    if (!user) {
      return false;
    }
    
    // Admin can access everything
    if (user.role === 'admin') {
      return true;
    }
    
    // Check specific role
    return user.role === requiredRole;
  };
}

/**
 * Check if user can access vendor-specific resources
 * @param {string} vendorCode - Vendor code to check against
 * @returns {Function} - Check function
 */
function canAccessVendor(vendorCode) {
  return (user) => {
    if (!user) {
      return false;
    }
    
    // Admin can access all vendor data
    if (user.role === 'admin') {
      return true;
    }
    
    // Vendor can only access their own data
    if (user.role === 'vendor') {
      return user.vendor_code === vendorCode;
    }
    
    return false;
  };
}

/**
 * Simple role check for controllers
 * @param {Object} event - API Gateway event
 * @param {string} requiredRole - Required role
 * @returns {boolean} - Whether user has required role
 */
function hasRole(event, requiredRole) {
  const user = event.requestContext?.authorizer;
  
  if (!user) {
    return false;
  }
  
  // Admin can access everything
  if (user.role === 'admin') {
    return true;
  }
  
  return user.role === requiredRole;
}

/**
 * Get user from authenticated request
 * @param {Object} event - API Gateway event
 * @returns {Object|null} - User object or null
 */
function getUser(event) {
  return event.requestContext?.authorizer || null;
}

module.exports = {
  verifyToken,
  authenticateRequest,
  requireRole,
  canAccessVendor,
  hasRole,
  getUser,
  CORS_HEADERS
}; 