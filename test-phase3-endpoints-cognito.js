// Phase 3 Integration Test Suite - Real Cognito Authentication
const axios = require('axios');

const BASE_URL = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';

// Real Cognito access token from authentication
const COGNITO_TOKEN = 'eyJraWQiOiI3VitFdXROSDNIWExHU3Bvc1VJa2RNNjdrNFV3N3p2MVV5cWxKQkxGTjNNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxNGM4MTRkOC01MDExLTcwNGItZTM4NC02MGEyYmQ5OWIzYjIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9saGM5NjR0TEQiLCJjbGllbnRfaWQiOiI1dDZtYW5lNGZudmluZWtzb3FiNHRhMGl1MSIsIm9yaWdpbl9qdGkiOiI4MTY4ZDA3YS0xM2E4LTQyNDItOGFjZi03NzEwMzBmMGIwN2EiLCJldmVudF9pZCI6IjAxYTE0YWEwLTFiNWUtNDk0ZC1hMDVhLWQ3M2U3ZDkxZDczNSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE3NDg5MDMyMjYsImV4cCI6MTc0ODkwNjgyNiwiaWF0IjoxNzQ4OTAzMjI2LCJqdGkiOiI2ZGMxNTU2ZC1kN2I0LTQxZjktYmYzMi01ZmJlMDAyZDNmMmYiLCJ1c2VybmFtZSI6InRlc3RhZG1pbiJ9.pV_1c0k19fJlT26IxV2tOTF_oKrMOsPWXLvU5zft3nOzS_1k4u-kBXYgWVV9qK1mCHBULaTjMD9ZjNVHNPB_J14FcFuEDELGAw636KzidoHiS_19wbj5nE74gw_3TLBUuCqaTC0Wfb_VKet1wqiwbB9jK6NjVTx0CHSDVgmBBihT6kzFJY4kq5yyuIiM4b07xJsWjgyMxgG7bpu4pNZKq-5VnhIBnquUsPD0-NivBWuep64dS9a4bQI3gQSXAHgeSWKqkiDgqG02_6mPWAcdcL88pgowGeERemopaZHfnjndOSdG1O_8C4c0-Sumgz4f60zbBU41p-wpROJorDp-Pg';

const headers = {
  'Authorization': `Bearer ${COGNITO_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testPhase3Endpoints() {
  console.log('🚀 Starting Phase 3 Integration Tests...\n');
  console.log('🔑 Using real Cognito token for authentication\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Document Search
  try {
    console.log('🔍 Testing document search...');
    const searchResponse = await axios.post(`${BASE_URL}/documents/search`, {
      query: 'contract',
      category: 'contracts',
      limit: 10
    }, { 
      headers,
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`Status: ${searchResponse.status}`);
    console.log(`Response: ${JSON.stringify(searchResponse.data, null, 2)}`);
    
    if (searchResponse.status === 200 && searchResponse.data.success) {
      console.log('✅ Document search endpoint working');
      results.passed++;
    } else {
      console.log('❌ Document search failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Document search failed:', error.message);
    results.failed++;
  }
  results.tests.push('Document Search');

  // Test 2: Document Analytics
  try {
    console.log('\n📊 Testing document analytics...');
    const analyticsResponse = await axios.get(`${BASE_URL}/documents/analytics?timeframe=30d`, { 
      headers,
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`Status: ${analyticsResponse.status}`);
    console.log(`Response: ${JSON.stringify(analyticsResponse.data, null, 2)}`);
    
    if (analyticsResponse.status === 200 && analyticsResponse.data.success) {
      console.log('✅ Document analytics endpoint working');
      results.passed++;
    } else {
      console.log('❌ Document analytics failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Document analytics failed:', error.message);
    results.failed++;
  }
  results.tests.push('Document Analytics');

  // Test 3: Recent Documents
  try {
    console.log('\n⏰ Testing recent documents...');
    const recentResponse = await axios.get(`${BASE_URL}/documents/recent?type=uploaded&limit=5`, { 
      headers,
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`Status: ${recentResponse.status}`);
    console.log(`Response: ${JSON.stringify(recentResponse.data, null, 2)}`);
    
    if (recentResponse.status === 200 && recentResponse.data.success) {
      console.log('✅ Recent documents endpoint working');
      results.passed++;
    } else {
      console.log('❌ Recent documents failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Recent documents failed:', error.message);
    results.failed++;
  }
  results.tests.push('Recent Documents');

  // Test 4: Lead Documents List (using the greedy path)
  try {
    console.log('\n📋 Testing lead documents list...');
    const listResponse = await axios.get(`${BASE_URL}/leads/test-lead-id/documents?limit=10`, { 
      headers,
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`Status: ${listResponse.status}`);
    console.log(`Response: ${JSON.stringify(listResponse.data, null, 2)}`);
    
    if (listResponse.status === 200 && listResponse.data.success) {
      console.log('✅ Lead documents list endpoint working');
      results.passed++;
    } else {
      console.log('❌ Lead documents list failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Lead documents list failed:', error.message);
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
    console.log('\n⚠️  Some tests failed. Check the detailed responses above.');
  }
}

// Run the tests
testPhase3Endpoints().catch(console.error); 