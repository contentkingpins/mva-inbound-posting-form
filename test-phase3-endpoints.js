// Phase 3 Integration Test Suite
const axios = require('axios');

const BASE_URL = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
const TEST_TOKEN = 'YOUR_JWT_TOKEN'; // Replace with valid token

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testPhase3Endpoints() {
  console.log('🚀 Starting Phase 3 Integration Tests...\n');
  
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
    console.log('❌ Document upload failed:', error.message);
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
    console.log('❌ Document search failed:', error.message);
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
    console.log('❌ Document analytics failed:', error.message);
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
    console.log('❌ Recent documents failed:', error.message);
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
    console.log('❌ Lead documents list failed:', error.message);
    results.failed++;
  }
  results.tests.push('Lead Documents List');

  // Test 6: Advanced Search (Phase 2)
  try {
    console.log('🔎 Testing advanced lead search...');
    const advancedSearchResponse = await axios.post(`${BASE_URL}/leads/search`, {
      filters: {
        disposition: ['New', 'Contacted'],
        dateRange: {
          field: 'created_at',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      },
      limit: 10
    }, { headers });
    
    if (advancedSearchResponse.data.success && Array.isArray(advancedSearchResponse.data.leads)) {
      console.log('✅ Advanced search endpoint working');
      results.passed++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log('❌ Advanced search failed:', error.message);
    results.failed++;
  }
  results.tests.push('Advanced Search');

  // Test 7: Export Initiation (Phase 2)
  try {
    console.log('📤 Testing export initiation...');
    const exportResponse = await axios.post(`${BASE_URL}/leads/export`, {
      format: 'csv',
      filters: { disposition: ['New'] },
      columns: ['name', 'email', 'phone', 'created_at']
    }, { headers });
    
    if (exportResponse.data.success && exportResponse.data.jobId) {
      console.log('✅ Export initiation endpoint working');
      results.passed++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log('❌ Export initiation failed:', error.message);
    results.failed++;
  }
  results.tests.push('Export Initiation');

  // Test 8: Agent Assignment (Phase 1)
  try {
    console.log('👤 Testing lead assignment...');
    const assignResponse = await axios.post(`${BASE_URL}/leads/lead_test/assign`, {
      agentEmail: 'test@agent.com',
      strategy: 'manual',
      notes: 'Test assignment'
    }, { headers });
    
    if (assignResponse.data.success) {
      console.log('✅ Lead assignment endpoint working');
      results.passed++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log('❌ Lead assignment failed:', error.message);
    results.failed++;
  }
  results.tests.push('Lead Assignment');

  // Test 9: Bulk Operations (Phase 1)
  try {
    console.log('📦 Testing bulk operations...');
    const bulkResponse = await axios.post(`${BASE_URL}/leads/bulk-update`, {
      lead_ids: ['lead_test'],
      updates: { disposition: 'Contacted' },
      notes: 'Test bulk update'
    }, { headers });
    
    if (bulkResponse.data.success) {
      console.log('✅ Bulk operations endpoint working');
      results.passed++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log('❌ Bulk operations failed:', error.message);
    results.failed++;
  }
  results.tests.push('Bulk Operations');

  // Test 10: Analytics Dashboard
  try {
    console.log('📈 Testing analytics dashboard...');
    const dashboardResponse = await axios.get(`${BASE_URL}/admin/analytics`, { headers });
    
    if (dashboardResponse.data.success || dashboardResponse.data.analytics) {
      console.log('✅ Analytics dashboard endpoint working');
      results.passed++;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log('❌ Analytics dashboard failed:', error.message);
    results.failed++;
  }
  results.tests.push('Analytics Dashboard');

  // Results Summary
  console.log('\n' + '='.repeat(50));
  console.log('🎯 INTEGRATION TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}/${results.tests.length}`);
  console.log(`❌ Failed: ${results.failed}/${results.tests.length}`);
  console.log(`📊 Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is ready for production!');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Review and fix issues before production deployment.');
    return false;
  }
}

// Run tests
if (require.main === module) {
  testPhase3Endpoints().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testPhase3Endpoints }; 