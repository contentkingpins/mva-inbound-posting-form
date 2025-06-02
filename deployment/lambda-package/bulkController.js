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
    const leadParams = {
      TableName: LEADS_TABLE,
      FilterExpression: 'assigned_agent = :agent',
      ExpressionAttributeValues: {
        ':agent': agentEmail
      }
    };
    
    const assignedLeads = await dynamodb.scan(leadParams).promise();
    const currentCapacity = assignedLeads.Items ? assignedLeads.Items.length : 0;
    
    const userParams = {
      TableName: USERS_TABLE,
      Key: { email: agentEmail }
    };
    
    const userResult = await dynamodb.get(userParams).promise();
    const maxCapacity = userResult.Item?.max_capacity || 25;
    
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

// Helper function to get available agents for assignment
async function getAvailableAgents() {
  try {
    const userParams = {
      TableName: USERS_TABLE,
      FilterExpression: '#role = :role AND availability = :status',
      ExpressionAttributeNames: {
        '#role': 'role'
      },
      ExpressionAttributeValues: {
        ':role': 'agent',
        ':status': 'active'
      }
    };
    
    const usersResult = await dynamodb.scan(userParams).promise();
    const agents = usersResult.Items || [];
    
    // Get capacity for each agent
    const agentsWithCapacity = [];
    for (const agent of agents) {
      const capacity = await getAgentCapacity(agent.email);
      if (capacity.available_slots > 0) {
        agentsWithCapacity.push({
          email: agent.email,
          name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || agent.email,
          capacity: capacity,
          performance_score: agent.performance_score || 75
        });
      }
    }
    
    // Sort by available slots (descending) then performance (descending)
    agentsWithCapacity.sort((a, b) => {
      if (a.capacity.available_slots !== b.capacity.available_slots) {
        return b.capacity.available_slots - a.capacity.available_slots;
      }
      return b.performance_score - a.performance_score;
    });
    
    return agentsWithCapacity;
  } catch (error) {
    console.error('Error getting available agents:', error);
    return [];
  }
}

// POST /api/leads/bulk-update
exports.bulkUpdate = async (event) => {
  console.log('Bulk update request:', JSON.stringify(event, null, 2));
  
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
    const { lead_ids, updates, notes = '' } = requestBody;
    
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'lead_ids must be a non-empty array' 
        })
      };
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'updates object is required and cannot be empty' 
        })
      };
    }
    
    const timestamp = new Date().toISOString();
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    // Process each lead
    for (const leadId of lead_ids) {
      try {
        // Check if lead exists
        const getParams = {
          TableName: LEADS_TABLE,
          Key: { lead_id: leadId }
        };
        
        const leadResult = await dynamodb.get(getParams).promise();
        if (!leadResult.Item) {
          results.push({
            lead_id: leadId,
            status: 'failed',
            error: 'Lead not found'
          });
          failureCount++;
          continue;
        }
        
        // Build update expression
        let updateExpression = 'SET last_activity = :timestamp';
        const expressionValues = {
          ':timestamp': timestamp
        };
        
        // Add each update field
        Object.keys(updates).forEach(key => {
          if (key !== 'lead_id') { // Don't allow updating the primary key
            updateExpression += `, #${key} = :${key}`;
            expressionValues[`:${key}`] = updates[key];
          }
        });
        
        const expressionNames = {};
        Object.keys(updates).forEach(key => {
          if (key !== 'lead_id') {
            expressionNames[`#${key}`] = key;
          }
        });
        
        if (notes) {
          updateExpression += ', bulk_update_notes = :notes';
          expressionValues[':notes'] = notes;
        }
        
        // Update the lead
        const updateParams = {
          TableName: LEADS_TABLE,
          Key: { lead_id: leadId },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionValues,
          ExpressionAttributeNames: expressionNames,
          ReturnValues: 'ALL_NEW'
        };
        
        const updateResult = await dynamodb.update(updateParams).promise();
        
        results.push({
          lead_id: leadId,
          status: 'updated',
          timestamp: timestamp,
          updated_fields: Object.keys(updates)
        });
        successCount++;
        
      } catch (error) {
        console.error(`Error updating lead ${leadId}:`, error);
        results.push({
          lead_id: leadId,
          status: 'failed',
          error: error.message
        });
        failureCount++;
      }
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        updated_count: successCount,
        failed_count: failureCount,
        total_count: lead_ids.length,
        results: results,
        updated_by: user.email || user.username,
        timestamp: timestamp
      })
    };
    
  } catch (error) {
    console.error('Bulk update error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to perform bulk update', 
        message: error.message 
      })
    };
  }
};

