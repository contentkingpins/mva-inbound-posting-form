// Basic Connectivity Test
const axios = require('axios');

const BASE_URL = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';

async function testBasicConnectivity() {
  console.log('🔗 Testing Basic API Connectivity...\n');

  // Test 1: Basic GET request (no auth)
  try {
    console.log('📡 Testing basic connectivity...');
    const response = await axios.get(`${BASE_URL}/health`, {
      timeout: 10000,
      validateStatus: () => true // Accept any status code
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response: ${JSON.stringify(response.data, null, 2)}`);
    
    if (response.status < 500) {
      console.log('✅ API Gateway is responding');
    } else {
      console.log('❌ Server error detected');
    }
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('💡 Possible issues:');
    console.log('   - Wrong API Gateway URL');
    console.log('   - Lambda function not deployed');
    console.log('   - Network/DNS issues');
  }

  // Test 2: Test with different endpoints
  const endpoints = [
    '/health',
    '/leads',
    '/users/profile',
    '/documents/analytics'
  ];

  console.log('\n🎯 Testing Multiple Endpoints...');
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`${endpoint}: ERROR - ${error.message}`);
    }
  }

  // Test 3: Test with JWT token
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = 'mva-jwt-2025-xK9pL3nM8qR5tY7w';
  
  const testUser = {
    sub: 'test-user-id',
    email: 'test@admin.com',
    role: 'admin',
    name: 'Test Admin User',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  };

  const token = jwt.sign(testUser, JWT_SECRET);
  
  console.log('\n🔑 Testing with JWT Token...');
  console.log('Token preview:', token.substring(0, 50) + '...');

  try {
    const response = await axios.get(`${BASE_URL}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`📊 Auth Status: ${response.status}`);
    console.log(`📄 Auth Response: ${JSON.stringify(response.data, null, 2)}`);
    
    if (response.status === 403) {
      console.log('🔍 JWT token rejected - checking possible causes:');
      console.log('   - JWT secret mismatch in Lambda');
      console.log('   - JWT verification logic issue');
      console.log('   - Role/permission validation problem');
    }
  } catch (error) {
    console.log('❌ Auth test failed:', error.message);
  }
}

// Run the connectivity tests
testBasicConnectivity().catch(console.error); 