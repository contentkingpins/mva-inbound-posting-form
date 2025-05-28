# Backend Detailed Implementation Guide

## Phase 1: Database Setup (Day 1 Morning)

### 1. Add Missing Fields to Leads Table
**Where**: DynamoDB Console or AWS CLI  
**Why**: Frontend expects these fields for display and calculations

```bash
# Via AWS CLI
aws dynamodb update-table \
  --table-name leads \
  --attribute-definitions \
    AttributeName=lead_value,AttributeType=N \
    AttributeName=campaign_source,AttributeType=S \
    AttributeName=assigned_agent,AttributeType=S \
    AttributeName=closed_date,AttributeType=S
```

**Fields to Add**:
- `lead_value`: Number, default 35.00 (for revenue calculations)
- `campaign_source`: String (for tracking lead origin) 
- `assigned_agent`: String (for agent assignment)
- `closed_date`: ISO timestamp (for conversion tracking)

### 2. Create Indexes for Performance
**Where**: DynamoDB Console → Indexes tab  
**Why**: Speed up queries by vendor, date, and status

```javascript
// Global Secondary Indexes needed:
1. vendor-timestamp-index: 
   - Partition Key: vendor_code
   - Sort Key: timestamp
   - Why: Fast vendor-specific queries with date sorting

2. status-index:
   - Partition Key: disposition  
   - Why: Quick filtering by lead status

3. agent-index:
   - Partition Key: assigned_agent
   - Why: Agent performance queries
```

## Phase 2: Lambda Function Setup (Day 1 Afternoon)

### 3. Create Lead Controller File
**Where**: Create `leadController.js` in same directory as `authController.js`  
**Why**: Separate concerns, match existing pattern

```javascript
// leadController.js structure
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

// Import your existing auth middleware
const { verifyToken, checkRole } = require('./authMiddleware');

// CORS headers - MUST include these
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://main.d21xta9fg9b6w.amplifyapp.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
};
```

### 4. Update Main Router
**Where**: `index.js` (your main Lambda handler)  
**Why**: Add new routes to existing router

```javascript
// In index.js, add these imports
const leadController = require('./leadController');
const adminController = require('./adminController');
const agencyController = require('./agencyController');

// Add routes (follow your existing pattern)
router.get('/leads', verifyToken, leadController.getLeads);
router.post('/leads', verifyToken, leadController.createLead);
router.patch('/leads/:id', verifyToken, leadController.updateLead);
router.delete('/leads/:id', verifyToken, checkRole('admin'), leadController.deleteLead);
```

## Phase 3: Lead Endpoints Implementation (Day 2-3)

### 5. GET /leads - List Leads
**Why**: Frontend dashboard needs paginated lead list with filtering

```javascript
// In leadController.js
exports.getLeads = async (event) => {
  try {
    // 1. Extract query parameters
    const { 
      status, 
      vendor, 
      startDate, 
      endDate, 
      limit = 50, 
      lastEvaluatedKey 
    } = event.queryStringParameters || {};
    
    // 2. Get user from JWT (already decoded by middleware)
    const user = event.requestContext.authorizer;
    
    // 3. Build query based on user role
    let params = {
      TableName: 'leads',
      Limit: parseInt(limit)
    };
    
    // 4. Apply role-based filtering
    if (user.role === 'vendor') {
      // Vendors only see their own leads
      params.IndexName = 'vendor-timestamp-index';
      params.KeyConditionExpression = 'vendor_code = :vendor';
      params.ExpressionAttributeValues = { ':vendor': user.vendor_code };
    } else {
      // Admins see all, use scan with filters
      params.FilterExpression = '';
      params.ExpressionAttributeValues = {};
      
      if (status) {
        params.FilterExpression += 'disposition = :status';
        params.ExpressionAttributeValues[':status'] = status;
      }
      
      if (vendor) {
        params.FilterExpression += params.FilterExpression ? ' AND ' : '';
        params.FilterExpression += 'vendor_code = :vendor';
        params.ExpressionAttributeValues[':vendor'] = vendor;
      }
    }
    
    // 5. Add pagination support
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(
        Buffer.from(lastEvaluatedKey, 'base64').toString()
      );
    }
    
    // 6. Execute query
    const result = await dynamodb.query(params).promise();
    
    // 7. Format response
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        data: result.Items,
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
      body: JSON.stringify({ error: 'Failed to fetch leads' })
    };
  }
};
```

