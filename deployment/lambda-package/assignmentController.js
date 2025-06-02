const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const jwt = require('jsonwebtoken');

// Environment variables
const LEADS_TABLE = process.env.LEADS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

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
    // Note: In production, verify JWT with proper secret/key
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

// Helper function to get agent capacity
async function getAgentCapacity(agentEmail) {
  try {
    // Count currently assigned leads for this agent
    const leadParams = {
      TableName: LEADS_TABLE,
      FilterExpression: 'assigned_agent = :agent',
      ExpressionAttributeValues: {
        ':agent': agentEmail
      }
    };
    
    const assignedLeads = await dynamodb.scan(leadParams).promise();
    const currentCapacity = assignedLeads.Items ? assignedLeads.Items.length : 0;
    
    // Get agent's max capacity from users table
    const userParams = {
      TableName: USERS_TABLE,
      Key: { email: agentEmail }
    };
    
    const userResult = await dynamodb.get(userParams).promise();
    const maxCapacity = userResult.Item?.max_capacity || 25; // Default to 25
    
    return {
      current: currentCapacity,
      max: maxCapacity,
      percentage: Math.round((currentCapacity / maxCapacity) * 100),
      available_slots: maxCapacity - currentCapacity
    };
  } catch (error) {
    console.error('Error getting agent capacity:', error);
    return { current: 0, max: 25, percentage: 0, available_slots: 25 };
  }
}

// POST /api/leads/{leadId}/assign
exports.assignLead = async (event) => {
  console.log('Assignment request:', JSON.stringify(event, null, 2));
  
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
    const leadId = event.pathParameters.id || event.pathParameters.leadId;
    const requestBody = JSON.parse(event.body || '{}');
    const { agent_email, priority = 'normal', notes = '' } = requestBody;
    
    if (!leadId || !agent_email) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Missing required fields: leadId and agent_email' 
        })
      };
    }
    
    // Check if lead exists
    const leadParams = {
      TableName: LEADS_TABLE,
      Key: { lead_id: leadId }
    };
    
    const leadResult = await dynamodb.get(leadParams).promise();
    if (!leadResult.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Lead not found' })
      };
    }
    
    // Get agent capacity before assignment
    const capacity = await getAgentCapacity(agent_email);
    
    // Check if agent is at capacity
    if (capacity.available_slots <= 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Agent at maximum capacity',
          capacity: capacity
        })
      };
    }
    
    // Update lead with assignment
    const timestamp = new Date().toISOString();
    const updateParams = {
      TableName: LEADS_TABLE,
      Key: { lead_id: leadId },
      UpdateExpression: 'SET assigned_agent = :agent, assigned_at = :timestamp, priority = :priority, last_activity = :activity',
      ExpressionAttributeValues: {
        ':agent': agent_email,
        ':timestamp': timestamp,
        ':priority': priority,
        ':activity': timestamp
      },
      ReturnValues: 'ALL_NEW'
    };
    
    if (notes) {
      updateParams.UpdateExpression += ', assignment_notes = :notes';
      updateParams.ExpressionAttributeValues[':notes'] = notes;
    }
    
    const updateResult = await dynamodb.update(updateParams).promise();
    
    // Get updated capacity
    const updatedCapacity = await getAgentCapacity(agent_email);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        lead: updateResult.Attributes,
        agent_capacity: updatedCapacity,
        assigned_by: user.email || user.username,
        assigned_at: timestamp
      })
    };
    
  } catch (error) {
    console.error('Assignment error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to assign lead', 
        message: error.message 
      })
    };
  }
};

// PUT /api/leads/{leadId}/reassign
exports.reassignLead = async (event) => {
  console.log('Reassignment request:', JSON.stringify(event, null, 2));
  
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
    const leadId = event.pathParameters.id || event.pathParameters.leadId;
    const requestBody = JSON.parse(event.body || '{}');
    const { new_agent, reason = '', notes = '' } = requestBody;
    
    if (!leadId || !new_agent) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Missing required fields: leadId and new_agent' 
        })
      };
    }
    
    // Get current lead
    const leadParams = {
      TableName: LEADS_TABLE,
      Key: { lead_id: leadId }
    };
    
    const leadResult = await dynamodb.get(leadParams).promise();
    if (!leadResult.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Lead not found' })
      };
    }
    
    const previousAgent = leadResult.Item.assigned_agent || 'unassigned';
    
    // Check new agent capacity
    const newAgentCapacity = await getAgentCapacity(new_agent);
    if (newAgentCapacity.available_slots <= 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'New agent at maximum capacity',
          capacity: newAgentCapacity
        })
      };
    }
    
    // Update lead with new assignment
    const timestamp = new Date().toISOString();
    const updateParams = {
      TableName: LEADS_TABLE,
      Key: { lead_id: leadId },
      UpdateExpression: 'SET assigned_agent = :agent, assigned_at = :timestamp, last_activity = :activity, previous_agent = :prev, reassignment_reason = :reason',
      ExpressionAttributeValues: {
        ':agent': new_agent,
        ':timestamp': timestamp,
        ':activity': timestamp,
        ':prev': previousAgent,
        ':reason': reason
      },
      ReturnValues: 'ALL_NEW'
    };
    
    if (notes) {
      updateParams.UpdateExpression += ', reassignment_notes = :notes';
      updateParams.ExpressionAttributeValues[':notes'] = notes;
    }
    
    const updateResult = await dynamodb.update(updateParams).promise();
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        lead: updateResult.Attributes,
        previous_agent: previousAgent,
        new_agent: new_agent,
        reassigned_at: timestamp,
        reassigned_by: user.email || user.username,
        reason: reason
      })
    };
    
  } catch (error) {
    console.error('Reassignment error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to reassign lead', 
        message: error.message 
      })
    };
  }
};

