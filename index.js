const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  ScanCommand,
  UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

const VENDORS_TABLE = process.env.VENDORS_TABLE;
const LEADS_TABLE = process.env.LEADS_TABLE;

// Main handler function for API Gateway
exports.handler = async (event) => {
  try {
    const { httpMethod, path, queryStringParameters, body, pathParameters, headers } = event;
    
    // Check if the endpoint requires authentication
    const requiresAuth = doesEndpointRequireAuth(path, httpMethod);
    
    // If authentication is required, verify the API key
    if (requiresAuth) {
      const authResult = await authenticateRequest(headers);
      if (!authResult.authenticated) {
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            status: 'error', 
            message: authResult.message || 'Unauthorized' 
          })
        };
      }
      
      // Add vendor info to the event for later use
      event.vendor = authResult.vendor;
    }
    
    // Route handler
    if (path === '/leads') {
      if (httpMethod === 'POST') {
        return await handleCreateLead(JSON.parse(body), event.vendor);
      } else if (httpMethod === 'GET') {
        return await handleGetLeads(queryStringParameters, event.vendor);
      }
    } 
    // Handle lead update and get single lead
    else if (path.match(/^\/leads\/[^\/]+$/)) {
      const leadId = pathParameters.lead_id;
      if (httpMethod === 'PATCH') {
        return await handleUpdateLead(leadId, JSON.parse(body), event.vendor);
      } else if (httpMethod === 'GET') {
        return await handleGetLead(leadId, event.vendor);
      }
    }
    // Handle vendor routes
    else if (path === '/vendors') {
      if (httpMethod === 'GET') {
        return await handleGetVendors();
      } else if (httpMethod === 'POST') {
        return await handleCreateVendor(JSON.parse(body));
      }
    } 
    // Handle vendor key regeneration
    else if (path.match(/^\/vendors\/[^\/]+\/regenerate-key$/)) {
      if (httpMethod === 'POST') {
        const vendorCode = pathParameters.vendor_code;
        return await handleRegenerateVendorKey(vendorCode);
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

// Handler for POST /vendors/{vendor_code}/regenerate-key
async function handleRegenerateVendorKey(vendorCode) {
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
        UpdateExpression: 'set api_key = :apiKey',
        ExpressionAttributeValues: {
          ':apiKey': newApiKey
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