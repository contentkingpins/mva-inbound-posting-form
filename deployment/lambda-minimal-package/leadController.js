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
const { authenticateRequest, CORS_HEADERS } = require('./authMiddleware');

// Initialize DynamoDB client
const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

// Environment variables
const LEADS_TABLE = process.env.LEADS_TABLE || 'Leads';

/**
 * GET /leads - List leads with filtering and pagination
 */
exports.getLeads = async (event) => {
  try {
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    console.log('Getting leads:', JSON.stringify(event.queryStringParameters, null, 2));
    
    // Extract query parameters
    const { 
      status, 
      vendor, 
      startDate, 
      endDate, 
      limit = 50, 
      lastEvaluatedKey 
    } = event.queryStringParameters || {};
    
    // Get user info from request context (set by auth middleware)
    const user = event.requestContext?.authorizer || {};
    
    let params = {
      TableName: LEADS_TABLE,
      Limit: parseInt(limit)
    };
    
    let result;
    
    // Check user role and apply appropriate filtering
    if (user.role === 'vendor' && user.vendor_code) {
      // Vendors only see their own leads using GSI
      params = {
        ...params,
        IndexName: 'VendorTimestampIndex',
        KeyConditionExpression: 'vendor_code = :vendor',
        ExpressionAttributeValues: { ':vendor': user.vendor_code },
        ScanIndexForward: false // Newest first
      };
      
      // Add filters if specified
      if (status) {
        params.FilterExpression = 'disposition = :status';
        params.ExpressionAttributeValues[':status'] = status;
      }
      
      result = await dynamoDB.send(new QueryCommand(params));
    } else {
      // Admins see all leads - use scan with filters
      const filterExpressions = [];
      const expressionAttributeValues = {};
      
      if (status) {
        filterExpressions.push('disposition = :status');
        expressionAttributeValues[':status'] = status;
      }
      
      if (vendor) {
        filterExpressions.push('vendor_code = :vendor');
        expressionAttributeValues[':vendor'] = vendor;
      }
      
      if (startDate) {
        filterExpressions.push('#timestamp >= :startDate');
        expressionAttributeValues[':startDate'] = startDate;
        params.ExpressionAttributeNames = { '#timestamp': 'timestamp' };
      }
      
      if (endDate) {
        filterExpressions.push('#timestamp <= :endDate');
        expressionAttributeValues[':endDate'] = endDate;
        params.ExpressionAttributeNames = { '#timestamp': 'timestamp' };
      }
      
      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
        params.ExpressionAttributeValues = expressionAttributeValues;
      }
      
      result = await dynamoDB.send(new ScanCommand(params));
    }
    
    // Add pagination support
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(
        Buffer.from(lastEvaluatedKey, 'base64').toString()
      );
    }
    
    // Sort results by timestamp (newest first) if using scan
    if (user.role !== 'vendor') {
      result.Items = result.Items.sort((a, b) => 
        new Date(b.timestamp || b.created_date) - new Date(a.timestamp || a.created_date)
      );
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        data: result.Items || [],
        pagination: {
          count: result.Count,
          scannedCount: result.ScannedCount,
          lastEvaluatedKey: result.LastEvaluatedKey ? 
            Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null
        }
      })
    };
  } catch (error) {
    console.error('Error fetching leads:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to fetch leads',
        message: error.message 
      })
    };
  }
};

/**
 * POST /leads - Create a new lead
 */
