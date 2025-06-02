const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const jwt = require('jsonwebtoken');

// Environment variables
const LEADS_TABLE = process.env.LEADS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const SAVED_SEARCHES_TABLE = process.env.SAVED_SEARCHES_TABLE || 'SavedSearches';

// CORS headers
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://main.d21xta9fg9b6w.amplifyapp.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-api-key",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Content-Type": "application/json"
};

// Utility function to validate JWT token
function validateToken(event) {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No valid authorization header');
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

// Helper function to build advanced search query
function buildSearchQuery(searchCriteria, userRole, userEmail) {
  let filterExpression = '';
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};
  let index = 0;

  // Role-based filtering (always applied first)
  if (userRole === 'vendor') {
    filterExpression = 'vendor_code = :userVendor';
    expressionAttributeValues[':userVendor'] = userEmail; // Assuming vendor code matches email
    index++;
  } else if (userRole === 'agent') {
    filterExpression = 'assigned_agent = :userAgent';
    expressionAttributeValues[':userAgent'] = userEmail;
    index++;
  }

  // Text search across multiple fields
  if (searchCriteria.text && searchCriteria.text.trim()) {
    const textConditions = [];
    const searchText = searchCriteria.text.trim().toLowerCase();
    
    ['first_name', 'last_name', 'email', 'phone', 'notes'].forEach(field => {
      const valueKey = `:text${index}`;
      textConditions.push(`contains(${field}, ${valueKey})`);
      expressionAttributeValues[valueKey] = searchText;
      index++;
    });
    
    const textFilter = `(${textConditions.join(' OR ')})`;
    filterExpression = filterExpression ? `${filterExpression} AND ${textFilter}` : textFilter;
  }

  // Date range filtering
  if (searchCriteria.dateRange) {
    const { field, startDate, endDate } = searchCriteria.dateRange;
    const dateField = field || 'created_date';
    
    if (startDate && endDate) {
      filterExpression += filterExpression ? ' AND ' : '';
      filterExpression += `#dateField BETWEEN :startDate AND :endDate`;
      expressionAttributeNames['#dateField'] = dateField;
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeValues[':endDate'] = endDate;
    } else if (startDate) {
      filterExpression += filterExpression ? ' AND ' : '';
      filterExpression += `#dateField >= :startDate`;
      expressionAttributeNames['#dateField'] = dateField;
      expressionAttributeValues[':startDate'] = startDate;
    } else if (endDate) {
      filterExpression += filterExpression ? ' AND ' : '';
      filterExpression += `#dateField <= :endDate`;
      expressionAttributeNames['#dateField'] = dateField;
      expressionAttributeValues[':endDate'] = endDate;
    }
  }

  // Status/Disposition filtering
  if (searchCriteria.dispositions && searchCriteria.dispositions.length > 0) {
    const statusConditions = searchCriteria.dispositions.map((status, i) => {
      const valueKey = `:status${index + i}`;
      expressionAttributeValues[valueKey] = status;
      return `disposition = ${valueKey}`;
    });
    
    const statusFilter = `(${statusConditions.join(' OR ')})`;
    filterExpression = filterExpression ? `${filterExpression} AND ${statusFilter}` : statusFilter;
    index += searchCriteria.dispositions.length;
  }

  // Agent assignment filtering
  if (searchCriteria.agentFilter) {
    const { type, agents } = searchCriteria.agentFilter;
    
    if (type === 'unassigned') {
      filterExpression += filterExpression ? ' AND ' : '';
      filterExpression += 'attribute_not_exists(assigned_agent) OR assigned_agent = :nullAgent';
      expressionAttributeValues[':nullAgent'] = '';
    } else if (type === 'assigned') {
      filterExpression += filterExpression ? ' AND ' : '';
      filterExpression += 'attribute_exists(assigned_agent) AND assigned_agent <> :nullAgent';
      expressionAttributeValues[':nullAgent'] = '';
    } else if (type === 'specific' && agents && agents.length > 0) {
      const agentConditions = agents.map((agent, i) => {
        const valueKey = `:agent${index + i}`;
        expressionAttributeValues[valueKey] = agent;
        return `assigned_agent = ${valueKey}`;
      });
      
      const agentFilter = `(${agentConditions.join(' OR ')})`;
      filterExpression = filterExpression ? `${filterExpression} AND ${agentFilter}` : agentFilter;
      index += agents.length;
    }
  }

  // Lead value range filtering
  if (searchCriteria.valueRange) {
    const { min, max } = searchCriteria.valueRange;
    
    if (min !== undefined && max !== undefined) {
      filterExpression += filterExpression ? ' AND ' : '';
      filterExpression += 'lead_value BETWEEN :minValue AND :maxValue';
      expressionAttributeValues[':minValue'] = min;
      expressionAttributeValues[':maxValue'] = max;
    } else if (min !== undefined) {
      filterExpression += filterExpression ? ' AND ' : '';
      filterExpression += 'lead_value >= :minValue';
      expressionAttributeValues[':minValue'] = min;
    } else if (max !== undefined) {
      filterExpression += filterExpression ? ' AND ' : '';
      filterExpression += 'lead_value <= :maxValue';
      expressionAttributeValues[':maxValue'] = max;
    }
  }

  // Campaign source filtering
  if (searchCriteria.campaignSources && searchCriteria.campaignSources.length > 0) {
    const sourceConditions = searchCriteria.campaignSources.map((source, i) => {
      const valueKey = `:source${index + i}`;
      expressionAttributeValues[valueKey] = source;
      return `campaign_source = ${valueKey}`;
    });
    
    const sourceFilter = `(${sourceConditions.join(' OR ')})`;
    filterExpression = filterExpression ? `${filterExpression} AND ${sourceFilter}` : sourceFilter;
    index += searchCriteria.campaignSources.length;
  }

  // Priority filtering
  if (searchCriteria.priorities && searchCriteria.priorities.length > 0) {
    const priorityConditions = searchCriteria.priorities.map((priority, i) => {
      const valueKey = `:priority${index + i}`;
      expressionAttributeValues[valueKey] = priority;
      return `priority = ${valueKey}`;
    });
    
    const priorityFilter = `(${priorityConditions.join(' OR ')})`;
    filterExpression = filterExpression ? `${filterExpression} AND ${priorityFilter}` : priorityFilter;
    index += searchCriteria.priorities.length;
  }

  // Vendor filtering (admin only)
  if (userRole === 'admin' && searchCriteria.vendors && searchCriteria.vendors.length > 0) {
    const vendorConditions = searchCriteria.vendors.map((vendor, i) => {
      const valueKey = `:vendor${index + i}`;
      expressionAttributeValues[valueKey] = vendor;
      return `vendor_code = ${valueKey}`;
    });
    
    const vendorFilter = `(${vendorConditions.join(' OR ')})`;
    filterExpression = filterExpression ? `${filterExpression} AND ${vendorFilter}` : vendorFilter;
  }

  return {
    filterExpression: filterExpression || undefined,
    expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    expressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined
  };
}

