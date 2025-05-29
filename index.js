const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  ScanCommand,
  UpdateCommand,
  DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const docusignService = require('./docusign-service');
const authRoutes = require('./auth-routes');

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

const VENDORS_TABLE = process.env.VENDORS_TABLE;
const LEADS_TABLE = process.env.LEADS_TABLE;

// Initialize Cognito Identity Service Provider
const cognitoISP = new AWS.CognitoIdentityServiceProvider();
const USER_POOL_ID = process.env.USER_POOL_ID;

// CORS headers for all responses
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
};

// Helper function to create consistent API responses
function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      ...headers
    },
    body: JSON.stringify(body)
  };
}

// Main handler function for API Gateway
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Extract path and HTTP method
  const path = event.path;
  const httpMethod = event.httpMethod;
  
  console.log(`Processing ${httpMethod} ${path}`);
  
  try {
    // Handle OPTIONS requests (CORS preflight)
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders
      };
    }
    
    // DocuSign webhook callback doesn't need API key auth
    if (path === '/docusign/webhook' && httpMethod === 'POST') {
      return await handleDocusignWebhook(JSON.parse(event.body || '{}'));
    }
    
    // Handle authentication routes
    if (path.startsWith('/auth')) {
      return await handleAuthRoutes(path, httpMethod, event);
    }
    
    // Special admin purge endpoint with hardcoded admin API key
    if (path === '/vendors/purge' && httpMethod === 'DELETE') {
      const apiKey = event.headers['x-api-key'];
      
      // Only allow with admin API key
      if (apiKey === 'fpoI4Uwleh63QVGGsnAUG49W7B8k67g21Gc8glIl') {
        return await handlePurgeVendors();
      } else {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({
            status: 'error',
            message: 'Not authorized to perform this action'
          })
        };
      }
    }

    // For routes that need JWT authentication instead of API key
    if (isJwtProtectedRoute(path)) {
      const authHeader = event.headers.Authorization || event.headers.authorization;
      const authResult = authRoutes.verifyAuthToken(authHeader);
      
      if (!authResult.authenticated) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            status: 'error',
            message: authResult.message || 'Authentication required'
          })
        };
      }
      
      // For admin-only routes, check role
      if (isAdminRoute(path) && authResult.user.role !== 'admin') {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({
            status: 'error',
            message: 'Admin access required'
          })
        };
      }
      
      // Set authenticated user in event for later use
      event.user = authResult.user;
    }
    
    // For other routes requiring API key auth
    if (doesEndpointRequireAuth(path, httpMethod) && !event.user) {
      const vendor = await authenticateRequest(event.headers);
      
      if (!vendor.authenticated) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            status: 'error',
            message: vendor.message
          })
        };
      }
      
      // Set vendor in the event
      event.vendor = vendor.vendor;
    }
    
    // Route handler
    if (path === '/leads') {
      if (httpMethod === 'POST') {
        return await handleCreateLead(JSON.parse(event.body || '{}'), event.vendor);
      } else if (httpMethod === 'GET') {
        return await handleGetLeads(event.queryStringParameters, event.vendor);
      }
    } 
    // Handle lead update and get single lead
    else if (path.match(/^\/leads\/[^\/]+$/)) {
      const leadId = path.split('/')[2]; // Extract lead ID from path
      if (httpMethod === 'PATCH') {
        return await handleUpdateLead(leadId, JSON.parse(event.body || '{}'), event.vendor);
      } else if (httpMethod === 'GET') {
        return await handleGetLead(leadId, event.vendor);
      }
    }
    // Handle sending retainer via DocuSign
    else if (path.match(/^\/leads\/[^\/]+\/send-retainer$/)) {
      const leadId = path.split('/')[2]; // Extract lead ID from path
      if (httpMethod === 'POST') {
        return await handleSendRetainer(leadId, JSON.parse(event.body || '{}'), event.vendor);
      }
    } else if (path === '/stats') {
      if (httpMethod === 'GET') {
        return await handleGetLeadStats(event.queryStringParameters);
      }
    } else if (path === '/export') {
      if (httpMethod === 'GET') {
        return await handleEnhancedExportLeads(event);
      }
    } else if (path === '/vendors') {
      if (httpMethod === 'GET') {
        return await handleGetVendors();
      } else if (httpMethod === 'POST') {
        return await handleCreateVendor(JSON.parse(event.body || '{}'));
      }
    } else if (path.match(/^\/vendors\/[^\/]+\/regenerate-key$/)) {
      if (httpMethod === 'POST') {
        const vendorCode = path.split('/')[2]; // Extract vendor code from path
        return await handleRegenerateApiKey(vendorCode);
      }
    } else if (path === '/admin/force-logout-all') {
      if (httpMethod === 'POST') {
        return await handleForceLogoutAll(event);
      }
    } else if (path === '/admin/analytics/dashboard') {
      if (httpMethod === 'GET') {
        return await handleDashboardAnalytics(event);
      }
    } else if (path === '/admin/analytics/performance') {
      if (httpMethod === 'GET') {
        return await handlePerformanceMetrics(event);
      }
    } else if (path === '/admin/reports/generate') {
      if (httpMethod === 'POST') {
        return await handleGenerateReport(event);
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

// Authentication and authorization helper functions
function doesEndpointRequireAuth(path, method) {
  // Define which endpoints require authentication
  // By default, POST and PATCH operations require auth, GET may not
  if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
    // DocuSign webhook callback doesn't need API key auth
    if (path === '/docusign/webhook') {
      return false;
    }
    return true;
  }
  
  // Specific GET endpoints that require auth
  if (method === 'GET') {
    // Add specific paths that require auth even for GET requests
    const protectedGETPaths = [
      '/leads/sensitive',
      '/admin'
    ];
    
    return protectedGETPaths.some(protectedPath => path.startsWith(protectedPath));
  }
  
  return false;
}

async function authenticateRequest(headers) {
  // Check for API key in headers
  const apiKey = headers['x-api-key'];
  if (!apiKey) {
    return { 
      authenticated: false, 
      message: 'API key is required' 
    };
  }
  
  try {
    // Query the vendors table by API key
    const result = await dynamoDB.send(
      new ScanCommand({
        TableName: VENDORS_TABLE,
        FilterExpression: 'api_key = :apiKey',
        ExpressionAttributeValues: {
          ':apiKey': apiKey
        }
      })
    );
    
    if (!result.Items || result.Items.length === 0) {
      return { 
        authenticated: false, 
        message: 'Invalid API key' 
      };
    }
    
    // Return success with vendor info
    return {
      authenticated: true,
      vendor: result.Items[0]
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { 
      authenticated: false, 
      message: 'Error during authentication' 
    };
  }
}

// Handler for POST /leads
async function handleCreateLead(data, vendor) {
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
    const vendorResult = await dynamoDB.send(
      new GetCommand({
        TableName: VENDORS_TABLE,
        Key: { vendor_code: data.vendor_code }
      })
    );
    
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

  // Check for duplicate email
  try {
    const emailCheckResult = await dynamoDB.send(
      new QueryCommand({
        TableName: LEADS_TABLE,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': data.email
        }
      })
    );
    
    if (emailCheckResult.Items && emailCheckResult.Items.length > 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'A lead with this email already exists' 
        })
      };
    }
  } catch (error) {
    console.error('Email duplicate check error:', error);
  }

  // Check for duplicate phone
  try {
    const phoneCheckResult = await dynamoDB.send(
      new QueryCommand({
        TableName: LEADS_TABLE,
        IndexName: 'PhoneIndex',
        KeyConditionExpression: 'phone_home = :phone',
        ExpressionAttributeValues: {
          ':phone': data.phone_home
        }
      })
    );
    
    if (phoneCheckResult.Items && phoneCheckResult.Items.length > 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'A lead with this phone number already exists' 
        })
      };
    }
  } catch (error) {
    console.error('Phone duplicate check error:', error);
  }

  // Generate lead ID and timestamp
  const lead_id = uuidv4();
  const timestamp = new Date().toISOString();
  
  // Store lead in DynamoDB
  const lead = {
    ...data,
    lead_id,
    timestamp,
    disposition: "New",
    notes: "",
    updated_at: timestamp,
    checklist_data: data.checklist_data || {},
    update_history: [{
      timestamp,
      action: "created",
      disposition: "New",
      notes: ""
    }]
  };
  
  try {
    await dynamoDB.send(
      new PutCommand({
        TableName: LEADS_TABLE,
        Item: lead
      })
    );
    
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

// Handler for GET /leads
async function handleGetLeads(queryParams, vendor) {
  try {
    // If vendor is provided, use that vendor_code
    // Otherwise, use the query parameter vendor_code if available
    const vendor_code = (vendor && vendor.vendor_code !== 'ADMIN') 
      ? vendor.vendor_code 
      : (queryParams ? queryParams.vendor_code : null);
    
    if (vendor_code) {
      // Query by vendor_code using GSI
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: LEADS_TABLE,
          IndexName: 'VendorTimestampIndex',
          KeyConditionExpression: 'vendor_code = :vendor_code',
          ExpressionAttributeValues: {
            ':vendor_code': vendor_code
          },
          ScanIndexForward: false // Sort by timestamp descending
        })
      );
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result.Items)
      };
    } else {
      // Only allow admins to get all leads
      if (vendor && vendor.vendor_code !== 'ADMIN') {
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            status: 'error',
            message: 'You must specify vendor_code or be an admin to list all leads'
          })
        };
      }
      
      // Get all leads for admin
      const result = await dynamoDB.send(
        new ScanCommand({
          TableName: LEADS_TABLE
        })
      );
      
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
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: LEADS_TABLE,
          IndexName: 'VendorTimestampIndex',
          KeyConditionExpression: 'vendor_code = :vendor_code',
          ExpressionAttributeValues: {
            ':vendor_code': vendorCode
          }
        })
      );
      leads = result.Items;
    } else {
      // Get all leads
      const result = await dynamoDB.send(
        new ScanCommand({
          TableName: LEADS_TABLE
        })
      );
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
async function handleEnhancedExportLeads(event) {
  try {
    const vendor_code = event.queryStringParameters?.vendor_code || null;
    const start_date = event.queryStringParameters?.start_date || null;
    const end_date = event.queryStringParameters?.end_date || null;
    
    // Build filter expression parts
    let filterExpressionParts = [];
    let expressionAttributeValues = {};
    
    // Start with vendor code filter if provided
    if (vendor_code) {
      // Query using GSI if we're only filtering by vendor
      if (!start_date && !end_date) {
        const result = await dynamoDB.send(
          new QueryCommand({
            TableName: LEADS_TABLE,
            IndexName: 'VendorTimestampIndex',
            KeyConditionExpression: 'vendor_code = :vendor_code',
            ExpressionAttributeValues: {
              ':vendor_code': vendor_code
            }
          })
        );
        
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
    const result = await dynamoDB.send(
      new ScanCommand(params)
    );
    
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

// Handler for GET /vendors
async function handleGetVendors() {
  try {
    const result = await dynamoDB.send(
      new ScanCommand({
        TableName: VENDORS_TABLE
      })
    );
    
    // Remove API keys from the response for security
    const vendorsWithoutKeys = result.Items.map(vendor => {
      const { api_key, ...vendorWithoutKey } = vendor;
      return vendorWithoutKey;
    });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(vendorsWithoutKeys)
    };
  } catch (error) {
    console.error('Get vendors error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error retrieving vendors' })
    };
  }
}

// Handler for POST /vendors
async function handleCreateVendor(data) {
  // Validate vendor data
  if (!data.vendor_code || !data.name) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'error', 
        message: 'Vendor code and name are required' 
      })
    };
  }
  
  // Check if vendor already exists
  try {
    const existingVendor = await dynamoDB.send(
      new GetCommand({
        TableName: VENDORS_TABLE,
        Key: { vendor_code: data.vendor_code }
      })
    );
    
    if (existingVendor.Item) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'Vendor code already exists' 
        })
      };
    }
  } catch (error) {
    console.error('Vendor check error:', error);
  }
  
  // Generate API key
  const apiKey = generateApiKey();
  
  // Create vendor record
  const vendor = {
    vendor_code: data.vendor_code,
    name: data.name,
    description: data.description || '',
    api_key: apiKey,
    created_at: new Date().toISOString()
  };
  
  try {
    await dynamoDB.send(
      new PutCommand({
        TableName: VENDORS_TABLE,
        Item: vendor
      })
    );
    
    // Return vendor data including the API key
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'success',
        vendor: vendor,
        message: 'Vendor created successfully'
      })
    };
  } catch (error) {
    console.error('Create vendor error:', error);
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

// Handler for POST /vendors/{vendor_code}/regenerate-key
async function handleRegenerateApiKey(vendorCode) {
  // Check if vendor exists
  try {
    const existingVendor = await dynamoDB.send(
      new GetCommand({
        TableName: VENDORS_TABLE,
        Key: { vendor_code: vendorCode }
      })
    );
    
    if (!existingVendor.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'Vendor not found' 
        })
      };
    }
    
    // Generate new API key
    const newApiKey = generateApiKey();
    
    // Update vendor with new API key
    await dynamoDB.send(
      new UpdateCommand({
        TableName: VENDORS_TABLE,
        Key: { vendor_code: vendorCode },
        UpdateExpression: 'set api_key = :apiKey, updated_at = :updated_at',
        ExpressionAttributeValues: {
          ':apiKey': newApiKey,
          ':updated_at': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      })
    );
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'success',
        api_key: newApiKey,
        message: 'API key regenerated successfully'
      })
    };
  } catch (error) {
    console.error('Regenerate API key error:', error);
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

// Helper function to generate API keys
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Handler for PATCH /leads/{lead_id}
async function handleUpdateLead(leadId, data, vendor) {
  // Check if lead exists
  try {
    const leadResult = await dynamoDB.send(
      new GetCommand({
        TableName: LEADS_TABLE,
        Key: { lead_id: leadId }
      })
    );
    
    if (!leadResult.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'Lead not found' 
        })
      };
    }

    // If vendor information is available, check if this vendor owns the lead
    if (vendor && vendor.vendor_code !== 'ADMIN' && leadResult.Item.vendor_code !== vendor.vendor_code) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'You do not have permission to update this lead' 
        })
      };
    }

    // Update lead with new disposition, notes, and checklist data
    const updated_at = new Date().toISOString();
    
    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    // Always update updated_at
    updateExpression.push('#updated_at = :updated_at');
    expressionAttributeValues[':updated_at'] = updated_at;
    expressionAttributeNames['#updated_at'] = 'updated_at';
    
    // Update disposition if provided
    if (data.disposition !== undefined) {
      updateExpression.push('#disposition = :disposition');
      expressionAttributeValues[':disposition'] = data.disposition;
      expressionAttributeNames['#disposition'] = 'disposition';
    }
    
    // Update notes if provided
    if (data.notes !== undefined) {
      updateExpression.push('#notes = :notes');
      expressionAttributeValues[':notes'] = data.notes;
      expressionAttributeNames['#notes'] = 'notes';
    }
    
    // Update checklist_data if provided
    if (data.checklist_data !== undefined) {
      updateExpression.push('#checklist_data = :checklist_data');
      expressionAttributeValues[':checklist_data'] = data.checklist_data;
      expressionAttributeNames['#checklist_data'] = 'checklist_data';
    }
    
    // Add to update history
    const historyEntry = {
      timestamp: updated_at,
      action: "updated",
      disposition: data.disposition || leadResult.Item.disposition,
      notes: data.notes || leadResult.Item.notes
    };
    
    // If checklist data was updated, add that to the history entry
    if (data.checklist_data) {
      historyEntry.checklist_updated = true;
    }
    
    const currentHistory = leadResult.Item.update_history || [];
    updateExpression.push('#update_history = :update_history');
    expressionAttributeValues[':update_history'] = [...currentHistory, historyEntry];
    expressionAttributeNames['#update_history'] = 'update_history';

    // Ensure we have something to update
    if (updateExpression.length <= 1) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'No valid fields to update' 
        })
      };
    }

    const params = {
      TableName: LEADS_TABLE,
      Key: { lead_id: leadId },
      UpdateExpression: 'SET ' + updateExpression.join(', '),
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDB.send(new UpdateCommand(params));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'success',
        lead: result.Attributes,
        message: 'Lead updated successfully'
      })
    };
  } catch (error) {
    console.error('Update lead error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error updating lead' })
    };
  }
}

