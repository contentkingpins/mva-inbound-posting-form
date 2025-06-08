// Quick JWT Token Generator for Testing
const jwt = require('jsonwebtoken');

// Use the same JWT secret from your environment variables
const JWT_SECRET = 'mva-jwt-2025-xK9pL3nM8qR5tY7w';

// Create a test user payload for asiegel@contentkingpins.com
const testUser = {
  sub: 'asiegel-admin-id',
  email: 'asiegel@contentkingpins.com',  // Your actual email
  role: 'admin',  // Admin role to access all endpoints
  'custom:role': 'admin',  // Cognito custom attribute format
  name: 'Alex Siegel',
  username: 'asiegel',
  preferred_username: 'asiegel',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

// Generate the token
const token = jwt.sign(testUser, JWT_SECRET);

console.log('🔑 Generated Test JWT Token for asiegel@contentkingpins.com:');
console.log('');
console.log('TOKEN:');
console.log(token);
console.log('');
console.log('📋 To use this token:');
console.log('1. Open your browser console on admin.html');
console.log('2. Run: localStorage.setItem("auth_token", "' + token + '")');
console.log('3. Run: localStorage.setItem("user", JSON.stringify(' + JSON.stringify(testUser) + '))');
console.log('4. Refresh the page');
console.log('');
console.log('🔍 Token payload:');
console.log(JSON.stringify(testUser, null, 2)); 