// POST /api/leads/search - Advanced multi-criteria search
exports.advancedSearch = async (event) => {
  console.log('Advanced search request:', JSON.stringify(event, null, 2));
  
  // Validate authentication
  const user = validateToken(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  try {
    const requestBody = JSON.parse(event.body || '{}');
    const { 
      searchCriteria = {}, 
      sortBy = 'created_date',
      sortOrder = 'desc',
      limit = 50,
      lastEvaluatedKey 
    } = requestBody;
    
    // Validate limit
    const maxLimit = 100;
    const searchLimit = Math.min(parseInt(limit) || 50, maxLimit);
    
    // Build the search query
    const queryBuilder = buildSearchQuery(searchCriteria, user.role, user.email);
    
    // Construct the scan parameters
    const scanParams = {
      TableName: LEADS_TABLE,
      Limit: searchLimit
    };
    
    // Add filter expression if we have search criteria
    if (queryBuilder.filterExpression) {
      scanParams.FilterExpression = queryBuilder.filterExpression;
    }
    
    if (queryBuilder.expressionAttributeNames) {
      scanParams.ExpressionAttributeNames = queryBuilder.expressionAttributeNames;
    }
    
    if (queryBuilder.expressionAttributeValues) {
      scanParams.ExpressionAttributeValues = queryBuilder.expressionAttributeValues;
    }
    
    // Add pagination
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = JSON.parse(Buffer.from(lastEvaluatedKey, 'base64').toString('utf8'));
    }
    
    // Execute the search
    const startTime = Date.now();
    const result = await dynamodb.scan(scanParams).promise();
    const searchTime = Date.now() - startTime;
    
    // Sort results if needed (DynamoDB scan doesn't guarantee order)
    let sortedItems = result.Items || [];
    if (sortBy) {
      sortedItems.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }
    
    // Prepare pagination info
    const nextKey = result.LastEvaluatedKey 
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        leads: sortedItems,
        pagination: {
          count: sortedItems.length,
          limit: searchLimit,
          hasMore: !!result.LastEvaluatedKey,
          nextKey: nextKey
        },
        searchCriteria: searchCriteria,
        performance: {
          searchTime: `${searchTime}ms`,
          scannedCount: result.ScannedCount,
          returnedCount: result.Count
        },
        sortBy: sortBy,
        sortOrder: sortOrder
      })
    };
    
  } catch (error) {
    console.error('Advanced search error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to perform advanced search', 
        message: error.message 
      })
    };
  }
};

