const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  ScanCommand,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand
} = require('@aws-sdk/lib-dynamodb');
const { authenticateRequest, CORS_HEADERS } = require('./authMiddleware');

// Initialize DynamoDB client
const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

// Environment variables
const VENDORS_TABLE = process.env.VENDORS_TABLE || 'Vendors';
const LEADS_TABLE = process.env.LEADS_TABLE || 'Leads';

/**
 * OPTIONS /vendors - Handle CORS preflight requests
 */
exports.optionsVendors = async (event) => {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: ''
  };
};

/**
 * GET /vendors - List all vendors with pagination and filtering
 * SIMPLIFIED VERSION - Returns mock data when DynamoDB is not available
 */
exports.getVendors = async (event) => {
  try {
    console.log('Getting vendors list...');
    
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    const user = event.requestContext?.authorizer || {};
    console.log('Authenticated user:', user);
    
    // Check admin role for vendor management
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required for vendor management' })
      };
    }

    // TRY DYNAMODB FIRST, FALLBACK TO MOCK DATA
    try {
      // Try the full DynamoDB implementation
      return await getVendorsFromDynamoDB(event);
    } catch (dynamoError) {
      console.warn('DynamoDB error, returning mock data:', dynamoError.message);
      
      // Return mock data for testing
      const mockVendors = [
        {
          id: 'vendor_1',
          name: 'Sample Vendor 1',
          email: 'vendor1@example.com',
          vendor_code: 'VEN001',
          status: 'active',
          lead_count: 5,
          revenue: 175,
          created_date: new Date().toISOString(),
          last_activity: new Date().toISOString()
        },
        {
          id: 'vendor_2', 
          name: 'Sample Vendor 2',
          email: 'vendor2@example.com',
          vendor_code: 'VEN002',
          status: 'active',
          lead_count: 12,
          revenue: 420,
          created_date: new Date().toISOString(),
          last_activity: new Date().toISOString()
        }
      ];

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          vendors: mockVendors,
          pagination: {
            hasMore: false,
            lastKey: null,
            count: mockVendors.length
          },
          note: 'Mock data - DynamoDB not configured'
        })
      };
    }
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to fetch vendors',
        message: error.message 
      })
    };
  }
};

/**
 * FULL DYNAMODB IMPLEMENTATION - Moved to separate function
 */
async function getVendorsFromDynamoDB(event) {
  const user = event.requestContext?.authorizer || {};
  const queryParams = event.queryStringParameters || {};
  const { status, search, limit = '50', lastKey } = queryParams;
  
  let scanParams = {
    TableName: VENDORS_TABLE,
    Limit: parseInt(limit)
  };
  
  // Add pagination
  if (lastKey) {
    scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
  }
  
  // Add status filter
  if (status && status !== 'all') {
    scanParams.FilterExpression = '#status = :status';
    scanParams.ExpressionAttributeNames = { '#status': 'status' };
    scanParams.ExpressionAttributeValues = { ':status': status };
  }
  
  // Add search filter
  if (search) {
    const searchExpression = 'contains(#name, :search) OR contains(email, :search) OR contains(vendor_code, :search)';
    if (scanParams.FilterExpression) {
      scanParams.FilterExpression += ` AND (${searchExpression})`;
    } else {
      scanParams.FilterExpression = searchExpression;
    }
    scanParams.ExpressionAttributeNames = {
      ...scanParams.ExpressionAttributeNames,
      '#name': 'name'
    };
    scanParams.ExpressionAttributeValues = {
      ...scanParams.ExpressionAttributeValues,
      ':search': search
    };
  }
  
  const result = await dynamoDB.send(new ScanCommand(scanParams));
  const vendors = result.Items || [];
  
  // Get lead counts for each vendor
  const vendorsWithCounts = await Promise.all(vendors.map(async (vendor) => {
    try {
      const leadsResult = await dynamoDB.send(new QueryCommand({
        TableName: LEADS_TABLE,
        IndexName: 'VendorIndex', // Assuming there's a GSI on vendor_code
        KeyConditionExpression: 'vendor_code = :vendorCode',
        ExpressionAttributeValues: { ':vendorCode': vendor.vendor_code },
        Select: 'COUNT'
      }));
      
      const leadCount = leadsResult.Count || 0;
      
      // Calculate revenue based on lead count
      const avgLeadValue = 35; // Default lead value
      const revenue = leadCount * avgLeadValue;
      
      return {
        ...vendor,
        lead_count: leadCount,
        revenue: revenue,
        last_activity: vendor.last_activity || vendor.created_date
      };
    } catch (error) {
      console.warn(`Error getting lead count for vendor ${vendor.vendor_code}:`, error);
      return {
        ...vendor,
        lead_count: 0,
        revenue: 0,
        last_activity: vendor.last_activity || vendor.created_date
      };
    }
  }));
  
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      vendors: vendorsWithCounts,
      pagination: {
        hasMore: !!result.LastEvaluatedKey,
        lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
        count: vendorsWithCounts.length
      }
    })
  };
}

