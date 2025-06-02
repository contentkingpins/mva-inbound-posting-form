// Phase 3 Integration Test Suite - Auto Authentication
const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
const JWT_SECRET = 'mva-jwt-2025-xK9pL3nM8qR5tY7w';

// Generate test token automatically
const testUser = {
  sub: 'test-user-id',
  email: 'test@admin.com',
  role: 'admin',
  name: 'Test Admin User',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
};

const TEST_TOKEN = jwt.sign(testUser, JWT_SECRET);

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testPhase3Endpoints() {
  console.log('🚀 Starting Phase 3 Integration Tests...\n');
  console.log('🔑 Using auto-generated admin token for testing\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Document Upload (Phase 3)
  try {
    console.log('📁 Testing document upload...');
    const uploadResponse = await axios.post(`${BASE_URL}/leads/lead_test/documents`, {
      filename: 'test-contract.pdf',
      contentType: 'application/pdf',
      contentLength: 1024,
      description: 'Test contract document',
      category: 'contracts',
      tags: ['test', 'contract']
    }, { headers });
    
    if (uploadResponse.data.success && uploadResponse.data.uploadUrl) {
      console.log('✅ Document upload endpoint working');
      results.passed++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log('❌ Document upload failed:', error.response?.status, error.message);
    results.failed++;
  }
  results.tests.push('Document Upload');

  // Test 2: Document Search (Phase 3)
  try {
    console.log('🔍 Testing document search...');
    const searchResponse = await axios.post(`${BASE_URL}/documents/search`, {
      query: 'contract',
      category: 'contracts',
      limit: 10
    }, { headers });
    
    if (searchResponse.data.success && Array.isArray(searchResponse.data.documents)) {
      console.log('✅ Document search endpoint working');
      results.passed++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log('❌ Document search failed:', error.response?.status, error.message);
    results.failed++;
  }
  results.tests.push('Document Search');

  // Test 3: Document Analytics (Phase 3)
  try {
    console.log('📊 Testing document analytics...');
    const analyticsResponse = await axios.get(`${BASE_URL}/documents/analytics?timeframe=30d`, { headers });
    
    if (analyticsResponse.data.success && analyticsResponse.data.analytics) {
      console.log('✅ Document analytics endpoint working');
      results.passed++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log('❌ Document analytics failed:', error.response?.status, error.message);
    results.failed++;
  }
  results.tests.push('Document Analytics');

  // Test 4: Recent Documents (Phase 3)
  try {
    console.log('⏰ Testing recent documents...');
    const recentResponse = await axios.get(`${BASE_URL}/documents/recent?type=uploaded&limit=5`, { headers });
    
    if (recentResponse.data.success && Array.isArray(recentResponse.data.documents)) {
      console.log('✅ Recent documents endpoint working');
      results.passed++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log('❌ Recent documents failed:', error.response?.status, error.message);
    results.failed++;
  }
  results.tests.push('Recent Documents');

  // Test 5: Lead Documents List (Phase 3)
  try {
    console.log('📋 Testing lead documents list...');
    const listResponse = await axios.get(`${BASE_URL}/leads/lead_test/documents?limit=10`, { headers });
    
    if (listResponse.data.success && Array.isArray(listResponse.data.documents)) {
      console.log('✅ Lead documents list endpoint working');
      results.passed++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log('❌ Lead documents list failed:', error.response?.status, error.message);
    results.failed++;
  }
  results.tests.push('Lead Documents List');

  // Print Results
  console.log('\n==================================================');
  console.log('🎯 INTEGRATION TEST RESULTS');
  console.log('==================================================');
  console.log(`✅ Passed: ${results.passed}/${results.tests.length}`);
  console.log(`❌ Failed: ${results.failed}/${results.tests.length}`);
  console.log(`📊 Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Phase 3 deployment successful!');
  } else {
    console.log('\n⚠️  Some tests failed. Review and fix issues before production deployment.');
  }
}

// Run the tests
testPhase3Endpoints().catch(console.error); 