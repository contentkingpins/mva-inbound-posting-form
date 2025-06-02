// Quick JWT Token Generator for Testing
const jwt = require('jsonwebtoken');

// Use the same JWT secret from your environment variables
const JWT_SECRET = 'mva-jwt-2025-xK9pL3nM8qR5tY7w';

// Create a test user payload
const testUser = {
  sub: 'test-user-id',
  email: 'test@admin.com',
  role: 'admin',  // Admin role to access all endpoints
  name: 'Test Admin User',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

// Generate the token
const token = jwt.sign(testUser, JWT_SECRET);

console.log('🔑 Generated Test JWT Token:');
console.log('==========================================');
console.log(token);
console.log('==========================================');
console.log('📝 Token Details:');
console.log('- User:', testUser.email);
console.log('- Role:', testUser.role);
console.log('- Expires:', new Date(testUser.exp * 1000).toISOString());
console.log('');
console.log('💡 Copy this token and update test-phase3-endpoints.js');
console.log('   Replace "YOUR_JWT_TOKEN" with the token above'); 