// Handler for GET /leads/{lead_id}
async function handleGetLead(leadId, vendor) {
  try {
    // Get the lead from DynamoDB
    const result = await dynamoDB.send(
      new GetCommand({
        TableName: LEADS_TABLE,
        Key: { lead_id: leadId }
      })
    );

    // Check if lead exists
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'Lead not found' 
        })
      };
    }

    // If vendor information is available, check if this vendor owns the lead
    if (vendor && vendor.vendor_code !== 'ADMIN' && result.Item.vendor_code !== vendor.vendor_code) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'You do not have permission to view this lead' 
        })
      };
    }

    // Return the lead data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'success',
        lead: result.Item
      })
    };
  } catch (error) {
    console.error('Get lead error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ status: 'error', message: 'Error retrieving lead' })
    };
  }
}

// Handler for sending a retainer agreement via DocuSign
async function handleSendRetainer(leadId, data, vendor) {
  try {
    // Check if lead exists and belongs to this vendor
    const leadResult = await dynamoDB.send(
      new GetCommand({
        TableName: LEADS_TABLE,
        Key: { lead_id: leadId }
      })
    );
    
    if (!leadResult.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'Lead not found' 
        })
      };
    }
    
    // Check vendor permissions (only allow if ADMIN or owner)
    if (vendor.vendor_code !== 'ADMIN' && leadResult.Item.vendor_code !== vendor.vendor_code) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'You do not have permission to send a retainer for this lead' 
        })
      };
    }
    
    // Check if a retainer has already been sent
    if (leadResult.Item.docusign_info && leadResult.Item.docusign_info.envelopeId) {
      // Determine if a new one should be sent based on options
      if (!data.force && leadResult.Item.docusign_info.status !== 'voided') {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            status: 'error', 
            message: 'A retainer agreement has already been sent. Use force=true to send another.' 
          })
        };
      }
    }
    
    // Send the retainer via DocuSign service
    const options = {
      sendNow: data.sendNow !== false, // Default to true
      emailSubject: data.emailSubject,
      emailBlurb: data.emailBlurb
    };
    
    const result = await docusignService.sendRetainer(leadId, options);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'success',
        envelopeId: result.envelopeId,
        message: 'Retainer agreement sent successfully' 
      })
    };
  } catch (error) {
    console.error('Send retainer error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'error', 
        message: 'Error sending retainer agreement' 
      })
    };
  }
}

