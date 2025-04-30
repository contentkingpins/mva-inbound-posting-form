const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const VENDORS_TABLE = process.env.VENDORS_TABLE;
const LEADS_TABLE = process.env.LEADS_TABLE;

// Main handler function for API Gateway
exports.handler = async (event) => {
  try {
    const { httpMethod, path, queryStringParameters, body } = event;
    
    // Route handler
    if (path === '/leads') {
      if (httpMethod === 'POST') {
        return await handleCreateLead(JSON.parse(body));
      } else if (httpMethod === 'GET') {
        return await handleGetLeads(queryStringParameters);
      }
    }
    
    // Return 404 for unsupported routes
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Route not found' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Internal server error' })
    };
  }
};

// Handler for POST /leads
async function handleCreateLead(data) {
  // Validation
  const validationErrors = validateLeadData(data);
  if (validationErrors.length > 0) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', errors: validationErrors })
    };
  }
  
  // Check if vendor_code exists
  try {
    const vendorResult = await dynamoDB.get({
      TableName: VENDORS_TABLE,
      Key: { vendor_code: data.vendor_code }
    }).promise();
    
    if (!vendorResult.Item) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'Invalid vendor code' 
        })
      };
    }
  } catch (error) {
    console.error('Vendor validation error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error validating vendor' })
    };
  }
  
  // Check for duplicate leads
  try {
    const isDuplicate = await checkForDuplicateLead(data);
    if (isDuplicate) {
      return {
        statusCode: 409, // Conflict status code
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'Duplicate lead detected. This lead has already been submitted.' 
        })
      };
    }
  } catch (error) {
    console.error('Duplicate check error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error checking for duplicate leads' })
    };
  }

  // Generate lead ID and timestamp
  const lead_id = uuidv4();
  const timestamp = new Date().toISOString();
  
  // Store lead in DynamoDB
  const lead = {
    ...data,
    lead_id,
    timestamp
  };
  
  try {
    await dynamoDB.put({
      TableName: LEADS_TABLE,
      Item: lead
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'success', 
        lead_id, 
        message: 'Lead received' 
      })
    };
  } catch (error) {
    console.error('Store lead error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error storing lead' })
    };
  }
}

// Check for duplicate leads based on email and phone number
async function checkForDuplicateLead(data) {
  // Define what constitutes a duplicate lead - here we'll use email OR phone number
  try {
    // Using a more efficient approach with query operations
    // Note: This assumes you've created a GSI called "EmailIndex" with email as the partition key
    const emailParams = {
      TableName: LEADS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': data.email
      }
    };
    
    const emailResults = await dynamoDB.query(emailParams).promise();
    
    if (emailResults.Items && emailResults.Items.length > 0) {
      console.log('Duplicate lead detected: same email', {
        email: data.email
      });
      return true;
    }
    
    // Using a GSI called "PhoneIndex" with phone_home as the partition key
    const phoneParams = {
      TableName: LEADS_TABLE,
      IndexName: 'PhoneIndex',
      KeyConditionExpression: 'phone_home = :phone_home',
      ExpressionAttributeValues: {
        ':phone_home': data.phone_home
      }
    };
    
    const phoneResults = await dynamoDB.query(phoneParams).promise();
    
    if (phoneResults.Items && phoneResults.Items.length > 0) {
      console.log('Duplicate lead detected: same phone number', {
        phone: data.phone_home
      });
      return true;
    }
    
    // No duplicates found
    return false;
  } catch (error) {
    // If the GSIs don't exist yet, fall back to scan operations
    if (error.code === 'ResourceNotFoundException') {
      console.warn('GSIs not found, falling back to scan operation for duplicate check');
      return fallbackDuplicateCheck(data);
    }
    
    console.error('Error checking for duplicates:', error);
    throw error;
  }
}

// Fallback duplicate check using scan (less efficient but works without GSIs)
async function fallbackDuplicateCheck(data) {
  try {
    // Check by email
    const emailParams = {
      TableName: LEADS_TABLE,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': data.email
      }
    };
    
    const emailResults = await dynamoDB.scan(emailParams).promise();
    
    if (emailResults.Items && emailResults.Items.length > 0) {
      console.log('Duplicate lead detected: same email (fallback)', {
        email: data.email
      });
      return true;
    }
    
    // Check by phone number
    const phoneParams = {
      TableName: LEADS_TABLE,
      FilterExpression: 'phone_home = :phone_home',
      ExpressionAttributeValues: {
        ':phone_home': data.phone_home
      }
    };
    
    const phoneResults = await dynamoDB.scan(phoneParams).promise();
    
    if (phoneResults.Items && phoneResults.Items.length > 0) {
      console.log('Duplicate lead detected: same phone number (fallback)', {
        phone: data.phone_home
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in fallback duplicate check:', error);
    throw error;
  }
}

// Handler for GET /leads
async function handleGetLeads(queryParams) {
  try {
    const vendor_code = queryParams ? queryParams.vendor_code : null;
    let params;
    
    if (vendor_code) {
      // Query by vendor_code using GSI
      params = {
        TableName: LEADS_TABLE,
        IndexName: 'VendorTimestampIndex',
        KeyConditionExpression: 'vendor_code = :vendor_code',
        ExpressionAttributeValues: {
          ':vendor_code': vendor_code
        },
        ScanIndexForward: false // Sort by timestamp descending
      };
      
      const result = await dynamoDB.query(params).promise();
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result.Items)
      };
    } else {
      // Get all leads
      params = {
        TableName: LEADS_TABLE
      };
      
      const result = await dynamoDB.scan(params).promise();
      
      // Sort by timestamp descending
      const sortedItems = result.Items.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(sortedItems)
      };
    }
  } catch (error) {
    console.error('Get leads error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error retrieving leads' })
    };
  }
}

// Validation function
function validateLeadData(data) {
  const errors = [];
  
  // Check required fields
  if (!data.first_name) errors.push('first_name is required');
  if (!data.last_name) errors.push('last_name is required');
  if (!data.phone_home) errors.push('phone_home is required');
  if (!data.email) errors.push('email is required');
  if (!data.vendor_code) errors.push('vendor_code is required');
  
  // If any required fields are missing, return early
  if (errors.length > 0) return errors;
  
  // Validate phone_home is exactly 10 digits
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(data.phone_home)) {
    errors.push('phone_home must be exactly 10 numeric digits');
  }
  
  // Validate lp_caller_id matches phone_home
  if (data.lp_caller_id !== data.phone_home) {
    errors.push('lp_caller_id must match phone_home');
  }
  
  // Validate either zip_code or state is present
  if (!data.zip_code && !data.state) {
    errors.push('Either zip_code or state must be provided');
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    errors.push('email must be in valid format');
  }
  
  return errors;
} 