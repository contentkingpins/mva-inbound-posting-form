const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

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
    } else if (path === '/stats') {
      if (httpMethod === 'GET') {
        return await handleGetLeadStats(queryStringParameters);
      }
    } else if (path === '/export') {
      if (httpMethod === 'GET') {
        return await handleExportLeads(queryStringParameters);
      }
    } else if (path === '/vendors') {
      if (httpMethod === 'GET') {
        return await handleGetVendors();
      } else if (httpMethod === 'POST') {
        return await handleCreateVendor(JSON.parse(body));
      }
    } else if (path.match(/^\/vendors\/([^\/]+)\/regenerate-key$/)) {
      if (httpMethod === 'POST') {
        const vendorCode = path.split('/')[2];
        return await handleRegenerateApiKey(vendorCode);
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

// Handler for GET /stats - Aggregated lead statistics
async function handleGetLeadStats(queryParams) {
  try {
    // Default to all time periods if not specified
    const period = queryParams?.period || 'all';
    const vendorCode = queryParams?.vendor_code || null;
    
    // Get all leads
    let leads;
    if (vendorCode) {
      // Query by vendor_code using GSI
      const params = {
        TableName: LEADS_TABLE,
        IndexName: 'VendorTimestampIndex',
        KeyConditionExpression: 'vendor_code = :vendor_code',
        ExpressionAttributeValues: {
          ':vendor_code': vendorCode
        }
      };
      
      const result = await dynamoDB.query(params).promise();
      leads = result.Items;
    } else {
      // Get all leads
      const params = {
        TableName: LEADS_TABLE
      };
      
      const result = await dynamoDB.scan(params).promise();
      leads = result.Items;
    }
    
    // Calculate current date and relevant cutoff dates
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as the first day of the week
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Convert to ISO string for comparison
    const todayIso = today.toISOString();
    const startOfWeekIso = startOfWeek.toISOString();
    const startOfMonthIso = startOfMonth.toISOString();
    
    // Initialize stats object
    const stats = {
      daily: {},
      weekly: {},
      monthly: {},
      all_time: {}
    };
    
    // Group leads by vendor and time period
    leads.forEach(lead => {
      const vendor = lead.vendor_code;
      const timestamp = lead.timestamp;
      
      // Skip if no vendor code or timestamp
      if (!vendor || !timestamp) return;
      
      // Initialize counters for this vendor if they don't exist
      if (!stats.daily[vendor]) stats.daily[vendor] = 0;
      if (!stats.weekly[vendor]) stats.weekly[vendor] = 0;
      if (!stats.monthly[vendor]) stats.monthly[vendor] = 0;
      if (!stats.all_time[vendor]) stats.all_time[vendor] = 0;
      
      // Increment counts based on time period
      if (timestamp >= todayIso) {
        stats.daily[vendor]++;
      }
      
      if (timestamp >= startOfWeekIso) {
        stats.weekly[vendor]++;
      }
      
      if (timestamp >= startOfMonthIso) {
        stats.monthly[vendor]++;
      }
      
      // Always increment all-time count
      stats.all_time[vendor]++;
    });
    
    // Prepare response based on requested period
    let responseData;
    
    switch (period) {
      case 'daily':
        responseData = stats.daily;
        break;
      case 'weekly':
        responseData = stats.weekly;
        break;
      case 'monthly':
        responseData = stats.monthly;
        break;
      case 'all':
      default:
        responseData = stats;
        break;
    }
    
    // Format into an array for easier consumption by frontend
    const formattedStats = Object.entries(responseData).map(([vendor, count]) => ({
      vendor_code: vendor,
      count
    }));
    
    // If period is 'all', we need a different structure
    const finalResponse = period === 'all' 
      ? {
        daily: Object.entries(stats.daily).map(([vendor, count]) => ({ vendor_code: vendor, count })),
        weekly: Object.entries(stats.weekly).map(([vendor, count]) => ({ vendor_code: vendor, count })),
        monthly: Object.entries(stats.monthly).map(([vendor, count]) => ({ vendor_code: vendor, count })),
        all_time: Object.entries(stats.all_time).map(([vendor, count]) => ({ vendor_code: vendor, count }))
      } 
      : formattedStats;
    
    // Return the stats
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(finalResponse)
    };
  } catch (error) {
    console.error('Get lead stats error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error retrieving lead statistics' })
    };
  }
}

