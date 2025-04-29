const https = require('https');

// Replace with actual API Gateway endpoint after deployment
const API_ENDPOINT = 'https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/dev';
// Replace with your actual API key
const API_KEY = 'your-api-key-here';

// Test POST /leads
async function testCreateLead() {
  console.log('\nTesting POST /leads:');
  
  // Valid lead data
  const validLead = {
    first_name: 'John',
    last_name: 'Doe',
    zip_code: '12345',
    state: 'CA',
    phone_home: '1234567890',
    lp_caller_id: '1234567890',
    email: 'john.doe@example.com',
    vendor_code: 'VENDOR1'
  };
  
  try {
    const response = await makeRequest('/leads', 'POST', validLead);
    console.log('Success response:', response);

    // Save the lead_id for later testing
    const leadId = response.lead_id;
    
    // Test with invalid data
    console.log('\nTesting POST /leads with invalid data:');
    const invalidLead = {
      first_name: 'Jane',
      last_name: 'Doe',
      // Missing zip_code and state
      phone_home: '123456', // Invalid phone (less than 10 digits)
      lp_caller_id: '9876543210', // Doesn't match phone_home
      email: 'invalid-email', // Invalid email format
      vendor_code: 'NONEXISTENT' // Vendor that doesn't exist
    };
    
    try {
      const errorResponse = await makeRequest('/leads', 'POST', invalidLead);
      console.log('Error response:', errorResponse);
    } catch (error) {
      console.log('Expected error:', error);
    }
    
    return leadId;
  } catch (error) {
    console.error('Error testing POST /leads:', error);
  }
}

// Test GET /leads
async function testGetLeads() {
  console.log('\nTesting GET /leads:');
  
  try {
    // Get all leads
    const allLeads = await makeRequest('/leads', 'GET');
    console.log(`Retrieved ${allLeads.length} leads`);
    
    // Get leads filtered by vendor
    console.log('\nTesting GET /leads with vendor filter:');
    const filteredLeads = await makeRequest('/leads?vendor_code=VENDOR1', 'GET');
    console.log(`Retrieved ${filteredLeads.length} leads for VENDOR1`);
  } catch (error) {
    console.error('Error testing GET /leads:', error);
  }
}

// Helper function to make HTTP requests
function makeRequest(path, method, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_ENDPOINT.replace('https://', ''),
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Add API key for POST requests
    if (method === 'POST') {
      options.headers['x-api-key'] = API_KEY;
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 400) {
            reject(parsedData);
          } else {
            resolve(parsedData);
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run tests
async function runTests() {
  try {
    await testCreateLead();
    await testGetLeads();
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Check for API key before running tests
if (API_KEY === 'your-api-key-here') {
  console.log('Please update the API_KEY constant with your actual API key before running tests');
} else {
  runTests();
} 