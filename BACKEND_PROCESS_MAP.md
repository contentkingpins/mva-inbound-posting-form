# Backend Process Map - Exactly What to Build

## 🎯 Phase 1: Core Lead Management

### 1.1 Database Schema Updates
```sql
ALTER TABLE leads ADD COLUMN lead_value DECIMAL(10,2) DEFAULT 35.00;
ALTER TABLE leads ADD COLUMN campaign_source VARCHAR(255);
ALTER TABLE leads ADD COLUMN assigned_agent VARCHAR(255);
ALTER TABLE leads ADD COLUMN closed_date TIMESTAMP;
ALTER TABLE leads ADD COLUMN created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX idx_leads_timestamp ON leads(timestamp);
CREATE INDEX idx_leads_status ON leads(disposition);
CREATE INDEX idx_leads_vendor ON leads(vendor_code);
```

### 1.2 Lead CRUD Endpoints

#### GET /leads
```javascript
// Required functionality:
- Query leads table
- Filter by vendor_code if not admin
- Support query params: ?status=new&limit=50&offset=0
- Return array of lead objects
- Include pagination metadata

// Response format:
{
  data: [{
    lead_id: "uuid",
    first_name: "John",
    last_name: "Doe",
    email: "john@email.com",
    phone_home: "555-1234",
    vendor_code: "ACME",
    disposition: "New",
    lead_value: 35.00,
    assigned_agent: "agent@email.com",
    created_date: "2024-01-01T00:00:00Z",
    notes: "string"
  }],
  total: 150,
  limit: 50,
  offset: 0
}
```

#### POST /leads
```javascript
// Required functionality:
- Validate required fields
- Generate UUID for lead_id
- Set created_date to now
- Set default lead_value if not provided
- Insert into database
- Return created lead with 201 status
```

#### PATCH /leads/{id}
```javascript
// Required functionality:
- Update only provided fields
- Track update history
- Validate status transitions
- Update updated_at timestamp
- Return updated lead
```

#### GET /leads/{id}
```javascript
// Required functionality:
- Fetch single lead by ID
- Include all fields
- Return 404 if not found
- Check vendor_code access
```

---

## 📊 Phase 2: Analytics & Metrics

### 2.1 Admin Stats Endpoint

#### GET /admin/stats
```javascript
// Required calculations:
1. Total Revenue = SUM(lead_value) WHERE disposition = 'Closed'
2. Revenue Change = (This Month Revenue - Last Month Revenue) / Last Month * 100
3. Average CPA = Total Spend / Total Leads (or hardcode initially)
4. Total Agents = COUNT(*) FROM users WHERE role = 'agent'
5. Online Agents = COUNT(*) WHERE last_activity > NOW() - 30 minutes
6. Conversion Rate = (Closed Leads / Total Leads) * 100
7. Conversion Change = This Month Rate - Last Month Rate

// Response format:
{
  revenue: {
    total: 42350,
    change: 12.5,
    period: "month"
  },
  cpa: {
    average: 28,
    change: -15.2,
    period: "month"
  },
  agents: {
    total: 23,
    online: 12,
    offline: 11
  },
  conversion: {
    rate: 68,
    change: 5.3,
    period: "month"
  }
}
```

### 2.2 Time Series Analytics

#### GET /admin/analytics?period={today|week|month}
```javascript
// Required functionality:
1. Parse period parameter
2. Generate date labels based on period:
   - today: 24 hours
   - week: 7 days
   - month: 30 days
3. Count leads per time unit
4. Sum revenue per time unit
5. Return arrays of equal length

// Response format:
{
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  leads: [45, 52, 48, 61, 55, 42, 38],
  revenue: [1575, 1820, 1680, 2135, 1925, 1470, 1330],
  conversions: [30, 35, 33, 42, 38, 29, 26]
}
```

---

## 🏢 Phase 3: Agency Management

### 3.1 Agency Overview

#### GET /agencies
```javascript
// Required functionality:
1. Get unique vendor_codes from leads table
2. For each vendor:
   - Count total leads
   - Count leads this month
   - Calculate revenue (leads * lead_value)
   - Calculate average CPA
   - Find top performing campaign_source
   - Calculate conversion rate
   - Assign performance grade

// Response format:
[
  {
    code: "ACME",
    name: "Acme Corp",
    leads: 523,
    leadsThisMonth: 145,
    monthlyGoal: 600,
    revenue: 18305,
    avgCPA: 28,
    topCampaign: "Google Ads",
    campaignCPA: 18,
    conversionRate: 68,
    grade: "A"
  }
]
```

