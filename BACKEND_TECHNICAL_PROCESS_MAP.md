# Backend Technical Process Map

## Day 1: Database Setup

```sql
-- Add these fields to leads table NOW
ALTER TABLE leads ADD lead_value DECIMAL(10,2) DEFAULT 35.00;
ALTER TABLE leads ADD campaign_source VARCHAR(255);
ALTER TABLE leads ADD assigned_agent VARCHAR(255);
ALTER TABLE leads ADD closed_date TIMESTAMP;

-- Create indexes
CREATE INDEX idx_timestamp ON leads(timestamp);
CREATE INDEX idx_disposition ON leads(disposition);
CREATE INDEX idx_vendor_code ON leads(vendor_code);
```

## Day 2-3: Lead Endpoints

### GET /leads
```javascript
exports.getLeads = async (event) => {
  // 1. Get query params
  const { status, limit = 50, offset = 0 } = event.queryStringParameters || {};
  
  // 2. Build query
  let params = {
    TableName: 'leads',
    Limit: limit
  };
  
  // 3. Filter by vendor if not admin
  if (user.role !== 'admin') {
    params.FilterExpression = 'vendor_code = :vendor';
    params.ExpressionAttributeValues = { ':vendor': user.vendor_code };
  }
  
  // 4. Execute and return
  const result = await dynamodb.scan(params);
  
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      data: result.Items,
      total: result.Count,
      limit,
      offset
    })
  };
};
```

### POST /leads
```javascript
exports.createLead = async (event) => {
  const data = JSON.parse(event.body);
  
  const lead = {
    lead_id: uuid(),
    ...data,
    lead_value: data.lead_value || 35,
    created_date: new Date().toISOString()
  };
  
  await dynamodb.put({
    TableName: 'leads',
    Item: lead
  });
  
  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify(lead)
  };
};
```

### PATCH /leads/{id}
```javascript
exports.updateLead = async (event) => {
  const { id } = event.pathParameters;
  const updates = JSON.parse(event.body);
  
  const params = {
    TableName: 'leads',
    Key: { lead_id: id },
    UpdateExpression: 'SET disposition = :disposition, notes = :notes',
    ExpressionAttributeValues: {
      ':disposition': updates.disposition,
      ':notes': updates.notes
    },
    ReturnValues: 'ALL_NEW'
  };
  
  const result = await dynamodb.update(params);
  
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(result.Attributes)
  };
};
```

## Day 4-5: Admin Stats

### GET /admin/stats
```javascript
exports.getAdminStats = async (event) => {
  // 1. Get current month leads
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const params = {
    TableName: 'leads',
    FilterExpression: 'created_date >= :start',
    ExpressionAttributeValues: {
      ':start': startOfMonth.toISOString()
    }
  };
  
  const leads = await dynamodb.scan(params);
  
  // 2. Calculate metrics
  const closedLeads = leads.Items.filter(l => l.disposition === 'Closed');
  const revenue = closedLeads.length * 35;
  const conversionRate = (closedLeads.length / leads.Items.length) * 100;
  
  // 3. Get agent count
  const agents = await dynamodb.scan({
    TableName: 'users',
    FilterExpression: 'role = :role',
    ExpressionAttributeValues: { ':role': 'agent' }
  });
  
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      revenue: {
        total: revenue,
        change: 12 // hardcode for now
      },
      cpa: {
        average: 28, // hardcode
        change: -15
      },
      agents: {
        total: agents.Count,
        online: Math.floor(agents.Count * 0.6) // fake it
      },
      conversion: {
        rate: conversionRate,
        change: 5
      }
    })
  };
};
```

### GET /admin/analytics
```javascript
exports.getAnalytics = async (event) => {
  const { period = 'week' } = event.queryStringParameters || {};
  
  // 1. Generate date labels
  const labels = [];
  const leads = [];
  const revenue = [];
  
  if (period === 'week') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      labels.push(days[date.getDay()]);
      
      // Query leads for this day
      const dayLeads = await dynamodb.scan({
        TableName: 'leads',
        FilterExpression: 'begins_with(created_date, :date)',
        ExpressionAttributeValues: {
          ':date': date.toISOString().split('T')[0]
        }
      });
      
      leads.push(dayLeads.Count);
      revenue.push(dayLeads.Count * 35);
    }
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
};
```

## Day 6-7: Agencies

### GET /agencies
```javascript
exports.getAgencies = async (event) => {
  // 1. Get all vendors
  const vendors = await dynamodb.scan({ TableName: 'vendors' });
  
  // 2. For each vendor, get stats
  const agencies = await Promise.all(vendors.Items.map(async vendor => {
    const vendorLeads = await dynamodb.scan({
      TableName: 'leads',
      FilterExpression: 'vendor_code = :code',
      ExpressionAttributeValues: { ':code': vendor.vendor_code }
    });
    
    return {
      code: vendor.vendor_code,
      name: vendor.name,
      leads: vendorLeads.Count,
      revenue: vendorLeads.Count * 35,
      monthlyGoal: 600,
      avgCPA: 28,
      conversionRate: 68,
      grade: vendorLeads.Count > 400 ? 'A' : 'B'
    };
  }));
  
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(agencies)
  };
};
```

## CORS Headers (USE ON EVERY ENDPOINT)

```javascript
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://main.d21xta9fg9b6w.amplifyapp.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
};
```

## API Gateway Setup

For EACH endpoint:
1. Create the route
2. Enable CORS
3. Deploy to production
4. Test from frontend URL

## Testing Each Endpoint

```bash
# Test from command line first
curl https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads \
  -H "Authorization: Bearer [JWT_TOKEN]"

# Then test from browser console
fetch('https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
```

## Deployment Checklist

Each endpoint is DONE when:
- [ ] Code written
- [ ] CORS headers added
- [ ] JWT validation added
- [ ] Deployed to Lambda
- [ ] Route created in API Gateway
- [ ] CORS enabled in API Gateway
- [ ] Deployed to production
- [ ] Tested from frontend

## That's It

No complicated architecture. No over-engineering. Just:
1. Query database
2. Do basic math
3. Return JSON
4. Add CORS headers

Start with GET /leads. Get it working. Then move to the next. 