// GET /api/agents
exports.getAgents = async (event) => {
  console.log('Get agents request:', JSON.stringify(event, null, 2));
  
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
    const queryParams = event.queryStringParameters || {};
    const includeCapacity = queryParams.include_capacity !== 'false';
    const statusFilter = queryParams.status;
    
    // Get all users with agent role
    const userParams = {
      TableName: USERS_TABLE,
      FilterExpression: '#role = :role',
      ExpressionAttributeNames: {
        '#role': 'role'
      },
      ExpressionAttributeValues: {
        ':role': 'agent'
      }
    };
    
    const usersResult = await dynamodb.scan(userParams).promise();
    const agents = usersResult.Items || [];
    
    // Process each agent
    const processedAgents = [];
    let totalCapacity = 0;
    let usedCapacity = 0;
    let activeAgents = 0;
    
    for (const agent of agents) {
      const agentData = {
        agent_id: agent.email,
        name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || agent.email,
        email: agent.email,
        status: agent.availability || 'active',
        last_seen: agent.last_seen || new Date().toISOString(),
        performance_score: agent.performance_score || 75
      };
      
      // Apply status filter if specified
      if (statusFilter && agentData.status !== statusFilter) {
        continue;
      }
      
      if (includeCapacity) {
        const capacity = await getAgentCapacity(agent.email);
        agentData.capacity = capacity;
        totalCapacity += capacity.max;
        usedCapacity += capacity.current;
      }
      
      if (agentData.status === 'active') {
        activeAgents++;
      }
      
      processedAgents.push(agentData);
    }
    
    // Sort by performance score (descending)
    processedAgents.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0));
    
    const response = {
      agents: processedAgents,
      summary: {
        total_agents: processedAgents.length,
        active_agents: activeAgents,
        total_capacity: totalCapacity,
        used_capacity: usedCapacity,
        utilization_percentage: totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0
      }
    };
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    console.error('Get agents error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to get agents', 
        message: error.message 
      })
    };
  }
};

// PUT /api/agents/{agentId}/capacity
exports.updateAgentCapacity = async (event) => {
  console.log('Update capacity request:', JSON.stringify(event, null, 2));
  
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
    const agentId = event.pathParameters.agentId;
    const requestBody = JSON.parse(event.body || '{}');
    const { max_capacity, availability } = requestBody;
    
    if (!agentId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing agentId parameter' })
      };
    }
    
    // Build update expression
    let updateExpression = 'SET last_seen = :timestamp';
    const expressionValues = {
      ':timestamp': new Date().toISOString()
    };
    
    if (max_capacity !== undefined) {
      updateExpression += ', max_capacity = :max_cap';
      expressionValues[':max_cap'] = max_capacity;
    }
    
    if (availability !== undefined) {
      updateExpression += ', availability = :avail';
      expressionValues[':avail'] = availability;
    }
    
    const updateParams = {
      TableName: USERS_TABLE,
      Key: { email: agentId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW'
    };
    
    const updateResult = await dynamodb.update(updateParams).promise();
    
    // Get updated capacity info
    const capacity = await getAgentCapacity(agentId);
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        agent: {
          agent_id: agentId,
          max_capacity: updateResult.Attributes.max_capacity || 25,
          current_capacity: capacity.current,
          availability: updateResult.Attributes.availability || 'active',
          updated_by: user.email || user.username,
          updated_at: updateResult.Attributes.last_seen
        }
      })
    };
    
  } catch (error) {
    console.error('Update capacity error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to update agent capacity', 
        message: error.message 
      })
    };
  }
}; 