// GET /api/leads/filters - Get available filter options
exports.getFilterOptions = async (event) => {
  console.log('Get filter options request:', JSON.stringify(event, null, 2));
  
  // Validate authentication
  const user = validateToken(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  try {
    // Get unique values for filter dropdowns by scanning the table
    const scanParams = {
      TableName: LEADS_TABLE,
      ProjectionExpression: 'disposition, campaign_source, vendor_code, assigned_agent, priority'
    };
    
    // Apply role-based filtering
    if (user.role === 'vendor') {
      scanParams.FilterExpression = 'vendor_code = :userVendor';
      scanParams.ExpressionAttributeValues = {
        ':userVendor': user.email
      };
    } else if (user.role === 'agent') {
      scanParams.FilterExpression = 'assigned_agent = :userAgent';
      scanParams.ExpressionAttributeValues = {
        ':userAgent': user.email
      };
    }
    
    const result = await dynamodb.scan(scanParams).promise();
    const items = result.Items || [];
    
    // Extract unique values for each filter
    const dispositions = [...new Set(items.map(item => item.disposition).filter(Boolean))].sort();
    const campaignSources = [...new Set(items.map(item => item.campaign_source).filter(Boolean))].sort();
    const vendors = user.role === 'admin' 
      ? [...new Set(items.map(item => item.vendor_code).filter(Boolean))].sort()
      : [];
    const assignedAgents = [...new Set(items.map(item => item.assigned_agent).filter(Boolean))].sort();
    const priorities = [...new Set(items.map(item => item.priority).filter(Boolean))].sort();
    
    // Get all agents for assignment filtering (if admin)
    let allAgents = [];
    if (user.role === 'admin') {
      const agentParams = {
        TableName: USERS_TABLE,
        FilterExpression: '#role = :role',
        ExpressionAttributeNames: {
          '#role': 'role'
        },
        ExpressionAttributeValues: {
          ':role': 'agent'
        },
        ProjectionExpression: 'email, first_name, last_name, availability'
      };
      
      const agentResult = await dynamodb.scan(agentParams).promise();
      allAgents = (agentResult.Items || []).map(agent => ({
        email: agent.email,
        name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || agent.email,
        availability: agent.availability || 'active'
      })).sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        filters: {
          dispositions: dispositions,
          campaignSources: campaignSources,
          vendors: vendors,
          assignedAgents: assignedAgents,
          priorities: priorities.length > 0 ? priorities : ['normal', 'high', 'urgent', 'low'],
          allAgents: allAgents
        },
        dateFields: [
          { value: 'created_date', label: 'Created Date' },
          { value: 'updated_date', label: 'Updated Date' },
          { value: 'assigned_at', label: 'Assigned Date' },
          { value: 'closed_date', label: 'Closed Date' }
        ],
        agentFilterTypes: [
          { value: 'all', label: 'All Leads' },
          { value: 'assigned', label: 'Assigned to Agent' },
          { value: 'unassigned', label: 'Unassigned' },
          { value: 'specific', label: 'Specific Agents' }
        ]
      })
    };
    
  } catch (error) {
    console.error('Get filter options error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to get filter options', 
        message: error.message 
      })
    };
  }
};