// POST /api/leads/bulk-assign
exports.bulkAssign = async (event) => {
  console.log('Bulk assign request:', JSON.stringify(event, null, 2));
  
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
      lead_ids, 
      assignment_strategy = 'round_robin', 
      agents = [], 
      priority = 'normal' 
    } = requestBody;
    
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'lead_ids must be a non-empty array' 
        })
      };
    }
    
    let availableAgents = [];
    
    // Get agents based on strategy
    if (assignment_strategy === 'manual' && agents.length > 0) {
      // Manual assignment - use provided agents
      for (const agentEmail of agents) {
        const capacity = await getAgentCapacity(agentEmail);
        if (capacity.available_slots > 0) {
          availableAgents.push({
            email: agentEmail,
            capacity: capacity
          });
        }
      }
    } else {
      // Auto assignment - get available agents
      availableAgents = await getAvailableAgents();
    }
    
    if (availableAgents.length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'No agents available for assignment' 
        })
      };
    }
    
    const timestamp = new Date().toISOString();
    const assignments = [];
    let successCount = 0;
    let failureCount = 0;
    let agentIndex = 0;
    
    // Process each lead
    for (const leadId of lead_ids) {
      try {
        // Check if lead exists
        const getParams = {
          TableName: LEADS_TABLE,
          Key: { lead_id: leadId }
        };
        
        const leadResult = await dynamodb.get(getParams).promise();
        if (!leadResult.Item) {
          assignments.push({
            lead_id: leadId,
            status: 'failed',
            error: 'Lead not found'
          });
          failureCount++;
          continue;
        }
        
        // Select agent based on strategy
        let selectedAgent;
        if (assignment_strategy === 'round_robin') {
          selectedAgent = availableAgents[agentIndex % availableAgents.length];
          agentIndex++;
        } else if (assignment_strategy === 'capacity_based') {
          // Find agent with most available slots
          selectedAgent = availableAgents.sort(
            (a, b) => b.capacity.available_slots - a.capacity.available_slots
          )[0];
        } else {
          // Default or manual - use first available
          selectedAgent = availableAgents[0];
        }
        
        // Check if selected agent still has capacity
        const currentCapacity = await getAgentCapacity(selectedAgent.email);
        if (currentCapacity.available_slots <= 0) {
          // Remove agent from available list and try next
          availableAgents = availableAgents.filter(a => a.email !== selectedAgent.email);
          if (availableAgents.length === 0) {
            assignments.push({
              lead_id: leadId,
              status: 'failed',
              error: 'No agents with available capacity'
            });
            failureCount++;
            continue;
          }
          selectedAgent = availableAgents[0];
        }
        
        // Assign lead to agent
        const updateParams = {
          TableName: LEADS_TABLE,
          Key: { lead_id: leadId },
          UpdateExpression: 'SET assigned_agent = :agent, assigned_at = :timestamp, priority = :priority, last_activity = :activity, assignment_method = :method',
          ExpressionAttributeValues: {
            ':agent': selectedAgent.email,
            ':timestamp': timestamp,
            ':priority': priority,
            ':activity': timestamp,
            ':method': assignment_strategy
          },
          ReturnValues: 'ALL_NEW'
        };
        
        const updateResult = await dynamodb.update(updateParams).promise();
        
        assignments.push({
          lead_id: leadId,
          assigned_to: selectedAgent.email,
          assigned_at: timestamp,
          status: 'assigned',
          agent_name: selectedAgent.name || selectedAgent.email
        });
        successCount++;
        
        // Update agent's available slots (in memory for this request)
        selectedAgent.capacity.available_slots--;
        
      } catch (error) {
        console.error(`Error assigning lead ${leadId}:`, error);
        assignments.push({
          lead_id: leadId,
          status: 'failed',
          error: error.message
        });
        failureCount++;
      }
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        assignments: assignments,
        summary: {
          total_leads: lead_ids.length,
          successfully_assigned: successCount,
          failed_assignments: failureCount,
          assignment_strategy: assignment_strategy,
          agents_used: [...new Set(assignments
            .filter(a => a.status === 'assigned')
            .map(a => a.assigned_to))]
        },
        assigned_by: user.email || user.username,
        timestamp: timestamp
      })
    };
    
  } catch (error) {
    console.error('Bulk assign error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to perform bulk assignment', 
        message: error.message 
      })
    };
  }
}; 