exports.createLead = async (event) => {
  try {
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    console.log('Creating lead:', event.body);
    
    const data = JSON.parse(event.body);
    const user = event.requestContext?.authorizer || {};
    
    // Required field validation
    const required = ['first_name', 'last_name', 'email', 'phone'];
    for (const field of required) {
      if (!data[field]) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }
    
    // Check for duplicates by email
    const existingByEmail = await dynamoDB.send(new QueryCommand({
      TableName: LEADS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': data.email }
    }));
    
    if (existingByEmail.Items && existingByEmail.Items.length > 0) {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Lead with this email already exists' })
      };
    }
    
    // Create lead object
    const leadId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const lead = {
      lead_id: leadId,
      ...data,
      vendor_code: user.role === 'vendor' ? user.vendor_code : (data.vendor_code || 'UNKNOWN'),
      lead_value: data.lead_value || 35.00,
      campaign_source: data.campaign_source || 'Unknown',
      assigned_agent: data.assigned_agent || null,
      closed_date: null,
      disposition: 'New',
      created_date: timestamp,
      timestamp: Date.now().toString(),
      created_by: user.sub || user.user_id,
      notes: data.notes || '',
      update_history: [{
        timestamp,
        action: 'created',
        disposition: 'New',
        notes: 'Lead created'
      }]
    };
    
    // Save to database
    await dynamoDB.send(new PutCommand({
      TableName: LEADS_TABLE,
      Item: lead
    }));
    
    console.log('Lead created successfully:', leadId);
    
    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify(lead)
    };
  } catch (error) {
    console.error('Error creating lead:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to create lead',
        message: error.message 
      })
    };
  }
};

/**
 * PATCH /leads/{id} - Update a lead
 */
exports.updateLead = async (event) => {
  try {
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    const { id } = event.pathParameters;
    const updates = JSON.parse(event.body);
    const user = event.requestContext?.authorizer || {};
    
    console.log('Updating lead:', id, updates);
    
    // Get existing lead to check permissions
    const existingLead = await dynamoDB.send(new GetCommand({
      TableName: LEADS_TABLE,
      Key: { lead_id: id }
    }));
    
    if (!existingLead.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Lead not found' })
      };
    }
    
    // Check permissions - vendors can only update their own leads
    if (user.role === 'vendor' && existingLead.Item.vendor_code !== user.vendor_code) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Not authorized to update this lead' })
      };
    }
    
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    
    // Allowed update fields
    const allowedFields = [
      'disposition', 'notes', 'assigned_agent', 'closed_date', 
      'lead_value', 'campaign_source', 'first_name', 'last_name', 
      'email', 'phone', 'address'
    ];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = updates[key];
      }
    });
    
    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'No valid fields to update' })
      };
    }
    
    // Add metadata
    const timestamp = new Date().toISOString();
    updateExpressions.push('#updated_date = :updated_date');
    expressionAttributeNames['#updated_date'] = 'updated_date';
    expressionAttributeValues[':updated_date'] = timestamp;
    
    updateExpressions.push('#updated_by = :updated_by');
    expressionAttributeNames['#updated_by'] = 'updated_by';
    expressionAttributeValues[':updated_by'] = user.sub || user.user_id;
    
    // Add to update history
    const currentHistory = existingLead.Item.update_history || [];
    const historyEntry = {
      timestamp,
      action: 'updated',
      disposition: updates.disposition || existingLead.Item.disposition,
      notes: updates.notes || '',
      updated_by: user.sub || user.user_id
    };
    
    updateExpressions.push('#update_history = :update_history');
    expressionAttributeNames['#update_history'] = 'update_history';
    expressionAttributeValues[':update_history'] = [...currentHistory, historyEntry];
    
    // Execute update
    const result = await dynamoDB.send(new UpdateCommand({
      TableName: LEADS_TABLE,
      Key: { lead_id: id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));
    
    console.log('Lead updated successfully:', id);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result.Attributes)
    };
  } catch (error) {
    console.error('Error updating lead:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to update lead',
        message: error.message 
      })
    };
  }
};

/**
 * DELETE /leads/{id} - Delete a lead (admin only)
 */
exports.deleteLead = async (event) => {
  try {
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    const { id } = event.pathParameters;
    const user = event.requestContext?.authorizer || {};
    
    // Only admins can delete leads
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required to delete leads' })
      };
    }
    
    // Check if lead exists
    const existingLead = await dynamoDB.send(new GetCommand({
      TableName: LEADS_TABLE,
      Key: { lead_id: id }
    }));
    
    if (!existingLead.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Lead not found' })
      };
    }
    
    // Delete the lead
    await dynamoDB.send(new DeleteCommand({
      TableName: LEADS_TABLE,
      Key: { lead_id: id }
    }));
    
    console.log('Lead deleted successfully:', id);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Lead deleted successfully' })
    };
  } catch (error) {
    console.error('Error deleting lead:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to delete lead',
        message: error.message 
      })
    };
  }
}; 