// POST /api/leads/search/saved - Save search template
exports.saveSearch = async (event) => {
  console.log('Save search request:', JSON.stringify(event, null, 2));
  
  // Validate authentication
  const user = validateToken(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  try {
    const requestBody = JSON.parse(event.body || '{}');
    const { searchName, searchCriteria, description = '', isPublic = false } = requestBody;
    
    if (!searchName || !searchCriteria) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Missing required fields: searchName and searchCriteria' 
        })
      };
    }
    
    const searchId = `${user.email}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const saveParams = {
      TableName: SAVED_SEARCHES_TABLE,
      Item: {
        search_id: searchId,
        user_email: user.email,
        search_name: searchName,
        search_criteria: searchCriteria,
        description: description,
        is_public: isPublic && user.role === 'admin', // Only admins can create public searches
        created_at: timestamp,
        updated_at: timestamp,
        usage_count: 0
      }
    };
    
    await dynamodb.put(saveParams).promise();
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        savedSearch: {
          searchId: searchId,
          searchName: searchName,
          description: description,
          isPublic: saveParams.Item.is_public,
          createdAt: timestamp
        }
      })
    };
    
  } catch (error) {
    console.error('Save search error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to save search', 
        message: error.message 
      })
    };
  }
};

// GET /api/leads/search/saved - Get saved searches
exports.getSavedSearches = async (event) => {
  console.log('Get saved searches request:', JSON.stringify(event, null, 2));
  
  // Validate authentication
  const user = validateToken(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  try {
    // Get user's saved searches
    const userSearchParams = {
      TableName: SAVED_SEARCHES_TABLE,
      FilterExpression: 'user_email = :userEmail',
      ExpressionAttributeValues: {
        ':userEmail': user.email
      }
    };
    
    const userSearches = await dynamodb.scan(userSearchParams).promise();
    
    // Get public searches (if any)
    const publicSearchParams = {
      TableName: SAVED_SEARCHES_TABLE,
      FilterExpression: 'is_public = :isPublic',
      ExpressionAttributeValues: {
        ':isPublic': true
      }
    };
    
    const publicSearches = await dynamodb.scan(publicSearchParams).promise();
    
    // Combine and format results
    const allSearches = [
      ...(userSearches.Items || []).map(search => ({ ...search, type: 'personal' })),
      ...(publicSearches.Items || [])
        .filter(search => search.user_email !== user.email)
        .map(search => ({ ...search, type: 'public' }))
    ];
    
    // Sort by usage count and then by created date
    allSearches.sort((a, b) => {
      if (a.usage_count !== b.usage_count) {
        return b.usage_count - a.usage_count;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        savedSearches: allSearches.map(search => ({
          searchId: search.search_id,
          searchName: search.search_name,
          description: search.description,
          searchCriteria: search.search_criteria,
          type: search.type,
          isPublic: search.is_public,
          createdBy: search.user_email,
          createdAt: search.created_at,
          updatedAt: search.updated_at,
          usageCount: search.usage_count
        }))
      })
    };
    
  } catch (error) {
    console.error('Get saved searches error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to get saved searches', 
        message: error.message 
      })
    };
  }
};

// DELETE /api/leads/search/saved/{id} - Delete saved search
exports.deleteSavedSearch = async (event) => {
  console.log('Delete saved search request:', JSON.stringify(event, null, 2));
  
  // Validate authentication
  const user = validateToken(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  try {
    const searchId = event.pathParameters.id || event.pathParameters.searchId;
    
    if (!searchId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing searchId parameter' })
      };
    }
    
    // First, get the search to verify ownership
    const getParams = {
      TableName: SAVED_SEARCHES_TABLE,
      Key: { search_id: searchId }
    };
    
    const searchResult = await dynamodb.get(getParams).promise();
    
    if (!searchResult.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Saved search not found' })
      };
    }
    
    // Check if user owns the search or is admin
    if (searchResult.Item.user_email !== user.email && user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Not authorized to delete this search' })
      };
    }
    
    // Delete the search
    const deleteParams = {
      TableName: SAVED_SEARCHES_TABLE,
      Key: { search_id: searchId }
    };
    
    await dynamodb.delete(deleteParams).promise();
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: 'Saved search deleted successfully',
        deletedSearchId: searchId
      })
    };
    
  } catch (error) {
    console.error('Delete saved search error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to delete saved search', 
        message: error.message 
      })
    };
  }
}; 