/**
 * POST /vendors - Create new vendor
 * SIMPLIFIED VERSION - Returns mock success when DynamoDB is not available
 */
exports.createVendor = async (event) => {
  try {
    console.log('Creating new vendor...');
    
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    const user = event.requestContext?.authorizer || {};
    console.log('Authenticated user for vendor creation:', user);
    
    // Check admin role
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required for vendor creation' })
      };
    }
    
    const requestBody = JSON.parse(event.body || '{}');
    const { name, email, contact_phone, website, notes, status = 'active' } = requestBody;
    console.log('Vendor creation request:', { name, email, contact_phone, website, notes, status });
    
    // Validate required fields
    if (!name || !email) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Name and email are required' })
      };
    }

    // TRY DYNAMODB FIRST, FALLBACK TO MOCK SUCCESS
    try {
      return await createVendorInDynamoDB(event, requestBody, user);
    } catch (dynamoError) {
      console.warn('DynamoDB error during vendor creation, returning mock success:', dynamoError.message);
      
      // Generate mock vendor for testing
      const vendorCode = generateVendorCode();
      const apiKey = generateAPIKey();
      const trackingId = generateTrackingId();
      const vendorId = `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const mockVendor = {
        id: vendorId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        contact_phone: contact_phone || '',
        website: website || '',
        vendor_code: vendorCode,
        api_key: apiKey,
        tracking_id: trackingId,
        status: status,
        notes: notes || '',
        created_date: new Date().toISOString(),
        created_by: user.username || 'admin',
        last_updated: new Date().toISOString(),
        lead_count: 0,
        revenue: 0,
        last_activity: null
      };
      
      console.log('Mock vendor created successfully:', vendorId);
      
      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Vendor created successfully (mock mode - DynamoDB not configured)',
          vendor: mockVendor
        })
      };
    }
  } catch (error) {
    console.error('Error creating vendor:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to create vendor',
        message: error.message 
      })
    };
  }
};

/**
 * FULL DYNAMODB VENDOR CREATION - Moved to separate function
 */
async function createVendorInDynamoDB(event, requestBody, user) {
  const { name, email, contact_phone, website, notes, status = 'active' } = requestBody;
  try {
    
    // Generate unique vendor code and API key
    const vendorCode = generateVendorCode();
    const apiKey = generateAPIKey();
    const trackingId = generateTrackingId();
    const vendorId = `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newVendor = {
      id: vendorId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      contact_phone: contact_phone || '',
      website: website || '',
      vendor_code: vendorCode,
      api_key: apiKey,
      tracking_id: trackingId,
      status: status,
      notes: notes || '',
      created_date: new Date().toISOString(),
      created_by: user.username || 'admin',
      last_updated: new Date().toISOString(),
      lead_count: 0,
      revenue: 0,
      last_activity: null
    };
    
    // Store in DynamoDB
    await dynamoDB.send(new PutCommand({
      TableName: VENDORS_TABLE,
      Item: newVendor,
      ConditionExpression: 'attribute_not_exists(id)' // Prevent duplicates
    }));
    
    console.log('Vendor created successfully:', vendorId);
    
    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Vendor created successfully',
        vendor: newVendor
      })
    };
  } catch (error) {
    console.error('Error creating vendor:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Vendor already exists' })
      };
    }
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to create vendor',
        message: error.message 
      })
    };
  }
};

