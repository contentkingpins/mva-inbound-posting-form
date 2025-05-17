const authService = require('./auth-service');
const crypto = require('crypto');
const AWS = require('aws-sdk');

// Configure AWS SES for sending emails
const ses = new AWS.SES({ region: process.env.SES_REGION || 'us-east-1' });

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

/**
 * Handler for the forgot password request
 * @param {Object} event - API Gateway event object
 * @returns {Object} - API response
 */
async function handleForgotPassword(event) {
    try {
        // Parse request body
        const requestBody = JSON.parse(event.body || '{}');
        const { email } = requestBody;

        if (!email) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 'error',
                    message: 'Email is required'
                })
            };
        }

        // Find user by email
        const user = await authService.getUserByEmail(email);

        // Always return success to prevent email enumeration attacks
        if (!user) {
            console.log(`No user found with email: ${email}`);
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 'success',
                    message: 'If your email exists in our system, you will receive password reset instructions'
                })
            };
        }

        // Generate a secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Set token expiration (default 1 hour)
        const tokenExpiryMinutes = process.env.RESET_TOKEN_EXPIRY || 60;
        const tokenExpiry = new Date();
        tokenExpiry.setMinutes(tokenExpiry.getMinutes() + parseInt(tokenExpiryMinutes));

        // Update user record with reset token and expiration
        await authService.updateUserResetToken(user.username, resetToken, tokenExpiry.toISOString());

        // Generate reset link
        const frontendUrl = process.env.FRONTEND_URL || 'https://yourdomain.com';
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

        // Send email with reset link
        await sendPasswordResetEmail(email, user.username, resetLink, tokenExpiryMinutes);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                status: 'success',
                message: 'If your email exists in our system, you will receive password reset instructions'
            })
        };
    } catch (error) {
        console.error('Error in forgot password handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                status: 'error',
                message: 'An error occurred while processing your request'
            })
        };
    }
}

/**
 * Handler for verifying reset token
 * @param {Object} event - API Gateway event object
 * @returns {Object} - API response
 */
async function handleVerifyResetToken(event) {
    try {
        // Get token from query parameters
        const token = event.queryStringParameters?.token;

        if (!token) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 'error',
                    message: 'Token is required'
                })
            };
        }

        // Verify token
        const isValid = await authService.verifyResetToken(token);

        if (!isValid) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 'error',
                    message: 'Invalid or expired reset token'
                })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                status: 'success',
                valid: true
            })
        };
    } catch (error) {
        console.error('Error in verify token handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                status: 'error',
                message: 'An error occurred while processing your request'
            })
        };
    }
}

/**
 * Handler for resetting password with token
 * @param {Object} event - API Gateway event object
 * @returns {Object} - API response
 */
async function handleResetPassword(event) {
    try {
        // Parse request body
        const requestBody = JSON.parse(event.body || '{}');
        const { token, password } = requestBody;

        if (!token || !password) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 'error',
                    message: 'Token and new password are required'
                })
            };
        }

        // Validate password strength
        if (password.length < 8) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 'error',
                    message: 'Password must be at least 8 characters long'
                })
            };
        }

        // Find user by reset token
        const user = await authService.getUserByResetToken(token);

        if (!user) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 'error',
                    message: 'Invalid or expired reset token'
                })
            };
        }

        // Check if token is expired
        const tokenExpiry = new Date(user.reset_token_expires);
        if (tokenExpiry < new Date()) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 'error',
                    message: 'Reset token has expired'
                })
            };
        }

        // Update password and clear reset token
        await authService.resetPassword(user.username, password);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                status: 'success',
                message: 'Password has been reset successfully'
            })
        };
    } catch (error) {
        console.error('Error in reset password handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                status: 'error',
                message: 'An error occurred while processing your request'
            })
        };
    }
}

/**
 * Sends a password reset email
 * @param {string} email - Recipient email address
 * @param {string} username - Username
 * @param {string} resetLink - Password reset link
 * @param {number} expiryMinutes - Token expiry in minutes
 * @returns {Promise} - SES send email response
 */
async function sendPasswordResetEmail(email, username, resetLink, expiryMinutes) {
    const sender = process.env.SES_SENDER_EMAIL || 'noreply@yourdomain.com';
    
    const emailParams = {
        Source: sender,
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            Subject: {
                Data: 'Password Reset Request - Claim Connectors CRM'
            },
            Body: {
                Html: {
                    Data: `
                        <html>
                            <head>
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .header { background-color: #4a5568; color: white; padding: 20px; text-align: center; }
                                    .content { padding: 20px; border: 1px solid #e2e8f0; }
                                    .button { display: inline-block; background-color: #4a5568; color: white; padding: 12px 24px; 
                                             text-decoration: none; border-radius: 4px; margin: 20px 0; }
                                    .footer { margin-top: 20px; font-size: 12px; color: #718096; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>Password Reset Request</h1>
                                    </div>
                                    <div class="content">
                                        <p>Hello ${username},</p>
                                        <p>We received a request to reset your password for your Claim Connectors CRM account.</p>
                                        <p>To reset your password, please click the button below:</p>
                                        <p style="text-align: center;">
                                            <a href="${resetLink}" class="button">Reset Password</a>
                                        </p>
                                        <p>This link will expire in ${expiryMinutes} minutes.</p>
                                        <p>If you did not request a password reset, you can ignore this email and your password will remain unchanged.</p>
                                        <p>For security reasons, please do not share this email with anyone.</p>
                                    </div>
                                    <div class="footer">
                                        <p>This is an automated message, please do not reply to this email.</p>
                                        <p>If you need assistance, please contact our support team.</p>
                                    </div>
                                </div>
                            </body>
                        </html>
                    `
                }
            }
        }
    };

    return ses.sendEmail(emailParams).promise();
}

module.exports = {
  handleLogin,
  handleRegister,
  handleGetProfile,
  handleUpdateProfile,
  handleChangePassword,
  handleListUsers,
  verifyAuthToken,
  handleForgotPassword,
  handleVerifyResetToken,
  handleResetPassword
}; 