### 6. POST /leads - Create Lead
**Why**: Vendors need to submit new leads

```javascript
exports.createLead = async (event) => {
  try {
    // 1. Parse and validate request body
    const data = JSON.parse(event.body);
    const user = event.requestContext.authorizer;
    
    // 2. Required field validation
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
    
    // 3. Check for duplicates
    const existingLead = await dynamodb.query({
      TableName: 'leads',
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': data.email }
    }).promise();
    
    if (existingLead.Items.length > 0) {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Lead with this email already exists' })
      };
    }
    
    // 4. Create lead object
    const lead = {
      lead_id: uuidv4(),
      ...data,
      vendor_code: user.role === 'vendor' ? user.vendor_code : data.vendor_code,
      lead_value: data.lead_value || 35.00,
      disposition: 'New',
      created_date: new Date().toISOString(),
      created_by: user.sub,
      timestamp: Date.now()
    };
    
    // 5. Save to database
    await dynamodb.put({
      TableName: 'leads',
      Item: lead
    }).promise();
    
    // 6. Return created lead
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
      body: JSON.stringify({ error: 'Failed to create lead' })
    };
  }
};
```

### 7. PATCH /leads/:id - Update Lead
**Why**: Agents need to update lead status and add notes

```javascript
exports.updateLead = async (event) => {
  try {
    const { id } = event.pathParameters;
    const updates = JSON.parse(event.body);
    const user = event.requestContext.authorizer;
    
    // 1. Get existing lead to check permissions
    const existingLead = await dynamodb.get({
      TableName: 'leads',
      Key: { lead_id: id }
    }).promise();
    
    if (!existingLead.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Lead not found' })
      };
    }
    
    // 2. Check permissions
    if (user.role === 'vendor' && existingLead.Item.vendor_code !== user.vendor_code) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Not authorized to update this lead' })
      };
    }
    
    // 3. Build update expression
    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    
    // Allowed update fields
    const allowedFields = ['disposition', 'notes', 'assigned_agent', 'closed_date'];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = updates[key];
      }
    });
    
    // 4. Add metadata
    updateExpressions.push('#updated_date = :updated_date');
    expressionAttributeNames['#updated_date'] = 'updated_date';
    expressionAttributeValues[':updated_date'] = new Date().toISOString();
    
    updateExpressions.push('#updated_by = :updated_by');
    expressionAttributeNames['#updated_by'] = 'updated_by';
    expressionAttributeValues[':updated_by'] = user.sub;
    
    // 5. Execute update
    const result = await dynamodb.update({
      TableName: 'leads',
      Key: { lead_id: id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }).promise();
    
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
      body: JSON.stringify({ error: 'Failed to update lead' })
    };
  }
};
```

## Phase 4: Admin Dashboard Endpoints (Day 4)

### 8. GET /admin/stats - Dashboard Metrics
**Where**: Create `adminController.js`  
**Why**: Frontend dashboard shows real-time KPIs

```javascript
// adminController.js
exports.getStats = async (event) => {
  try {
    // 1. Check admin role
    const user = event.requestContext.authorizer;
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }
    
    // 2. Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    // 3. Query leads for current month
    const monthlyLeads = await dynamodb.scan({
      TableName: 'leads',
      FilterExpression: 'created_date BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':start': startOfMonth,
        ':end': endOfMonth
      }
    }).promise();
    
    // 4. Calculate metrics
    const totalLeads = monthlyLeads.Items.length;
    const closedLeads = monthlyLeads.Items.filter(l => l.disposition === 'Closed');
    const revenue = closedLeads.reduce((sum, lead) => sum + (lead.lead_value || 35), 0);
    
    // 5. Get agent count
    const agents = await dynamodb.scan({
      TableName: 'users',
      FilterExpression: '#role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': 'agent' }
    }).promise();
    
    // 6. Calculate previous month for comparison
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    
    const prevMonthLeads = await dynamodb.scan({
      TableName: 'leads',
      FilterExpression: 'created_date BETWEEN :start AND :end AND disposition = :closed',
      ExpressionAttributeValues: {
        ':start': prevMonthStart,
        ':end': prevMonthEnd,
        ':closed': 'Closed'
      }
    }).promise();
    
    const prevRevenue = prevMonthLeads.Items.length * 35;
    
    // 7. Format response
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        revenue: {
          total: revenue,
          change: prevRevenue ? ((revenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 0
        },
        cpa: {
          average: totalLeads ? (revenue / totalLeads).toFixed(2) : 0,
          change: -15 // Hardcoded for now, calculate later
        },
        agents: {
          total: agents.Items.length,
          online: Math.floor(agents.Items.length * 0.6) // Estimate 60% online
        },
        conversion: {
          rate: totalLeads ? (closedLeads.length / totalLeads * 100).toFixed(1) : 0,
          change: 5 // Hardcoded for now
        }
      })
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch stats' })
    };
  }
};
```