// Handler for DocuSign webhook callback
async function handleDocusignWebhook(data) {
  try {
    // Validate the webhook payload
    if (!data || !data.envelopeId || !data.status) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'Invalid webhook payload' 
        })
      };
    }
    
    // Process the webhook
    const result = await docusignService.handleStatusCallback(data);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'success',
        message: 'Webhook processed successfully'
      })
    };
  } catch (error) {
    console.error('DocuSign webhook error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'error', 
        message: 'Error processing DocuSign webhook' 
      })
    };
  }
}

// Add a new function to purge all vendors
async function handlePurgeVendors() {
  try {
    // Scan the vendors table to get all vendor codes
    const vendorsResult = await dynamoDB.send(
      new ScanCommand({
        TableName: VENDORS_TABLE
      })
    );
    
    const vendors = vendorsResult.Items || [];
    console.log(`Found ${vendors.length} vendors to purge`);
    
    // Delete each vendor one by one
    for (const vendor of vendors) {
      await dynamoDB.send(
        new DeleteCommand({
          TableName: VENDORS_TABLE,
          Key: { vendor_code: vendor.vendor_code }
        })
      );
      console.log(`Deleted vendor: ${vendor.vendor_code}`);
    }
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'success',
        message: `Successfully purged ${vendors.length} vendors`
      })
    };
  } catch (error) {
    console.error('Error purging vendors:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'error',
        message: 'Error purging vendors'
      })
    };
  }
}

