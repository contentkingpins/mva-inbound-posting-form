const authService = require('./auth-service');

/**
 * Handle user registration
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function handleSignUp(event) {
  try {
    const userData = JSON.parse(event.body);
    
    // Validate required fields
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
      return formatResponse(400, {
        status: 'error',
        message: 'Missing required fields'
      });
    }
    
    const result = await authService.signUp(userData);
    return formatResponse(result.success ? 200 : 400, result);
  } catch (error) {
    console.error('Error in handleSignUp:', error);
    return formatResponse(500, {
      status: 'error',
      message: 'Internal server error during sign up'
    });
  }
}

/**
 * Handle user registration confirmation
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function handleConfirmSignUp(event) {
  try {
    const { email, code } = JSON.parse(event.body);
    
    if (!email || !code) {
      return formatResponse(400, {
        status: 'error',
        message: 'Email and confirmation code are required'
      });
    }
    
    const result = await authService.confirmSignUp(email, code);
    return formatResponse(result.success ? 200 : 400, result);
  } catch (error) {
    console.error('Error in handleConfirmSignUp:', error);
    return formatResponse(500, {
      status: 'error',
      message: 'Internal server error during confirmation'
    });
  }
}

/**
 * Handle user sign in
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function handleSignIn(event) {
  try {
    const { email, password } = JSON.parse(event.body);
    
    if (!email || !password) {
      return formatResponse(400, {
        status: 'error',
        message: 'Email and password are required'
      });
    }
    
    const result = await authService.signIn(email, password);
    return formatResponse(result.success ? 200 : 401, result);
  } catch (error) {
    console.error('Error in handleSignIn:', error);
    return formatResponse(500, {
      status: 'error',
      message: 'Internal server error during sign in'
    });
  }
}

/**
 * Handle token refresh
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function handleRefreshTokens(event) {
  try {
    const { refreshToken } = JSON.parse(event.body);
    
    if (!refreshToken) {
      return formatResponse(400, {
        status: 'error',
        message: 'Refresh token is required'
      });
    }
    
    const result = await authService.refreshTokens(refreshToken);
    return formatResponse(result.success ? 200 : 401, result);
  } catch (error) {
    console.error('Error in handleRefreshTokens:', error);
    return formatResponse(500, {
      status: 'error',
      message: 'Internal server error during token refresh'
    });
  }
}

/**
 * Handle getting user profile
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function handleGetUserProfile(event) {
  try {
    // Extract the access token from the Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return formatResponse(401, {
        status: 'error',
        message: 'Valid Authorization header with Bearer token is required'
      });
    }
    
    const accessToken = authHeader.split(' ')[1];
    const result = await authService.getUserAttributes(accessToken);
    return formatResponse(result.success ? 200 : 401, result);
  } catch (error) {
    console.error('Error in handleGetUserProfile:', error);
    return formatResponse(500, {
      status: 'error',
      message: 'Internal server error while retrieving user profile'
    });
  }
}

/**
 * Handle forgot password request
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function handleForgotPassword(event) {
  try {
    const { email } = JSON.parse(event.body);
    
    if (!email) {
      return formatResponse(400, {
        status: 'error',
        message: 'Email is required'
      });
    }
    
    const result = await authService.forgotPassword(email);
    return formatResponse(result.success ? 200 : 400, result);
  } catch (error) {
    console.error('Error in handleForgotPassword:', error);
    return formatResponse(500, {
      status: 'error',
      message: 'Internal server error during forgot password request'
    });
  }
}

/**
 * Handle confirm forgot password
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function handleConfirmPassword(event) {
  try {
    const { email, password, code } = JSON.parse(event.body);
    
    if (!email || !password || !code) {
      return formatResponse(400, {
        status: 'error',
        message: 'Email, new password, and confirmation code are required'
      });
    }
    
    const result = await authService.confirmPassword(email, password, code);
    return formatResponse(result.success ? 200 : 400, result);
  } catch (error) {
    console.error('Error in handleConfirmPassword:', error);
    return formatResponse(500, {
      status: 'error',
      message: 'Internal server error during password reset confirmation'
    });
  }
}

/**
 * Handle change password (for authenticated users)
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function handleChangePassword(event) {
  try {
    // Extract the access token from the Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return formatResponse(401, {
        status: 'error',
        message: 'Valid Authorization header with Bearer token is required'
      });
    }
    
    const accessToken = authHeader.split(' ')[1];
    const { oldPassword, newPassword } = JSON.parse(event.body);
    
    if (!oldPassword || !newPassword) {
      return formatResponse(400, {
        status: 'error',
        message: 'Old password and new password are required'
      });
    }
    
    const result = await authService.changePassword(accessToken, oldPassword, newPassword);
    return formatResponse(result.success ? 200 : 400, result);
  } catch (error) {
    console.error('Error in handleChangePassword:', error);
    return formatResponse(500, {
      status: 'error',
      message: 'Internal server error during password change'
    });
  }
}

/**
 * Handle listing users (admin only)
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function handleListUsers(event) {
  try {
    // Extract the access token from the Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return formatResponse(401, {
        status: 'error',
        message: 'Valid Authorization header with Bearer token is required'
      });
    }
    
    const accessToken = authHeader.split(' ')[1];
    
    // Get user attributes to check if they're an admin
    const userResult = await authService.getUserAttributes(accessToken);
    if (!userResult.success) {
      return formatResponse(401, {
        status: 'error',
        message: 'Invalid access token'
      });
    }
    
    // Check if user has admin role
    if (userResult.attributes['custom:role'] !== 'admin') {
      return formatResponse(403, {
        status: 'error',
        message: 'Forbidden: Admin access required'
      });
    }
    
    const result = await authService.listUsers();
    return formatResponse(result.success ? 200 : 400, result);
  } catch (error) {
    console.error('Error in handleListUsers:', error);
    return formatResponse(500, {
      status: 'error',
      message: 'Internal server error while listing users'
    });
  }
}

/**
 * Handle updating user profile
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function handleUpdateProfile(event) {
  try {
    // Extract the access token from the Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return formatResponse(401, {
        status: 'error',
        message: 'Valid Authorization header with Bearer token is required'
      });
    }
    
    const accessToken = authHeader.split(' ')[1];
    const profileData = JSON.parse(event.body);
    
    // First get the user attributes to get the user ID
    const userResult = await authService.getUserAttributes(accessToken);
    if (!userResult.success) {
      return formatResponse(401, {
        status: 'error',
        message: 'Invalid access token'
      });
    }
    
    const userId = userResult.attributes.sub;
    if (!userId) {
      return formatResponse(400, {
        status: 'error',
        message: 'Could not determine user ID'
      });
    }
    
    // Update the profile
    const result = await authService.updateUserProfile(userId, profileData);
    return formatResponse(result.success ? 200 : 400, result);
  } catch (error) {
    console.error('Error in handleUpdateProfile:', error);
    return formatResponse(500, {
      status: 'error',
      message: 'Internal server error while updating profile'
    });
  }
}

/**
 * Handle new password challenge response
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function handleCompleteNewPasswordChallenge(event) {
  try {
    const { email, newPassword, session } = JSON.parse(event.body);
    
    if (!email || !newPassword || !session) {
      return formatResponse(400, {
        status: 'error',
        message: 'Email, new password, and session are required'
      });
    }
    
    const result = await authService.completeNewPasswordChallenge(email, newPassword, session);
    return formatResponse(result.success ? 200 : 401, result);
  } catch (error) {
    console.error('Error in handleCompleteNewPasswordChallenge:', error);
    return formatResponse(500, {
      status: 'error',
      message: 'Internal server error during password challenge completion'
    });
  }
}

/**
 * Route auth requests to appropriate handlers
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
async function router(event) {
  const { httpMethod, path } = event;
  
  if (path === '/auth/signup' && httpMethod === 'POST') {
    return await handleSignUp(event);
  } else if (path === '/auth/confirm' && httpMethod === 'POST') {
    return await handleConfirmSignUp(event);
  } else if (path === '/auth/signin' && httpMethod === 'POST') {
    return await handleSignIn(event);
  } else if (path === '/auth/refresh' && httpMethod === 'POST') {
    return await handleRefreshTokens(event);
  } else if (path === '/auth/profile' && httpMethod === 'GET') {
    return await handleGetUserProfile(event);
  } else if (path === '/auth/profile' && httpMethod === 'PATCH') {
    return await handleUpdateProfile(event);
  } else if (path === '/auth/forgot-password' && httpMethod === 'POST') {
    return await handleForgotPassword(event);
  } else if (path === '/auth/confirm-password' && httpMethod === 'POST') {
    return await handleConfirmPassword(event);
  } else if (path === '/auth/change-password' && httpMethod === 'POST') {
    return await handleChangePassword(event);
  } else if (path === '/auth/users' && httpMethod === 'GET') {
    return await handleListUsers(event);
  } else if (path === '/auth/complete-new-password' && httpMethod === 'POST') {
    return await handleCompleteNewPasswordChallenge(event);
  } else {
    return formatResponse(404, { 
      status: 'error', 
      message: 'Route not found' 
    });
  }
}

/**
 * Format response for API Gateway
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} - Formatted API Gateway response
 */
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    },
    body: JSON.stringify(body)
  };
}

module.exports = {
  router
}; 