const authService = require('./auth-service');

// Login handler
async function handleLogin(data) {
  const { username, password } = data;
  
  // Validate input
  if (!username || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: 'Username and password are required'
      })
    };
  }
  
  // Authenticate user
  const result = await authService.loginUser(username, password);
  
  if (!result.success) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        status: 'error',
        message: result.message
      })
    };
  }
  
  // Return success with user info and token
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'success',
      user: result.user,
      token: result.token
    })
  };
}

// Register handler
async function handleRegister(data, user) {
  // Only admins can register new users
  if (!user || user.role !== 'admin') {
    return {
      statusCode: 403,
      body: JSON.stringify({
        status: 'error',
        message: 'Only administrators can register new users'
      })
    };
  }
  
  // Validate input
  const { username, email, password, role, first_name, last_name } = data;
  
  if (!username || !email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: 'Username, email, and password are required'
      })
    };
  }
  
  // Validate role
  if (role && !['admin', 'agent'].includes(role)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: 'Role must be either "admin" or "agent"'
      })
    };
  }
  
  // Register user
  const result = await authService.registerUser({
    username,
    email,
    password,
    role: role || 'agent',
    first_name,
    last_name
  });
  
  if (!result.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: result.message
      })
    };
  }
  
  // Return success
  return {
    statusCode: 201,
    body: JSON.stringify({
      status: 'success',
      message: 'User registered successfully',
      user: result.user
    })
  };
}

// Get user profile
async function handleGetProfile(username, user) {
  // Users can only access their own profile unless they're admins
  if (user.username !== username && user.role !== 'admin') {
    return {
      statusCode: 403,
      body: JSON.stringify({
        status: 'error',
        message: 'You are not authorized to view this profile'
      })
    };
  }
  
  // Get user profile
  const result = await authService.getUser(username);
  
  if (!result.success) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        status: 'error',
        message: result.message
      })
    };
  }
  
  // Return user profile
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'success',
      user: result.user
    })
  };
}

// Update user profile
async function handleUpdateProfile(username, data, user) {
  // Users can only update their own profile unless they're admins
  if (user.username !== username && user.role !== 'admin') {
    return {
      statusCode: 403,
      body: JSON.stringify({
        status: 'error',
        message: 'You are not authorized to update this profile'
      })
    };
  }
  
  // Only admins can change roles
  if (data.role && user.role !== 'admin') {
    return {
      statusCode: 403,
      body: JSON.stringify({
        status: 'error',
        message: 'Only administrators can change user roles'
      })
    };
  }
  
  // Update profile
  const result = await authService.updateUser(username, data);
  
  if (!result.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: result.message
      })
    };
  }
  
  // Return success
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'success',
      message: 'Profile updated successfully'
    })
  };
}

// Change password
async function handleChangePassword(username, data, user) {
  // Users can only change their own password unless they're admins
  if (user.username !== username && user.role !== 'admin') {
    return {
      statusCode: 403,
      body: JSON.stringify({
        status: 'error',
        message: 'You are not authorized to change this password'
      })
    };
  }
  
  const { oldPassword, newPassword } = data;
  
  // Validate input
  if (!oldPassword || !newPassword) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: 'Old password and new password are required'
      })
    };
  }
  
  // Change password
  const result = await authService.changePassword(username, oldPassword, newPassword);
  
  if (!result.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'error',
        message: result.message
      })
    };
  }
  
  // Return success
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'success',
      message: 'Password changed successfully'
    })
  };
}

// List all users (admin only)
async function handleListUsers(user) {
  // Only admins can list users
  if (user.role !== 'admin') {
    return {
      statusCode: 403,
      body: JSON.stringify({
        status: 'error',
        message: 'Only administrators can list users'
      })
    };
  }
  
  // Get users
  const result = await authService.listUsers();
  
  if (!result.success) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: result.message
      })
    };
  }
  
  // Return users
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'success',
      users: result.users
    })
  };
}

// Verify auth token
function verifyAuthToken(token) {
  if (!token) {
    return {
      authenticated: false,
      message: 'Authentication token is required'
    };
  }
  
  // Remove Bearer prefix if present
  if (token.startsWith('Bearer ')) {
    token = token.slice(7);
  }
  
  // Verify token
  const result = authService.verifyToken(token);
  
  if (!result.success) {
    return {
      authenticated: false,
      message: result.message
    };
  }
  
  // Return success with user info
  return {
    authenticated: true,
    user: result.user
  };
}

module.exports = {
  handleLogin,
  handleRegister,
  handleGetProfile,
  handleUpdateProfile,
  handleChangePassword,
  handleListUsers,
  verifyAuthToken
}; 