### 9. GET /admin/analytics - Time Series Data
**Why**: Charts need historical data points

```javascript
exports.getAnalytics = async (event) => {
  try {
    const { period = 'week' } = event.queryStringParameters || {};
    const user = event.requestContext.authorizer;
    
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }
    
    // 1. Calculate date range based on period
    const now = new Date();
    const ranges = {
      week: 7,
      month: 30,
      year: 365
    };
    const days = ranges[period] || 7;
    
    // 2. Generate date labels and query for each
    const labels = [];
    const leads = [];
    const revenue = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Add label
      if (period === 'week') {
        labels.push(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]);
      } else if (period === 'month') {
        labels.push(date.getDate().toString());
      } else {
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
      }
      
      // Query leads for this date
      const dayLeads = await dynamodb.scan({
        TableName: 'leads',
        FilterExpression: 'begins_with(created_date, :date)',
        ExpressionAttributeValues: { ':date': dateStr }
      }).promise();
      
      leads.push(dayLeads.Items.length);
      revenue.push(dayLeads.Items.filter(l => l.disposition === 'Closed').length * 35);
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        labels,
        leads,
        revenue
      })
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch analytics' })
    };
  }
};
```

## Phase 5: API Gateway Configuration (Day 5)

### 10. Add Routes to API Gateway
**Where**: AWS Console → API Gateway → Your API  
**Why**: Lambda functions need HTTP endpoints

For each endpoint:
1. Click "Create Resource" or "Create Method"
2. Set up the path (e.g., `/leads` or `/leads/{id}`)
3. Set HTTP method (GET, POST, PATCH, etc.)
4. Integration type: Lambda Function
5. Select your Lambda function
6. Click "Deploy API" after each change

### 11. Enable CORS in API Gateway
**Where**: Each method → Actions → Enable CORS  
**Why**: Browser security requires CORS headers

Settings:
- Access-Control-Allow-Origin: `https://main.d21xta9fg9b6w.amplifyapp.com`
- Access-Control-Allow-Headers: `Content-Type,Authorization,X-Api-Key`
- Access-Control-Allow-Methods: Select all methods for the resource

### 12. Deploy to Production Stage
**Where**: API Gateway → Deploy API  
**Why**: Changes aren't live until deployed

1. Deployment stage: "prod"
2. Deployment description: "CRM endpoints v1"
3. Deploy

## Phase 6: Testing & Validation

### 13. Test Each Endpoint
**Where**: Postman or Terminal  
**Why**: Verify before frontend integration

```bash
# Get auth token first
TOKEN=$(curl -X POST https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@test.com","password":"Test123!"}' \
  | jq -r .token)

# Test leads endpoint
curl https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads \
  -H "Authorization: Bearer $TOKEN"

# Test from browser console
fetch('https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
}).then(r => r.json()).then(console.log)
```

## Common Issues & Solutions

### CORS Errors
- Double-check CORS is enabled in API Gateway AND Lambda returns CORS headers
- Ensure exact origin match (no trailing slash)
- OPTIONS requests must return 200 with CORS headers

### 403 Forbidden
- Check JWT token is valid and not expired
- Verify API Gateway authorizer is configured
- Ensure Lambda has DynamoDB permissions

### Empty Results
- Check DynamoDB table names match exactly
- Verify indexes are created and active
- Check date formats match (ISO 8601)

## Deployment Checklist

Before marking any endpoint complete:
- [ ] Lambda function tested locally
- [ ] Deployed to AWS Lambda
- [ ] API Gateway route created
- [ ] CORS enabled in API Gateway
- [ ] Authorizer attached to route
- [ ] Deployed to prod stage
- [ ] Tested from actual frontend URL
- [ ] Error handling returns proper status codes
- [ ] Response format matches frontend expectations 