/**
 * GET /vendors/{id} - Get specific vendor details
 */
exports.getVendor = async (event) => {
  try {
    const vendorId = event.pathParameters?.id;
    if (!vendorId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Vendor ID is required' })
      };
    }
    
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    const user = event.requestContext?.authorizer || {};
    
    // Check admin role
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }
    
    const result = await dynamoDB.send(new GetCommand({
      TableName: VENDORS_TABLE,
      Key: { id: vendorId }
    }));
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Vendor not found' })
      };
    }
    
    // Get recent leads for this vendor
    const leadsResult = await dynamoDB.send(new QueryCommand({
      TableName: LEADS_TABLE,
      IndexName: 'VendorIndex',
      KeyConditionExpression: 'vendor_code = :vendorCode',
      ExpressionAttributeValues: { ':vendorCode': result.Item.vendor_code },
      ScanIndexForward: false, // Most recent first
      Limit: 10
    }));
    
    const vendor = {
      ...result.Item,
      recent_leads: leadsResult.Items || [],
      lead_count: leadsResult.Count || 0
    };
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ vendor })
    };
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to fetch vendor',
        message: error.message 
      })
    };
  }
};

/**
 * PUT /vendors/{id} - Update vendor
 */
exports.updateVendor = async (event) => {
  try {
    const vendorId = event.pathParameters?.id;
    if (!vendorId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Vendor ID is required' })
      };
    }
    
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    const user = event.requestContext?.authorizer || {};
    
    // Check admin role
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }
    
    const requestBody = JSON.parse(event.body || '{}');
    const { name, email, contact_phone, website, notes, status } = requestBody;
    
    // Build update expression dynamically
    let updateExpression = 'SET last_updated = :lastUpdated';
    let expressionAttributeValues = {
      ':lastUpdated': new Date().toISOString()
    };
    
    if (name) {
      updateExpression += ', #name = :name';
      expressionAttributeValues[':name'] = name.trim();
    }
    
    if (email) {
      updateExpression += ', email = :email';
      expressionAttributeValues[':email'] = email.trim().toLowerCase();
    }
    
    if (contact_phone !== undefined) {
      updateExpression += ', contact_phone = :phone';
      expressionAttributeValues[':phone'] = contact_phone;
    }
    
    if (website !== undefined) {
      updateExpression += ', website = :website';
      expressionAttributeValues[':website'] = website;
    }
    
    if (notes !== undefined) {
      updateExpression += ', notes = :notes';
      expressionAttributeValues[':notes'] = notes;
    }
    
    if (status) {
      updateExpression += ', #status = :status';
      expressionAttributeValues[':status'] = status;
    }
    
    const result = await dynamoDB.send(new UpdateCommand({
      TableName: VENDORS_TABLE,
      Key: { id: vendorId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        '#name': 'name',
        '#status': 'status'
      },
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(id)' // Ensure vendor exists
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Vendor updated successfully',
        vendor: result.Attributes
      })
    };
  } catch (error) {
    console.error('Error updating vendor:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Vendor not found' })
      };
    }
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to update vendor',
        message: error.message 
      })
    };
  }
};

/**
 * DELETE /vendors/{id} - Delete vendor
 */