// Handle authentication routes
async function handleAuthRoutes(path, httpMethod, event) {
  // Check if path matches one of our auth endpoints
  const authPattern = /^\/auth\/(.+)$/;
  const match = path.match(authPattern);
  
  if (!match) {
    return createResponse(404, { status: 'error', message: 'Auth endpoint not found' });
  }
  
  const authPath = match[1];
  
  // Handle get-username endpoint
  if (authPath === 'get-username' && httpMethod === 'POST') {
    const getUsernameHandler = require('./get-username-by-email');
    return await getUsernameHandler.handler(event);
  }
  
  // Handle forgot-password endpoint
  if (authPath === 'forgot-password' && httpMethod === 'POST') {
    const forgotPasswordHandler = require('./forgot-password-handler');
    return await forgotPasswordHandler.handler(event);
  }
  
  // Handle confirm-forgot-password endpoint
  if (authPath === 'confirm-forgot-password' && httpMethod === 'POST') {
    const confirmForgotPasswordHandler = require('./confirm-forgot-password');
    return await confirmForgotPasswordHandler.handler(event);
  }
  
  // Handle confirm endpoint (password reset confirmation)
  if (authPath === 'confirm' && httpMethod === 'POST') {
    const confirmForgotPasswordHandler = require('./confirm-forgot-password');
    return await confirmForgotPasswordHandler.handler(event);
  }
  
  // Handle login
  if (authPath === 'login' && httpMethod === 'POST') {
    return authRoutes.handleLogin(event);
  }
  
  // Handle user registration (admin only)
  if (authPath === 'register' && httpMethod === 'POST') {
    return authRoutes.handleRegister(event);
  }
  
  // Handle reset token verification
  if (authPath === 'verify-reset-token' && httpMethod === 'GET') {
    return authRoutes.handleVerifyResetToken(event);
  }
  
  // Handle password reset
  if (authPath === 'reset-password' && httpMethod === 'POST') {
    return authRoutes.handleResetPassword(event);
  }
  
  // Handle user listing (admin only)
  if (authPath === 'users' && httpMethod === 'GET') {
    return authRoutes.handleListUsers(event);
  }
  
  // Handle getting a specific user
  const userMatch = authPath.match(/^users\/([^\/]+)$/);
  if (userMatch && httpMethod === 'GET') {
    event.pathParameters = { username: userMatch[1] };
    return authRoutes.handleGetUser(event);
  }
  
  // Handle updating a specific user
  if (userMatch && httpMethod === 'PATCH') {
    event.pathParameters = { username: userMatch[1] };
    return authRoutes.handleUpdateUser(event);
  }
  
  // Handle password change
  const passwordChangeMatch = authPath.match(/^users\/([^\/]+)\/change-password$/);
  if (passwordChangeMatch && httpMethod === 'POST') {
    event.pathParameters = { username: passwordChangeMatch[1] };
    return authRoutes.handleChangePassword(event);
  }
  
  // Auth endpoint not found
  return createResponse(404, { status: 'error', message: 'Auth endpoint not found' });
}

