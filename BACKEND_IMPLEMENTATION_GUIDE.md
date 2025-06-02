# Backend Implementation Guide for Analytics Dashboard

## Current System State

### Existing Analytics Endpoints
- `GET /admin/stats` - Basic monthly stats (revenue, leads, conversion)
- `GET /admin/analytics` - Time series data for charts
- `GET /vendor/analytics` - Vendor-specific performance metrics

### Current Database Schema
- **Leads Table**: Basic lead information (id, email, phone, disposition, vendor_code, timestamp)
- **Vendors/Publishers Table**: Basic vendor information
- **Users Table**: Agent/admin user data

## Required Backend Implementation

### 1. Database Schema Updates

#### **A. Enhance Leads Table**
Add these columns to existing `leads` table:
```sql
ALTER TABLE leads ADD COLUMN lead_value DECIMAL(10,2) DEFAULT 35.00;
ALTER TABLE leads ADD COLUMN acquisition_cost DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE leads ADD COLUMN response_time_minutes INT DEFAULT NULL;
ALTER TABLE leads ADD COLUMN conversion_date TIMESTAMP DEFAULT NULL;
ALTER TABLE leads ADD COLUMN lead_source VARCHAR(100) DEFAULT 'Direct';
ALTER TABLE leads ADD COLUMN lead_score INT DEFAULT 50;
ALTER TABLE leads ADD COLUMN satisfaction_rating DECIMAL(3,2) DEFAULT NULL;
ALTER TABLE leads ADD COLUMN first_contact_time TIMESTAMP DEFAULT NULL;
ALTER TABLE leads ADD COLUMN last_activity_time TIMESTAMP DEFAULT NULL;
```

**Purpose**: Track revenue, costs, response times, quality scores, and satisfaction for analytics calculations.

#### **B. Create Agent Performance Table**
```sql
CREATE TABLE agent_performance (
  id VARCHAR(50) PRIMARY KEY,
  agent_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  leads_handled INT DEFAULT 0,
  leads_converted INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  avg_response_time_minutes INT DEFAULT 0,
  satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_agent_date (agent_id, date),
  INDEX idx_date (date)
);
```

**Purpose**: Store daily agent performance metrics for leaderboards and trend analysis.

#### **C. Create Publisher Performance Table**
```sql
CREATE TABLE publisher_performance (
  id VARCHAR(50) PRIMARY KEY,
  publisher_code VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  leads_provided INT DEFAULT 0,
  leads_converted INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  acquisition_cost DECIMAL(10,2) DEFAULT 0.00,
  avg_lead_score INT DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_publisher_date (publisher_code, date),
  INDEX idx_date (date)
);
```

**Purpose**: Track publisher ROI, costs, and performance metrics for analysis.