exports.deleteVendor = async (event) => {
  try {
    const vendorId = event.pathParameters?.id;
    if (!vendorId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Vendor ID is required' })
      };
    }
    
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    const user = event.requestContext?.authorizer || {};
    
    // Check admin role
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }
    
    // First get the vendor to check if it has leads
    const vendorResult = await dynamoDB.send(new GetCommand({
      TableName: VENDORS_TABLE,
      Key: { id: vendorId }
    }));
    
    if (!vendorResult.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Vendor not found' })
      };
    }
    
    // Check for existing leads
    const leadsResult = await dynamoDB.send(new QueryCommand({
      TableName: LEADS_TABLE,
      IndexName: 'VendorIndex',
      KeyConditionExpression: 'vendor_code = :vendorCode',
      ExpressionAttributeValues: { ':vendorCode': vendorResult.Item.vendor_code },
      Select: 'COUNT',
      Limit: 1
    }));
    
    if (leadsResult.Count > 0) {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Cannot delete vendor with existing leads',
          lead_count: leadsResult.Count
        })
      };
    }
    
    // Delete the vendor
    await dynamoDB.send(new DeleteCommand({
      TableName: VENDORS_TABLE,
      Key: { id: vendorId },
      ConditionExpression: 'attribute_exists(id)'
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Vendor deleted successfully',
        deleted_vendor: vendorResult.Item
      })
    };
  } catch (error) {
    console.error('Error deleting vendor:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Vendor not found' })
      };
    }
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to delete vendor',
        message: error.message 
      })
    };
  }
};

/**
 * POST /vendors/bulk-update - Bulk update vendors
 */
exports.bulkUpdateVendors = async (event) => {
  try {
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    const user = event.requestContext?.authorizer || {};
    
    // Check admin role
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }
    
    const requestBody = JSON.parse(event.body || '{}');
    const { vendor_ids, updates } = requestBody;
    
    if (!vendor_ids || !Array.isArray(vendor_ids) || vendor_ids.length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'vendor_ids array is required' })
      };
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'updates object is required' })
      };
    }
    
    // Build update expression
    let updateExpression = 'SET last_updated = :lastUpdated';
    let expressionAttributeValues = {
      ':lastUpdated': new Date().toISOString()
    };
    let expressionAttributeNames = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'status') {
        updateExpression += ', #status = :status';
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = value;
      } else if (key === 'name') {
        updateExpression += ', #name = :name';
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = value;
      }
      // Add more fields as needed
    });
    
    // Update each vendor
    const results = await Promise.allSettled(
      vendor_ids.map(async (vendorId) => {
        return await dynamoDB.send(new UpdateCommand({
          TableName: VENDORS_TABLE,
          Key: { id: vendorId },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
          ConditionExpression: 'attribute_exists(id)'
        }));
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Bulk update completed',
        results: {
          successful,
          failed,
          total: vendor_ids.length
        }
      })
    };
  } catch (error) {
    console.error('Error in bulk update:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to bulk update vendors',
        message: error.message 
      })
    };
  }
};

/**
 * PUT /vendors/{id}/api-key - Regenerate API key
 */
exports.regenerateApiKey = async (event) => {
  try {
    const vendorId = event.pathParameters?.id;
    if (!vendorId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Vendor ID is required' })
      };
    }
    
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    const user = event.requestContext?.authorizer || {};
    
    // Check admin role
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }
    
    const newApiKey = generateAPIKey();
    
    const result = await dynamoDB.send(new UpdateCommand({
      TableName: VENDORS_TABLE,
      Key: { id: vendorId },
      UpdateExpression: 'SET api_key = :apiKey, last_updated = :lastUpdated',
      ExpressionAttributeValues: {
        ':apiKey': newApiKey,
        ':lastUpdated': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(id)'
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'API key regenerated successfully',
        vendor: result.Attributes
      })
    };
  } catch (error) {
    console.error('Error regenerating API key:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Vendor not found' })
      };
    }
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to regenerate API key',
        message: error.message 
      })
    };
  }
};

// Utility functions
function generateVendorCode() {
  const prefix = 'PUB';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return prefix + timestamp + random;
}

function generateAPIKey() {
  return 'api_' + Math.random().toString(36).substr(2, 32);
}

function generateTrackingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let trackingId = 'TRK_';
  for (let i = 0; i < 8; i++) {
    trackingId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return trackingId;
} 