### 3.2 Agency Stats

#### GET /agencies/{code}/stats?period={today|week|month}
```javascript
// Required functionality:
1. Filter all queries by vendor_code
2. Run same calculations as general analytics
3. Include campaign breakdown

// Response format:
{
  leads: 523,
  revenue: 18305,
  avgCPA: 28,
  campaigns: [
    {name: "Google Ads", leads: 234, cpa: 18, revenue: 8190},
    {name: "Facebook", leads: 189, cpa: 32, revenue: 6615},
    {name: "Direct", leads: 100, cpa: 40, revenue: 3500}
  ],
  periodComparison: {
    leads: {current: 523, previous: 412, change: 26.9},
    revenue: {current: 18305, previous: 14420, change: 26.9}
  }
}
```

---

## 💰 Phase 4: Pricing Management

### 4.1 Pricing Configuration Table
```sql
CREATE TABLE pricing_config (
  id INT PRIMARY KEY,
  default_price DECIMAL(10,2),
  smart_pricing_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP
);

CREATE TABLE vendor_pricing (
  vendor_code VARCHAR(50) PRIMARY KEY,
  custom_price DECIMAL(10,2),
  use_default BOOLEAN DEFAULT TRUE
);
```

### 4.2 Pricing Endpoints

#### GET /pricing
```javascript
// Response format:
{
  default: 35,
  smartPricingEnabled: false,
  vendorPrices: {
    "ACME": 45,
    "BETA": 35,
    "GAMMA": 40
  }
}
```

#### PUT /pricing/default
```javascript
// Request body:
{ price: 40 }

// Functionality:
- Update default_price in pricing_config
- Update all leads where vendor uses default
```

#### PUT /pricing/vendor/{code}
```javascript
// Request body:
{ price: 45 }

// Functionality:
- Update vendor_pricing table
- Set use_default = false
```

---

## 👥 Phase 5: Agent Management

### 5.1 Agent Tracking

#### GET /agents
```javascript
// Required functionality:
1. Query users table WHERE role = 'agent'
2. For each agent calculate:
   - Leads handled (assigned_agent = email)
   - Conversion rate
   - Last activity time
   - Online status (last_activity > 30 min ago)

// Response format:
[
  {
    id: "uuid",
    name: "John Smith",
    email: "john@agency.com",
    status: "online",
    lastSeen: "2024-01-15T10:30:00Z",
    stats: {
      leadsHandled: 145,
      conversionRate: 72,
      avgResponseTime: 180
    }
  }
]
```

#### POST /agents/invite
```javascript
// Request body:
{
  email: "newagent@agency.com",
  role: "agent",
  vendorCode: "ACME"
}

// Functionality:
- Create user record
- Send invitation email
- Generate temporary password
```

---

## 📑 Phase 6: Reports

### 6.1 Summary Reports

#### GET /reports/summary?period={week|month}&startDate=X&endDate=Y
```javascript
// Required calculations:
1. Total leads in period
2. Total revenue
3. Average CPA
4. Group by vendor
5. Group by source

// Response format:
{
  period: "month",
  dateRange: {start: "2024-01-01", end: "2024-01-31"},
  totalLeads: 1202,
  totalRevenue: 42070,
  avgCPA: 35,
  byVendor: [
    {vendor: "Acme Corp", leads: 523, revenue: 18305, cpa: 35}
  ],
  bySource: [
    {source: "Google Ads", leads: 456, revenue: 15960, cpa: 35}
  ]
}
```

#### GET /reports/export?format={csv|pdf}&period={week|month}
```javascript
// Functionality:
- Generate file in requested format
- Include all summary data
- Return file download
```

---

## 🔧 Technical Requirements for ALL Endpoints

### Authentication
- Validate JWT token from Authorization header
- Check user role for admin endpoints
- Filter data by vendor_code for non-admins

### Error Handling
- Return proper HTTP status codes
- Include error messages in response
- Log errors for debugging

### Performance
- Implement pagination on list endpoints
- Add caching headers
- Optimize database queries

### CORS Headers (MUST HAVE)
```javascript
headers: {
  'Access-Control-Allow-Origin': 'https://main.d21xta9fg9b6w.amplifyapp.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}
```

---

## 🚀 Implementation Order

1. **Database changes first** - Add missing fields
2. **Basic /leads CRUD** - Unblocks frontend
3. **Admin stats** - Shows something in dashboard
4. **Analytics endpoint** - Makes charts work
5. **Agencies** - Shows partner performance
6. **Everything else** - Can be iterative

NO EXCUSES. This is standard CRUD + basic math. Any delays are artificial. 