/**
 * Simplified Auth Middleware for API Gateway Cognito Authorizer
 * AWS handles JWT verification, we just extract user info and determine roles
 */

// CORS headers
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.FRONTEND_DOMAIN || 'https://main.d21xta9fg9b6w.amplifyapp.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
};

/**
 * Extract user info from API Gateway Cognito authorizer context
 * AWS has already validated the JWT token for us!
 */
function getAuthenticatedUser(event) {
  try {
    // API Gateway Cognito authorizer populates this automatically
    const requestContext = event.requestContext || {};
    const authorizer = requestContext.authorizer || {};
    
    // Extract claims from Cognito token (already verified by AWS)
    const claims = authorizer.claims || {};
    
    const user = {
      sub: claims.sub,
      email: claims.email,
      email_verified: claims.email_verified === 'true',
      username: claims['cognito:username'] || claims.email,
      role: determineUserRole(claims.email),
      groups: claims['cognito:groups'] ? claims['cognito:groups'].split(',') : [],
      // Additional useful info
      token_use: claims.token_use,
      auth_time: claims.auth_time,
      exp: claims.exp
    };
    
    console.log('✅ User authenticated via Cognito:', {
      sub: user.sub,
      email: user.email,
      role: user.role,
      email_verified: user.email_verified
    });
    
    return user;
    
  } catch (error) {
    console.error('❌ Error extracting user from Cognito context:', error);
    return null;
  }
}

/**
 * Determine user role based on business logic
 * This is the ONLY place where role assignment happens
 */
function determineUserRole(email) {
  if (!email) return 'user';
  
  // Get admin emails from environment variable
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  
  // Check if user is in admin list
  if (adminEmails.includes(email.toLowerCase())) {
    console.log(`🔒 Admin access granted to: ${email}`);
    return 'admin';
  }
  
  // Default role for authenticated users
  return 'agent';
}

/**
 * Simplified middleware - just extract user info (AWS already validated token)
 */
function authenticateWithCognito(event) {
  const user = getAuthenticatedUser(event);
  
  if (!user) {
    // This should rarely happen since AWS validates tokens
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Unable to extract user information from token' 
      })
    };
  }
  
  // Attach user to request context for controllers
  if (!event.requestContext) {
    event.requestContext = {};
  }
  event.requestContext.authorizer = event.requestContext.authorizer || {};
  event.requestContext.authorizer.user = user;
  
  return null; // Success - continue with request
}

/**
 * Check if user has required role
 */
function hasRole(event, requiredRole) {
  const user = event.requestContext?.authorizer?.user;
  
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
 * Check if user can access vendor-specific resources
 */
function canAccessVendor(event, vendorCode) {
  const user = event.requestContext?.authorizer?.user;
  
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
}

/**
 * Get authenticated user from request
 */
function getUser(event) {
  return event.requestContext?.authorizer?.user || null;
}

/**
 * Check if current user is admin
 */
function isAdmin(event) {
  const user = getUser(event);
  return user?.role === 'admin';
}

module.exports = {
  authenticateWithCognito,
  getAuthenticatedUser,
  determineUserRole,
  hasRole,
  canAccessVendor,
  getUser,
  isAdmin,
  CORS_HEADERS
}; 