// Handler for GET /export - Export leads with filtering
async function handleExportLeads(queryParams) {
  try {
    const vendor_code = queryParams?.vendor_code || null;
    const start_date = queryParams?.start_date || null;
    const end_date = queryParams?.end_date || null;
    
    // Build filter expression parts
    let filterExpressionParts = [];
    let expressionAttributeValues = {};
    
    // Start with vendor code filter if provided
    if (vendor_code) {
      // Query using GSI if we're only filtering by vendor
      if (!start_date && !end_date) {
        const params = {
          TableName: LEADS_TABLE,
          IndexName: 'VendorTimestampIndex',
          KeyConditionExpression: 'vendor_code = :vendor_code',
          ExpressionAttributeValues: {
            ':vendor_code': vendor_code
          }
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
      }
      
      // Add to filter parts for scan operation
      filterExpressionParts.push('vendor_code = :vendor_code');
      expressionAttributeValues[':vendor_code'] = vendor_code;
    }
    
    // Add date range filters if provided
    if (start_date && end_date) {
      filterExpressionParts.push('timestamp BETWEEN :start_date AND :end_date');
      expressionAttributeValues[':start_date'] = start_date;
      expressionAttributeValues[':end_date'] = end_date;
    } else if (start_date) {
      filterExpressionParts.push('timestamp >= :start_date');
      expressionAttributeValues[':start_date'] = start_date;
    } else if (end_date) {
      filterExpressionParts.push('timestamp <= :end_date');
      expressionAttributeValues[':end_date'] = end_date;
    }
    
    // Build params for the query
    const params = {
      TableName: LEADS_TABLE
    };
    
    // Add filter expression if we have any filters
    if (filterExpressionParts.length > 0) {
      params.FilterExpression = filterExpressionParts.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
    }
    
    // Execute the scan operation
    const result = await dynamoDB.scan(params).promise();
    
    // Sort by timestamp (newest first)
    const sortedItems = result.Items.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Return the results
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(sortedItems)
    };
  } catch (error) {
    console.error('Export leads error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error exporting leads' })
    };
  }
}

// Handler for GET /vendors - List all vendors
async function handleGetVendors() {
  try {
    const result = await dynamoDB.scan({
      TableName: VENDORS_TABLE
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result.Items)
    };
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error fetching vendors' })
    };
  }
}

// Handler for POST /vendors - Create a new vendor
async function handleCreateVendor(data) {
  try {
    // Generate vendor code if not provided
    const vendor_code = data.vendor_code || generateVendorCode(data.name);
    
    // Generate API key
    const api_key = crypto.randomBytes(16).toString('hex');
    
    // Create timestamp
    const created_at = new Date().toISOString();
    
    // Prepare vendor object
    const vendor = {
      vendor_code,
      name: data.name,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      website: data.website || null,
      api_key,
      status: data.status || 'active',
      created_at,
      updated_at: created_at
    };
    
    // Validate required fields
    if (!vendor.name) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ status: 'error', message: 'Vendor name is required' })
      };
    }
    
    // Store in DynamoDB
    try {
      await dynamoDB.put({
        TableName: VENDORS_TABLE,
        Item: vendor,
        // Ensure vendor_code doesn't already exist
        ConditionExpression: 'attribute_not_exists(vendor_code)'
      }).promise();
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(vendor)
      };
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        // Try again with a new vendor code
        data.vendor_code = generateVendorCode(data.name);
        return handleCreateVendor(data);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating vendor:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error creating vendor' })
    };
  }
}

// Handler for POST /vendors/:vendor_code/regenerate-key - Regenerate API key
async function handleRegenerateApiKey(vendor_code) {
  try {
    // Generate new API key
    const api_key = crypto.randomBytes(16).toString('hex');
    
    // Update vendor in DynamoDB
    await dynamoDB.update({
      TableName: VENDORS_TABLE,
      Key: { vendor_code },
      UpdateExpression: 'set api_key = :api_key, updated_at = :updated_at',
      ExpressionAttributeValues: {
        ':api_key': api_key,
        ':updated_at': new Date().toISOString()
      },
      ConditionExpression: 'attribute_exists(vendor_code)'
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'success', 
        vendor_code,
        api_key,
        message: 'API key regenerated successfully' 
      })
    };
  } catch (error) {
    console.error(`Error regenerating API key for vendor ${vendor_code}:`, error);
    
    if (error.code === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ status: 'error', message: 'Vendor not found' })
      };
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error regenerating API key' })
    };
  }
}

// Generate a unique vendor code
function generateVendorCode(vendorName) {
  // Create a code based on vendor name (first 3 chars) + random string
  const prefix = vendorName
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .substring(0, 3)
    .toUpperCase();
  
  // Add random 5 character string
  const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
  
  return `${prefix}${randomString}`;
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