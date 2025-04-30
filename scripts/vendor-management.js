const AWS = require('aws-sdk');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
AWS.config.update({
  region: 'us-east-1'
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const VENDORS_TABLE = process.env.VENDORS_TABLE || 'Vendors';

// Functions to manage vendors
const vendorManager = {
  // Generate a unique vendor code
  generateVendorCode: (vendorName) => {
    // Create a code based on vendor name (first 3 chars) + random string
    const prefix = vendorName
      .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
      .substring(0, 3)
      .toUpperCase();
    
    // Add random 5 character string
    const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    return `${prefix}${randomString}`;
  },
  
  // Generate a unique API key
  generateApiKey: () => {
    // Generate a secure, random API key (32 characters)
    return crypto.randomBytes(16).toString('hex');
  },
  
  // Create a new vendor
  createVendor: async (vendorData) => {
    if (!vendorData.name) {
      throw new Error('Vendor name is required');
    }
    
    // Generate vendor code if not provided
    const vendor_code = vendorData.vendor_code || 
      vendorManager.generateVendorCode(vendorData.name);
    
    // Generate unique API key
    const api_key = vendorData.api_key || vendorManager.generateApiKey();
    
    // Create timestamp
    const created_at = new Date().toISOString();
    
    // Prepare vendor object
    const vendor = {
      vendor_code,
      name: vendorData.name,
      contact_email: vendorData.contact_email || null,
      contact_phone: vendorData.contact_phone || null,
      website: vendorData.website || null,
      api_key, // Always include an API key
      status: vendorData.status || 'active',
      created_at,
      updated_at: created_at
    };
    
    // Store in DynamoDB
    try {
      await dynamoDB.put({
        TableName: VENDORS_TABLE,
        Item: vendor,
        // Ensure vendor_code doesn't already exist
        ConditionExpression: 'attribute_not_exists(vendor_code)'
      }).promise();
      
      console.log(`Successfully created vendor: ${vendor.name} with code ${vendor.vendor_code}`);
      console.log(`API Key: ${vendor.api_key}`);
      return vendor;
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        console.error(`Vendor code ${vendor.vendor_code} already exists. Try again.`);
        // Recursively try again with a new code
        delete vendorData.vendor_code;
        return vendorManager.createVendor(vendorData);
      }
      throw error;
    }
  },
  
  // Get all vendors
  getAllVendors: async () => {
    try {
      const result = await dynamoDB.scan({
        TableName: VENDORS_TABLE
      }).promise();
      
      return result.Items;
    } catch (error) {
      console.error('Error fetching vendors:', error);
      throw error;
    }
  },
  
  // Get vendor by code
  getVendorByCode: async (vendor_code) => {
    try {
      const result = await dynamoDB.get({
        TableName: VENDORS_TABLE,
        Key: { vendor_code }
      }).promise();
      
      return result.Item;
    } catch (error) {
      console.error(`Error fetching vendor ${vendor_code}:`, error);
      throw error;
    }
  },
  
  // Update vendor
  updateVendor: async (vendor_code, updates) => {
    // Don't allow updating the vendor_code
    if (updates.vendor_code) {
      delete updates.vendor_code;
    }
    
    // Add updated timestamp
    updates.updated_at = new Date().toISOString();
    
    // Build update expression and attribute values
    let updateExpression = 'set';
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    
    Object.entries(updates).forEach(([key, value], index) => {
      const attributeKey = `#attr${index}`;
      const attributeValue = `:val${index}`;
      
      updateExpression += ` ${attributeKey} = ${attributeValue},`;
      expressionAttributeNames[attributeKey] = key;
      expressionAttributeValues[attributeValue] = value;
    });
    
    // Remove trailing comma
    updateExpression = updateExpression.slice(0, -1);
    
    try {
      await dynamoDB.update({
        TableName: VENDORS_TABLE,
        Key: { vendor_code },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'attribute_exists(vendor_code)'
      }).promise();
      
      console.log(`Successfully updated vendor: ${vendor_code}`);
      return await vendorManager.getVendorByCode(vendor_code);
    } catch (error) {
      console.error(`Error updating vendor ${vendor_code}:`, error);
      throw error;
    }
  },
  
  // Regenerate API key for vendor
  regenerateApiKey: async (vendor_code) => {
    try {
      const newApiKey = vendorManager.generateApiKey();
      
      await dynamoDB.update({
        TableName: VENDORS_TABLE,
        Key: { vendor_code },
        UpdateExpression: 'set api_key = :api_key, updated_at = :updated_at',
        ExpressionAttributeValues: {
          ':api_key': newApiKey,
          ':updated_at': new Date().toISOString()
        },
        ConditionExpression: 'attribute_exists(vendor_code)'
      }).promise();
      
      console.log(`Successfully regenerated API key for vendor: ${vendor_code}`);
      console.log(`New API Key: ${newApiKey}`);
      
      return newApiKey;
    } catch (error) {
      console.error(`Error regenerating API key for vendor ${vendor_code}:`, error);
      throw error;
    }
  },
  
  // Generate API instructions for a vendor
  generateApiInstructions: (vendor) => {
    const apiUrl = 'https://nv01uveape.execute-api.us-east-1.amazonaws.com/prod/leads';
    
    return `
# API Integration Instructions for ${vendor.name}

## Overview
Use our Lead API to submit lead information. Each lead submission must include your unique vendor code: **${vendor.vendor_code}**

## API Endpoint
POST ${apiUrl}

## Headers
- Content-Type: application/json
- Accept: application/json
- x-api-key: ${vendor.api_key}

## Request Body

\`\`\`json
{
  "first_name": "Customer First Name",
  "last_name": "Customer Last Name",
  "phone_home": "1234567890",
  "lp_caller_id": "1234567890", 
  "email": "customer@example.com",
  "vendor_code": "${vendor.vendor_code}",
  "zip_code": "12345",
  "state": "CA"
}
\`\`\`

## Required Fields
- first_name (string)
- last_name (string)
- phone_home (string, exactly 10 digits)
- lp_caller_id (string, must match phone_home)
- email (string, valid email format)
- vendor_code (string, use your assigned code above)

## Optional Fields
- zip_code (string)
- state (string)

Note: Either zip_code or state must be provided

## Response Format

Success Response (200):
\`\`\`json
{
  "status": "success",
  "lead_id": "uuid-string",
  "message": "Lead received"
}
\`\`\`

Error Response (400):
\`\`\`json
{
  "status": "error",
  "errors": ["List of validation errors"]
}
\`\`\`

## Example Code Snippets

### cURL
\`\`\`bash
curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${vendor.api_key}" \\
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "zip_code": "12345",
    "state": "CA",
    "phone_home": "1234567890",
    "lp_caller_id": "1234567890",
    "email": "john.doe@example.com",
    "vendor_code": "${vendor.vendor_code}"
  }'
\`\`\`

### JavaScript (Node.js)
\`\`\`javascript
const axios = require('axios');

const data = {
  first_name: "John",
  last_name: "Doe",
  zip_code: "12345",
  state: "CA",
  phone_home: "1234567890",
  lp_caller_id: "1234567890",
  email: "john.doe@example.com",
  vendor_code: "${vendor.vendor_code}"
};

axios.post('${apiUrl}', data, {
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${vendor.api_key}'
  }
})
.then(response => {
  console.log('Success:', response.data);
})
.catch(error => {
  console.error('Error:', error.response.data);
});
\`\`\`

## Security Notice
- Keep your API key confidential
- Do not share your API key with other vendors
- If you believe your API key has been compromised, contact us immediately for a replacement

## Support
If you have any questions or issues with the API, please contact us at support@example.com.
`;
  },
  
  // Save vendor API instructions to a file
  saveVendorInstructions: (vendor) => {
    const instructions = vendorManager.generateApiInstructions(vendor);
    const filename = `${vendor.vendor_code}_api_instructions.md`;
    const filepath = path.join(__dirname, '..', 'vendor_docs', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(filepath, instructions);
    console.log(`Saved API instructions for ${vendor.name} to ${filepath}`);
    
    return filepath;
  }
};

// Command line interface
async function main() {
  // Check command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log('Usage:');
    console.log('  node vendor-management.js create "Vendor Name" vendor@email.com 555-123-4567');
    console.log('  node vendor-management.js list');
    console.log('  node vendor-management.js get VENDOR_CODE');
    console.log('  node vendor-management.js instructions VENDOR_CODE');
    console.log('  node vendor-management.js regenerate-key VENDOR_CODE');
    return;
  }
  
  try {
    switch (command) {
      case 'create':
        // node vendor-management.js create "Vendor Name" vendor@email.com 555-123-4567
        const vendor = await vendorManager.createVendor({
          name: args[1] || 'Unknown Vendor',
          contact_email: args[2],
          contact_phone: args[3]
        });
        // Generate and save API instructions
        vendorManager.saveVendorInstructions(vendor);
        break;
        
      case 'list':
        // node vendor-management.js list
        const vendors = await vendorManager.getAllVendors();
        console.table(vendors.map(v => ({
          code: v.vendor_code,
          name: v.name,
          email: v.contact_email,
          api_key: v.api_key ? `${v.api_key.substring(0, 4)}...${v.api_key.substring(v.api_key.length - 4)}` : 'N/A',
          status: v.status
        })));
        console.log(`Total vendors: ${vendors.length}`);
        break;
        
      case 'get':
        // node vendor-management.js get VENDOR_CODE
        if (!args[1]) {
          console.error('Vendor code is required');
          return;
        }
        const vendorData = await vendorManager.getVendorByCode(args[1]);
        if (!vendorData) {
          console.log(`Vendor with code ${args[1]} not found`);
        } else {
          // Don't log the full API key to console
          const displayVendor = { ...vendorData };
          if (displayVendor.api_key) {
            displayVendor.api_key = `${displayVendor.api_key.substring(0, 4)}...${displayVendor.api_key.substring(displayVendor.api_key.length - 4)}`;
          }
          console.log(displayVendor);
        }
        break;
        
      case 'instructions':
        // node vendor-management.js instructions VENDOR_CODE
        if (!args[1]) {
          console.error('Vendor code is required');
          return;
        }
        const vendorForInstructions = await vendorManager.getVendorByCode(args[1]);
        if (!vendorForInstructions) {
          console.log(`Vendor with code ${args[1]} not found`);
        } else {
          const filePath = vendorManager.saveVendorInstructions(vendorForInstructions);
          console.log(`API instructions saved to ${filePath}`);
        }
        break;
        
      case 'regenerate-key':
        // node vendor-management.js regenerate-key VENDOR_CODE
        if (!args[1]) {
          console.error('Vendor code is required');
          return;
        }
        const newApiKey = await vendorManager.regenerateApiKey(args[1]);
        console.log(`New API key generated for ${args[1]}: ${newApiKey}`);
        
        // Generate new instructions with updated API key
        const updatedVendor = await vendorManager.getVendorByCode(args[1]);
        if (updatedVendor) {
          vendorManager.saveVendorInstructions(updatedVendor);
        }
        break;
        
      default:
        console.log(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// If this file is run directly, execute the CLI
if (require.main === module) {
  main();
} else {
  // Export for use in other modules
  module.exports = vendorManager;
} 