// Handler for forcing logout of all users (admin only)
async function handleForceLogoutAll(event) {
  try {
    // Check if user is authenticated and has admin role
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authResult = authRoutes.verifyAuthToken(authHeader);
    
    if (!authResult.authenticated) {
      return createResponse(401, {
        status: 'error',
        message: authResult.message || 'Authentication required'
      });
    }
    
    // Check if user has admin role
    if (authResult.user.role !== 'admin') {
      return createResponse(403, {
        status: 'error',
        message: 'Admin access required'
      });
    }

    // Get all users from Cognito User Pool
    const listParams = {
      UserPoolId: USER_POOL_ID,
      Limit: 60
    };
    
    const users = await cognitoISP.listUsers(listParams).promise();
    const logoutPromises = [];
    
    console.log(`Found ${users.Users.length} users to force logout`);
    
    // Force logout each user using adminUserGlobalSignOut
    for (const user of users.Users) {
      const logoutParams = {
        UserPoolId: USER_POOL_ID,
        Username: user.Username
      };
      
      logoutPromises.push(
        cognitoISP.adminUserGlobalSignOut(logoutParams).promise()
          .then(() => {
            console.log(`Successfully logged out user: ${user.Username}`);
            return { username: user.Username, success: true };
          })
          .catch(err => {
            console.log(`Failed to logout ${user.Username}:`, err.message);
            return { username: user.Username, success: false, error: err.message };
          })
      );
    }
    
    const results = await Promise.all(logoutPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return createResponse(200, {
      status: 'success',
      message: `Force logout completed`,
      details: {
        total_users: users.Users.length,
        successful_logouts: successful,
        failed_logouts: failed,
        results: results
      }
    });
    
  } catch (error) {
    console.error('Error forcing logout all users:', error);
    return createResponse(500, {
      status: 'error',
      message: 'Failed to force logout users',
      error: error.message
    });
  }
}

// Helper function to determine if a route requires JWT authentication
function isJwtProtectedRoute(path) {
  // Add routes that require authentication here
  // Exclude login, register, and password recovery endpoints
  return !path.match(/^\/auth\/(login|register|forgot-password|verify-reset-token|reset-password)$/);
}

// Helper function to determine if a route requires admin role
function isAdminRoute(path) {
  // Routes that require admin access
  return path.match(/^\/auth\/users\/?$/) || // List all users
         path.match(/^\/auth\/register\/?$/) || // Register new users
         path.match(/^\/admin\/analytics\//) || // Analytics endpoints
         path.match(/^\/admin\/reports\//) || // Reports endpoints
         path.match(/^\/admin\/force-logout-all\/?$/); // Force logout endpoint
}

// Handler for GET /admin/analytics/dashboard
async function handleDashboardAnalytics(event) {
  try {
    // Check if user is authenticated and has admin role
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authResult = authRoutes.verifyAuthToken(authHeader);
    
    if (!authResult.authenticated) {
      return createResponse(401, {
        status: 'error',
        message: authResult.message || 'Authentication required'
      });
    }
    
    if (authResult.user.role !== 'admin') {
      return createResponse(403, {
        status: 'error',
        message: 'Admin access required'
      });
    }

    // Get all leads for analytics
    const leadsResult = await dynamoDB.send(new ScanCommand({ TableName: LEADS_TABLE }));
    const leads = leadsResult.Items || [];
    
    // Get all vendors for analytics
    const vendorsResult = await dynamoDB.send(new ScanCommand({ TableName: VENDORS_TABLE }));
    const vendors = vendorsResult.Items || [];

    // Calculate time periods
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - 7);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Helper function to filter leads by date
    const filterLeadsByDate = (leads, fromDate, toDate = null) => {
      return leads.filter(lead => {
        if (!lead.timestamp) return false;
        const leadDate = new Date(lead.timestamp);
        if (toDate) {
          return leadDate >= fromDate && leadDate < toDate;
        }
        return leadDate >= fromDate;
      });
    };

    // Calculate metrics
    const todayLeads = filterLeadsByDate(leads, today);
    const yesterdayLeads = filterLeadsByDate(leads, yesterday, today);
    const thisWeekLeads = filterLeadsByDate(leads, thisWeek);
    const thisMonthLeads = filterLeadsByDate(leads, thisMonth);
    const lastMonthLeads = filterLeadsByDate(leads, lastMonth, thisMonth);

    // Lead disposition breakdown
    const dispositionStats = leads.reduce((acc, lead) => {
      const disposition = lead.disposition || 'Unknown';
      acc[disposition] = (acc[disposition] || 0) + 1;
      return acc;
    }, {});

    // Vendor performance
    const vendorStats = leads.reduce((acc, lead) => {
      const vendor = lead.vendor_code || 'Unknown';
      if (!acc[vendor]) {
        acc[vendor] = { total: 0, new: 0, completed: 0, in_progress: 0 };
      }
      acc[vendor].total++;
      
      const disposition = lead.disposition?.toLowerCase() || 'new';
      if (disposition === 'new') acc[vendor].new++;
      else if (disposition === 'completed') acc[vendor].completed++;
      else acc[vendor].in_progress++;
      
      return acc;
    }, {});

    // Response data
    const dashboardData = {
      overview: {
        total_leads: leads.length,
        total_vendors: vendors.length,
        today_leads: todayLeads.length,
        yesterday_leads: yesterdayLeads.length,
        week_leads: thisWeekLeads.length,
        month_leads: thisMonthLeads.length,
        last_month_leads: lastMonthLeads.length,
        growth_rate: lastMonthLeads.length > 0 
          ? Math.round(((thisMonthLeads.length - lastMonthLeads.length) / lastMonthLeads.length) * 100)
          : 100
      },
      disposition_breakdown: dispositionStats,
      vendor_performance: vendorStats,
      recent_activity: leads
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
        .map(lead => ({
          lead_id: lead.lead_id,
          vendor_code: lead.vendor_code,
          disposition: lead.disposition,
          timestamp: lead.timestamp,
          email: lead.email
        }))
    };

    return createResponse(200, {
      status: 'success',
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return createResponse(500, {
      status: 'error',
      message: 'Error retrieving dashboard analytics',
      error: error.message
    });
  }
}

// Handler for GET /admin/analytics/performance
async function handlePerformanceMetrics(event) {
  try {
    // Check authentication
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authResult = authRoutes.verifyAuthToken(authHeader);
    
    if (!authResult.authenticated || authResult.user.role !== 'admin') {
      return createResponse(401, {
        status: 'error',
        message: 'Admin authentication required'
      });
    }

    const queryParams = event.queryStringParameters || {};
    const days = parseInt(queryParams.days) || 30;
    const vendor_code = queryParams.vendor_code || null;

    // Get leads data
    let leads;
    if (vendor_code) {
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: LEADS_TABLE,
          IndexName: 'VendorTimestampIndex',
          KeyConditionExpression: 'vendor_code = :vendor_code',
          ExpressionAttributeValues: { ':vendor_code': vendor_code }
        })
      );
      leads = result.Items || [];
    } else {
      const result = await dynamoDB.send(new ScanCommand({ TableName: LEADS_TABLE }));
      leads = result.Items || [];
    }

    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filteredLeads = leads.filter(lead => {
      if (!lead.timestamp) return false;
      return new Date(lead.timestamp) >= cutoffDate;
    });

    // Daily performance breakdown
    const dailyStats = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = { leads: 0, completed: 0, conversion_rate: 0 };
    }

    filteredLeads.forEach(lead => {
      const dateStr = lead.timestamp.split('T')[0];
      if (dailyStats[dateStr]) {
        dailyStats[dateStr].leads++;
        if (lead.disposition === 'completed') {
          dailyStats[dateStr].completed++;
        }
      }
    });

    // Calculate conversion rates
    Object.keys(dailyStats).forEach(date => {
      const stats = dailyStats[date];
      stats.conversion_rate = stats.leads > 0 
        ? Math.round((stats.completed / stats.leads) * 100) 
        : 0;
    });

    // Average response time (simulated for now)
    const avgResponseTime = Math.round(Math.random() * 300 + 120); // 2-7 minutes

    // Top performing vendors
    const vendorPerformance = filteredLeads.reduce((acc, lead) => {
      const vendor = lead.vendor_code || 'Unknown';
      if (!acc[vendor]) {
        acc[vendor] = { total: 0, completed: 0, revenue: 0 };
      }
      acc[vendor].total++;
      if (lead.disposition === 'completed') {
        acc[vendor].completed++;
        acc[vendor].revenue += parseFloat(lead.lead_value || 0);
      }
      return acc;
    }, {});

    const topVendors = Object.entries(vendorPerformance)
      .map(([vendor, stats]) => ({
        vendor_code: vendor,
        total_leads: stats.total,
        completed_leads: stats.completed,
        conversion_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.conversion_rate - a.conversion_rate)
      .slice(0, 10);

    const performanceData = {
      date_range: {
        from: cutoffDate.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
        days: days
      },
      summary: {
        total_leads: filteredLeads.length,
        completed_leads: filteredLeads.filter(l => l.disposition === 'completed').length,
        overall_conversion_rate: filteredLeads.length > 0 
          ? Math.round((filteredLeads.filter(l => l.disposition === 'completed').length / filteredLeads.length) * 100)
          : 0,
        avg_response_time_minutes: avgResponseTime,
        total_revenue: filteredLeads
          .filter(l => l.disposition === 'completed')
          .reduce((sum, l) => sum + parseFloat(l.lead_value || 0), 0)
      },
      daily_breakdown: Object.entries(dailyStats)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .map(([date, stats]) => ({ date, ...stats })),
      top_vendors: topVendors
    };

    return createResponse(200, {
      status: 'success',
      data: performanceData
    });

  } catch (error) {
    console.error('Performance metrics error:', error);
    return createResponse(500, {
      status: 'error',
      message: 'Error retrieving performance metrics',
      error: error.message
    });
  }
}

// Handler for POST /admin/reports/generate
async function handleGenerateReport(event) {
  try {
    // Check authentication
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authResult = authRoutes.verifyAuthToken(authHeader);
    
    if (!authResult.authenticated || authResult.user.role !== 'admin') {
      return createResponse(401, {
        status: 'error',
        message: 'Admin authentication required'
      });
    }

    const requestBody = JSON.parse(event.body || '{}');
    const {
      report_type = 'summary',
      date_range = {},
      vendor_codes = [],
      format = 'json',
      include_details = false
    } = requestBody;

    // Validate report type
    const validReportTypes = ['summary', 'detailed', 'vendor_performance', 'conversion_analysis'];
    if (!validReportTypes.includes(report_type)) {
      return createResponse(400, {
        status: 'error',
        message: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`
      });
    }

    // Get date range
    const startDate = date_range.start ? new Date(date_range.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = date_range.end ? new Date(date_range.end) : new Date();

    // Fetch leads data
    let leads;
    if (vendor_codes.length > 0) {
      // Get leads for specific vendors
      const promises = vendor_codes.map(vendor_code =>
        dynamoDB.send(new QueryCommand({
          TableName: LEADS_TABLE,
          IndexName: 'VendorTimestampIndex',
          KeyConditionExpression: 'vendor_code = :vendor_code',
          ExpressionAttributeValues: { ':vendor_code': vendor_code }
        }))
      );
      const results = await Promise.all(promises);
      leads = results.flatMap(result => result.Items || []);
    } else {
      const result = await dynamoDB.send(new ScanCommand({ TableName: LEADS_TABLE }));
      leads = result.Items || [];
    }

    // Filter by date range
    const filteredLeads = leads.filter(lead => {
      if (!lead.timestamp) return false;
      const leadDate = new Date(lead.timestamp);
      return leadDate >= startDate && leadDate <= endDate;
    });

    // Generate report based on type
    let reportData;
    
    switch (report_type) {
      case 'summary':
        reportData = generateSummaryReport(filteredLeads);
        break;
      case 'detailed':
        reportData = generateDetailedReport(filteredLeads, include_details);
        break;
      case 'vendor_performance':
        reportData = generateVendorPerformanceReport(filteredLeads);
        break;
      case 'conversion_analysis':
        reportData = generateConversionAnalysisReport(filteredLeads);
        break;
    }

    const report = {
      report_id: uuidv4(),
      generated_at: new Date().toISOString(),
      generated_by: authResult.user.username || 'admin',
      report_type,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      vendor_codes: vendor_codes.length > 0 ? vendor_codes : ['ALL'],
      format,
      data: reportData
    };

    return createResponse(200, {
      status: 'success',
      report
    });

  } catch (error) {
    console.error('Generate report error:', error);
    return createResponse(500, {
      status: 'error',
      message: 'Error generating report',
      error: error.message
    });
  }
}

// Helper functions for report generation
function generateSummaryReport(leads) {
  const totalLeads = leads.length;
  const completedLeads = leads.filter(l => l.disposition === 'completed').length;
  const newLeads = leads.filter(l => l.disposition === 'New' || l.disposition === 'new').length;
  
  return {
    total_leads: totalLeads,
    completed_leads: completedLeads,
    new_leads: newLeads,
    conversion_rate: totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0,
    total_revenue: leads
      .filter(l => l.disposition === 'completed')
      .reduce((sum, l) => sum + parseFloat(l.lead_value || 0), 0),
    unique_vendors: [...new Set(leads.map(l => l.vendor_code))].length
  };
}

function generateDetailedReport(leads, includeDetails) {
  const summary = generateSummaryReport(leads);
  
  const vendorBreakdown = leads.reduce((acc, lead) => {
    const vendor = lead.vendor_code || 'Unknown';
    if (!acc[vendor]) {
      acc[vendor] = { total: 0, completed: 0, new: 0, revenue: 0 };
    }
    acc[vendor].total++;
    if (lead.disposition === 'completed') {
      acc[vendor].completed++;
      acc[vendor].revenue += parseFloat(lead.lead_value || 0);
    }
    if (lead.disposition === 'New' || lead.disposition === 'new') {
      acc[vendor].new++;
    }
    return acc;
  }, {});

  const report = {
    summary,
    vendor_breakdown: vendorBreakdown
  };

  if (includeDetails) {
    report.leads = leads.map(lead => ({
      lead_id: lead.lead_id,
      vendor_code: lead.vendor_code,
      disposition: lead.disposition,
      timestamp: lead.timestamp,
      email: lead.email,
      lead_value: lead.lead_value
    }));
  }

  return report;
}

function generateVendorPerformanceReport(leads) {
  const vendorStats = leads.reduce((acc, lead) => {
    const vendor = lead.vendor_code || 'Unknown';
    if (!acc[vendor]) {
      acc[vendor] = {
        total_leads: 0,
        completed_leads: 0,
        revenue: 0,
        avg_lead_value: 0,
        recent_leads: []
      };
    }
    
    acc[vendor].total_leads++;
    if (lead.disposition === 'completed') {
      acc[vendor].completed_leads++;
      acc[vendor].revenue += parseFloat(lead.lead_value || 0);
    }
    
    acc[vendor].recent_leads.push({
      timestamp: lead.timestamp,
      disposition: lead.disposition,
      value: lead.lead_value
    });
    
    return acc;
  }, {});

  // Calculate averages and sort recent leads
  Object.keys(vendorStats).forEach(vendor => {
    const stats = vendorStats[vendor];
    stats.conversion_rate = stats.total_leads > 0 
      ? Math.round((stats.completed_leads / stats.total_leads) * 100) 
      : 0;
    stats.avg_lead_value = stats.completed_leads > 0 
      ? Math.round(stats.revenue / stats.completed_leads) 
      : 0;
    stats.recent_leads = stats.recent_leads
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
  });

  return {
    vendor_performance: vendorStats,
    top_performers: Object.entries(vendorStats)
      .sort(([,a], [,b]) => b.conversion_rate - a.conversion_rate)
      .slice(0, 5)
      .map(([vendor, stats]) => ({ vendor, ...stats }))
  };
}

function generateConversionAnalysisReport(leads) {
  // Time-based conversion analysis
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentLeads = leads.filter(lead => new Date(lead.timestamp) >= thirtyDaysAgo);
  
  // Conversion funnel
  const funnelStages = {
    'New': leads.filter(l => l.disposition === 'New' || l.disposition === 'new').length,
    'Contacted': leads.filter(l => l.disposition === 'contacted').length,
    'Qualified': leads.filter(l => l.disposition === 'qualified').length,
    'Completed': leads.filter(l => l.disposition === 'completed').length
  };

  // Time to conversion analysis
  const completedLeads = leads.filter(l => l.disposition === 'completed');
  const timeToConversion = completedLeads.map(lead => {
    // Simulate time to conversion (in hours)
    return Math.round(Math.random() * 168); // 0-7 days
  });

  const avgTimeToConversion = timeToConversion.length > 0 
    ? Math.round(timeToConversion.reduce((sum, time) => sum + time, 0) / timeToConversion.length)
    : 0;

  return {
    conversion_funnel: funnelStages,
    conversion_rates: {
      overall: leads.length > 0 ? Math.round((funnelStages.Completed / leads.length) * 100) : 0,
      recent_30_days: recentLeads.length > 0 
        ? Math.round((recentLeads.filter(l => l.disposition === 'completed').length / recentLeads.length) * 100)
        : 0
    },
    time_analysis: {
      avg_time_to_conversion_hours: avgTimeToConversion,
      avg_time_to_conversion_days: Math.round(avgTimeToConversion / 24),
      fastest_conversion_hours: timeToConversion.length > 0 ? Math.min(...timeToConversion) : 0,
      slowest_conversion_hours: timeToConversion.length > 0 ? Math.max(...timeToConversion) : 0
    },
    trends: {
      monthly_conversion_trend: 'stable', // Could be calculated based on historical data
      peak_conversion_hours: [9, 10, 11, 14, 15], // Business hours
      best_performing_days: ['Tuesday', 'Wednesday', 'Thursday']
    }
  };
} 