#### **D. Create Daily Revenue Tracking Table**
```sql
CREATE TABLE daily_revenue (
  date DATE PRIMARY KEY,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  lead_count INT DEFAULT 0,
  avg_deal_size DECIMAL(10,2) DEFAULT 0.00,
  forecast_revenue DECIMAL(10,2) DEFAULT 0.00,
  conversion_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Store daily revenue aggregations for trend analysis and forecasting.

### 2. New API Endpoints Required

#### **A. KPI Dashboard Endpoint**
```
GET /admin/analytics/kpis?period=30
```

**Implementation Steps:**
1. Query leads from last N days based on `period` parameter
2. Calculate total leads, new leads today, conversion rate
3. Calculate total revenue from converted leads
4. Calculate average response time from `response_time_minutes`
5. Calculate customer satisfaction average from `satisfaction_rating`
6. Generate trend percentages by comparing to previous period
7. Return JSON with all KPI metrics

**Key Calculations:**
- Conversion Rate: `(converted_leads / total_leads) * 100`
- Revenue: `SUM(lead_value) WHERE disposition = 'Closed' OR disposition = 'Converted'`
- Avg Response Time: `AVG(response_time_minutes) WHERE response_time_minutes IS NOT NULL`

#### **B. Conversion Funnel Endpoint**
```
GET /admin/analytics/funnel?period=30
```

**Implementation Steps:**
1. Query leads from specified period
2. Count leads by disposition status:
   - Total leads (all)
   - Qualified (disposition = 'Qualified')
   - Contacted (disposition = 'Contacted' OR first_contact_time IS NOT NULL)
   - Interested (disposition = 'Interested' OR 'In Progress')
   - Converted (disposition = 'Closed' OR 'Converted')
3. Calculate conversion rates between each stage
4. Return funnel data with counts and percentages

#### **C. Lead Sources Performance Endpoint**
```
GET /admin/analytics/lead-sources?period=30
```

**Implementation Steps:**
1. Group leads by `lead_source` field
2. For each source, calculate:
   - Total leads count
   - Conversion rate (converted/total)
   - Total revenue generated
   - Performance rating (high/medium/low based on conversion rate)
3. Return sources with performance metrics

**Performance Rating Logic:**
- High: Conversion rate > 60%
- Medium: Conversion rate 30-60%
- Low: Conversion rate < 30%

#### **D. Agent Performance Endpoint**
```
GET /admin/analytics/agents?metric=conversion&period=30
```

**Implementation Steps:**
1. Query `agent_performance` table for specified period
2. Join with users table to get agent names
3. Aggregate data by agent:
   - Total leads handled
   - Conversion rate
   - Revenue generated
   - Average satisfaction score
   - Average response time
4. Sort by specified metric parameter
5. Calculate trend (compare to previous period)
6. Return top 10 agents with all metrics

#### **E. Publisher ROI Endpoint**
```
GET /admin/analytics/publishers?period=30
```

**Implementation Steps:**
1. Query `publisher_performance` table for specified period
2. For each publisher, calculate:
   - Total leads provided
   - Total revenue generated
   - Total acquisition costs
   - ROI percentage: `((revenue - cost) / cost) * 100`
   - Conversion rate
   - Average deal size
3. Sort by ROI descending
4. Return publisher metrics

#### **F. Predictive Analytics Endpoint**
```
GET /admin/analytics/predictions
```

**Implementation Steps:**
1. **High-Value Lead Identification**:
   - Query leads with `lead_score > 80`
   - Count leads created in last 7 days meeting criteria
2. **Optimal Contact Time**:
   - Analyze `first_contact_time` vs conversion success
   - Return time range with highest conversion rate
3. **Revenue Predictions**:
   - Calculate average daily revenue from last 30 days
   - Apply growth trend to forecast next 7, 30, 90 days
   - Assign confidence levels based on data variance
4. **Churn Risk Analysis**:
   - Identify clients with no activity in last 14 days
   - Categorize risk levels based on last contact and satisfaction scores

#### **G. Lead Quality Metrics Endpoint**
```
GET /admin/analytics/lead-quality?period=30
```

**Implementation Steps:**
1. Calculate quality metrics from leads in period:
   - **Completeness**: Percentage of leads with all required fields filled
   - **Responsiveness**: Percentage of leads that responded to contact
   - **Authority**: Percentage of leads marked as decision makers
   - **Budget**: Percentage of leads with budget qualification
2. Calculate overall quality score (average of all metrics)
3. Compare to previous period for trend data
4. Return quality breakdown with trends

#### **H. Revenue Trends Endpoint**
```
GET /admin/analytics/revenue-trends?period=30&forecast=7
```

**Implementation Steps:**
1. Query `daily_revenue` table for historical data
2. Group revenue by day/week/month based on period
3. Calculate forecasting using simple linear regression:
   - Analyze revenue trend from historical data
   - Project forward for requested forecast days
   - Calculate confidence levels based on historical variance
4. Return both historical and forecast data arrays

### 3. Data Collection Implementation

#### **A. Lead Response Time Tracking**
**When**: Update leads API endpoints
**What**: When an agent first contacts a lead, calculate and store `response_time_minutes`
```javascript
const responseTime = (new Date(first_contact_time) - new Date(created_date)) / (1000 * 60);
await updateLead(leadId, { response_time_minutes: Math.round(responseTime) });
```

#### **B. Daily Aggregation Jobs**
**Purpose**: Populate performance tables with daily calculations

**Agent Performance Aggregation**:
```sql
INSERT INTO agent_performance (agent_id, date, leads_handled, leads_converted, total_revenue, avg_response_time_minutes, satisfaction_score)
SELECT 
  assigned_agent,
  CURDATE(),
  COUNT(*) as leads_handled,
  SUM(CASE WHEN disposition IN ('Closed', 'Converted') THEN 1 ELSE 0 END) as leads_converted,
  SUM(CASE WHEN disposition IN ('Closed', 'Converted') THEN lead_value ELSE 0 END) as total_revenue,
  AVG(response_time_minutes) as avg_response_time_minutes,
  AVG(satisfaction_rating) as satisfaction_score
FROM leads 
WHERE DATE(created_date) = CURDATE()
GROUP BY assigned_agent;
```

**Publisher Performance Aggregation**:
```sql
INSERT INTO publisher_performance (publisher_code, date, leads_provided, leads_converted, total_revenue, acquisition_cost, avg_lead_score, conversion_rate)
SELECT 
  vendor_code,
  CURDATE(),
  COUNT(*) as leads_provided,
  SUM(CASE WHEN disposition IN ('Closed', 'Converted') THEN 1 ELSE 0 END) as leads_converted,
  SUM(CASE WHEN disposition IN ('Closed', 'Converted') THEN lead_value ELSE 0 END) as total_revenue,
  SUM(acquisition_cost) as acquisition_cost,
  AVG(lead_score) as avg_lead_score,
  (SUM(CASE WHEN disposition IN ('Closed', 'Converted') THEN 1 ELSE 0 END) / COUNT(*)) * 100 as conversion_rate
FROM leads 
WHERE DATE(created_date) = CURDATE()
GROUP BY vendor_code;
```

**Daily Revenue Aggregation**:
```sql
INSERT INTO daily_revenue (date, total_revenue, lead_count, avg_deal_size, conversion_count)
SELECT 
  CURDATE(),
  SUM(lead_value) as total_revenue,
  COUNT(*) as lead_count,
  AVG(lead_value) as avg_deal_size,
  SUM(CASE WHEN disposition IN ('Closed', 'Converted') THEN 1 ELSE 0 END) as conversion_count
