// Simple test for the POST /leads endpoint
const https = require('https');
const fs = require('fs');
const path = require('path');

// API configuration
const hostname = 'nv01uveape.execute-api.us-east-1.amazonaws.com';
const apiPath = '/prod/leads';

// Load API key from environment variable or local config file
let apiKey = process.env.API_KEY;

// If no API key in environment, try to load from config
if (!apiKey) {
  try {
    // Look for a local config file that's git-ignored
    const configPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf8');
      const match = config.match(/API_KEY=([^\r\n]+)/);
      if (match && match[1]) {
        apiKey = match[1];
      }
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Check if API key is available
if (!apiKey) {
  console.error('Error: API_KEY environment variable not set and no config file found');
  console.error('Set the API key using: $env:API_KEY="your_api_key" (PowerShell)');
  console.error('Or create a .env.local file with API_KEY=your_api_key');
  process.exit(1);
}

// Test data
const testLead = {
  first_name: 'Jane',
  last_name: 'Smith',
  zip_code: '54321',
  state: 'NY',
  phone_home: '5559876543',
  lp_caller_id: '5559876543',
  email: 'jane.smith.new@example.com',
  vendor_code: 'VENDOR1'
};

console.log('Sending test lead:', JSON.stringify(testLead, null, 2));

// Make POST request
const req = https.request({
  hostname: hostname,
  path: apiPath,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  // Don't log all headers, they might contain sensitive info
  console.log(`CONTENT-TYPE: ${res.headers['content-type']}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', data);
    try {
      const jsonResponse = JSON.parse(data);
      console.log('Parsed response:', JSON.stringify(jsonResponse, null, 2));
    } catch (e) {
      console.log('Could not parse response as JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`Request Error: ${e.message}`);
});

// Write data to request body
req.write(JSON.stringify(testLead));
req.end(); 