FROM leads 
WHERE DATE(created_date) = CURDATE();
```

### 4. Controller Implementation

#### **A. Create Analytics Controller**
File: `deployment/analyticsController.js`

**Required Functions**:
- `getKPIs(event)` - KPI dashboard data
- `getConversionFunnel(event)` - Funnel analysis
- `getLeadSources(event)` - Source performance
- `getAgentPerformance(event)` - Agent metrics
- `getPublisherROI(event)` - Publisher analysis
- `getPredictiveInsights(event)` - ML predictions
- `getLeadQuality(event)` - Quality metrics
- `getRevenueTrends(event)` - Revenue forecasting

#### **B. Update Router**
File: `deployment/index.js`

Add routing for new analytics endpoints:
```javascript
// KPI Dashboard
else if (path.includes('/admin/analytics/kpis')) {
  return await analyticsController.getKPIs(event);
}
// Conversion Funnel
else if (path.includes('/admin/analytics/funnel')) {
  return await analyticsController.getConversionFunnel(event);
}
// Lead Sources
else if (path.includes('/admin/analytics/lead-sources')) {
  return await analyticsController.getLeadSources(event);
}
// Agent Performance
else if (path.includes('/admin/analytics/agents')) {
  return await analyticsController.getAgentPerformance(event);
}
// Publisher ROI
else if (path.includes('/admin/analytics/publishers')) {
  return await analyticsController.getPublisherROI(event);
}
// Predictive Analytics
else if (path.includes('/admin/analytics/predictions')) {
  return await analyticsController.getPredictiveInsights(event);
}
// Lead Quality
else if (path.includes('/admin/analytics/lead-quality')) {
  return await analyticsController.getLeadQuality(event);
}
// Revenue Trends
else if (path.includes('/admin/analytics/revenue-trends')) {
  return await analyticsController.getRevenueTrends(event);
}
```

### 5. Authentication & Security

#### **A. Admin Role Verification**
All analytics endpoints must verify admin access:
```javascript
const authResult = await authenticateRequest(event);
if (!authResult.authenticated || authResult.user.role !== 'admin') {
  return {
    statusCode: 403,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Admin access required' })
  };
}
```

#### **B. Rate Limiting**
Implement rate limiting for analytics endpoints to prevent abuse:
- Max 100 requests per hour per user
- Caching for frequently requested data (5-minute cache)

### 6. Performance Optimization

#### **A. Database Indexes**
Add indexes for analytics queries:
```sql
-- Lead analytics indexes
CREATE INDEX idx_leads_disposition_date ON leads(disposition, created_date);
CREATE INDEX idx_leads_agent_date ON leads(assigned_agent, created_date);
CREATE INDEX idx_leads_vendor_date ON leads(vendor_code, created_date);
CREATE INDEX idx_leads_source_date ON leads(lead_source, created_date);

-- Performance table indexes (already included in CREATE statements above)
```

#### **B. Query Optimization**
- Use prepared statements for all analytics queries
- Implement query result caching for expensive operations
- Use date range filters to limit data processing

#### **C. Response Caching**
Cache analytics responses for 5 minutes to reduce database load:
```javascript
const cacheKey = `analytics_${endpoint}_${period}_${JSON.stringify(params)}`;
const cachedResult = await getFromCache(cacheKey);
if (cachedResult) return cachedResult;

const result = await calculateAnalytics(params);
await setCache(cacheKey, result, 300); // 5 minutes
return result;
```

### 7. Data Migration & Initial Setup

#### **A. Backfill Historical Data**
For existing leads, populate new fields with default/calculated values:
```sql
-- Set default lead values for existing records
UPDATE leads SET lead_value = 35.00 WHERE lead_value IS NULL;
UPDATE leads SET lead_source = 'Legacy' WHERE lead_source IS NULL;
UPDATE leads SET lead_score = 50 WHERE lead_score IS NULL;

-- Calculate response times for existing leads with contact history
UPDATE leads l 
SET response_time_minutes = (
  SELECT TIMESTAMPDIFF(MINUTE, l.created_date, MIN(contact_date))
  FROM lead_contacts lc 
  WHERE lc.lead_id = l.id
) 
WHERE response_time_minutes IS NULL;
```

#### **B. Populate Performance Tables**
Run aggregation jobs for historical data (last 90 days) to populate performance tables.

### 8. Testing Requirements

#### **A. Unit Tests**
Test each analytics function with sample data:
- KPI calculations accuracy
- Funnel conversion math
- ROI calculations
- Trend percentage calculations

#### **B. Integration Tests**
Test full API endpoints:
- Response format validation
- Authentication verification
- Error handling
- Performance under load

#### **C. Data Validation**
Verify analytics accuracy by:
- Manual calculation spot checks
- Comparing with existing admin stats
- Cross-referencing totals across different endpoints

This implementation will provide a complete analytics backend supporting all features shown in the advanced analytics dashboard UI. 