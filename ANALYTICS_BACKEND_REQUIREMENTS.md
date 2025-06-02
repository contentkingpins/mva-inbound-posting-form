# Analytics Dashboard Backend Requirements

## Current Analytics Dashboard Features Requiring Backend Support

The advanced analytics dashboard (`analytics-dashboard.html`) currently uses **mock data** but needs real backend endpoints to function properly in production.

## Required New API Endpoints

### 1. **KPI Dashboard Data** 
```
GET /admin/analytics/kpis
```
**Response:**
```json
{
  "totalLeads": 2847,
  "newLeadsToday": 23,
  "conversionRate": 73.2,
  "totalRevenue": 289750,
  "arrValue": 3477000,
  "avgResponseTime": "1.8h",
  "customerSatisfaction": 4.6,
  "npsScore": 67,
  "revenueForecast": 127500,
  "trends": {
    "leads": 12.5,
    "conversion": 8.3,
    "revenue": 15.7,
    "response": -5.2,
    "satisfaction": 3.1,
    "forecast": 22.1
  }
}
```

### 2. **Conversion Funnel Data**
```
GET /admin/analytics/funnel?period=30
```
**Response:**
```json
{
  "leads": 2847,
  "qualified": 2221,
  "contacted": 1850,
  "interested": 1282,
  "converted": 797,
  "conversionRates": {
    "qualified": 78,
    "contacted": 65,
    "interested": 45,
    "converted": 28
  }
}
```

### 3. **Lead Sources Performance**
```
GET /admin/analytics/lead-sources?period=30
```
**Response:**
```json
{
  "sources": {
    "Publisher API": {
      "leads": 1247,
      "conversion": 78.2,
      "performance": "high",
      "revenue": 89250
    },
    "Direct Website": {
      "leads": 892,
      "conversion": 65.4,
      "performance": "high",
      "revenue": 67890
    },
    "Referrals": {
      "leads": 456,
      "conversion": 71.8,
      "performance": "high",
      "revenue": 45600
    },
    "Social Media": {
      "leads": 252,
      "conversion": 34.7,
      "performance": "low",
      "revenue": 12500
    }
  }
}
```

### 4. **Agent Performance Data**
```
GET /admin/analytics/agents?metric=conversion&period=30
```
**Response:**
```json
{
  "agents": [
    {
      "id": "a1",
      "name": "Sarah Johnson",
      "leads": 156,
      "conversion": 78.4,
      "revenue": 89250,
      "satisfaction": 4.8,
      "responseTime": "1.2h",
      "trend": "up"
    },
    {
      "id": "a2", 
      "name": "Mike Chen",
      "leads": 203,
      "conversion": 72.1,
      "revenue": 76890,
      "satisfaction": 4.6,
      "responseTime": "1.8h",
      "trend": "up"
    }
  ]
}
```

### 5. **Publisher ROI Analysis**
```
GET /admin/analytics/publishers?period=30
```
**Response:**
```json
{
  "publishers": [
    {
      "name": "Legal Lead Pro",
      "leads": 1247,
      "revenue": 34567.89,
      "cost": 8123.45,
      "roi": 425,
      "conversionRate": 78.2,
      "avgDealSize": 287
    },
    {
      "name": "AccidentClaims.net",
      "leads": 892,
      "revenue": 23456.78,
      "cost": 7523.12,
      "roi": 312,
      "conversionRate": 65.4,
      "avgDealSize": 234
    }
  ]
}
```

### 6. **Predictive Analytics**
```
GET /admin/analytics/predictions
```
**Response:**
```json
{
  "conversionPredictions": {
    "highValueLeads": 23,
    "optimalContactTime": "2-4 PM EST",
    "nextWeekConversions": 47,
    "modelAccuracy": 94.2
  },
  "revenuePredictions": {
    "next7Days": { "amount": 28400, "confidence": 89 },
    "next30Days": { "amount": 127500, "confidence": 85 },
    "nextQuarter": { "amount": 425000, "confidence": 78 }
  },
  "churnRisk": {
    "high": { "count": 3, "clients": ["Client A", "Client B"], "action": "Immediate attention needed" },
    "medium": { "count": 8, "clients": ["Client C", "Client D"], "action": "Schedule check-in" },
    "low": { "count": 45, "action": "Continue monitoring" }
  }
}
```

### 7. **Lead Quality Metrics**
```
GET /admin/analytics/lead-quality?period=30
```
**Response:**
```json
{
  "overallScore": 8.7,
  "metrics": {
    "completeness": 92,
    "responsiveness": 78,
    "authority": 85,
    "budget": 73
  },
  "trends": {
    "completeness": 2.1,
    "responsiveness": -1.5,
    "authority": 3.2,
    "budget": 0.8
  }
}
```

### 8. **Revenue Trends with Forecasting**
```
GET /admin/analytics/revenue-trends?period=30&forecast=7
```
**Response:**
```json
{
  "historical": [
    { "date": "2024-05-01", "revenue": 8500, "leads": 45 },
    { "date": "2024-05-02", "revenue": 9200, "leads": 52 },
    { "date": "2024-05-03", "revenue": 7800, "leads": 38 }
  ],
  "forecast": [
    { "date": "2024-05-31", "revenue": 11500, "confidence": 89 },
    { "date": "2024-06-01", "revenue": 12200, "confidence": 85 },
    { "date": "2024-06-02", "revenue": 11800, "confidence": 82 }
  ]
}
```

## Database Schema Requirements

### Enhanced Lead Table
Add columns for analytics tracking:
```sql
- lead_value (DECIMAL) - Monetary value of the lead
- acquisition_cost (DECIMAL) - Cost to acquire the lead  
- response_time_minutes (INT) - Time to first response
- conversion_date (TIMESTAMP) - When lead converted
- lead_source (VARCHAR) - Source category for analytics
- lead_score (INT) - Quality score 1-100
- satisfaction_rating (DECIMAL) - Customer satisfaction score
```

### New Analytics Tables
```sql
-- Agent Performance Tracking
CREATE TABLE agent_performance (
  agent_id VARCHAR(50),
  date DATE,
  leads_handled INT,
  leads_converted INT,
  total_revenue DECIMAL(10,2),
  avg_response_time_minutes INT,
  satisfaction_score DECIMAL(3,2)
);

-- Publisher/Vendor Performance
CREATE TABLE publisher_performance (
  publisher_code VARCHAR(50),
  date DATE,
  leads_provided INT,
  leads_converted INT,
  total_revenue DECIMAL(10,2),
  acquisition_cost DECIMAL(10,2),
  avg_lead_score INT
);

-- Revenue Tracking
CREATE TABLE daily_revenue (
  date DATE,
  total_revenue DECIMAL(10,2),
  lead_count INT,
  avg_deal_size DECIMAL(10,2),
  forecast_revenue DECIMAL(10,2)
);
```

## Implementation Priority

### **Phase 1: Basic Analytics** (High Priority)
- KPI endpoint with real data
- Conversion funnel tracking
- Basic agent performance metrics

### **Phase 2: Advanced Analytics** (Medium Priority)  
- Lead source performance analysis
- Publisher ROI calculations
- Revenue trend analysis

### **Phase 3: Predictive Features** (Lower Priority)
- Machine learning predictions
- Churn risk analysis
- Advanced forecasting

## Current vs Required State

### ✅ **Already Available:**
- Basic admin stats (`/admin/stats`)
- Simple analytics data (`/admin/analytics`)
- Vendor-specific metrics (`/vendor/analytics`)

### ❌ **Missing & Needed:**
- Real-time KPI calculations
- Agent performance tracking
- Publisher ROI analysis  
- Predictive analytics
- Lead quality scoring
- Revenue forecasting
- Conversion funnel analytics

## Integration Steps

1. **Update Analytics Dashboard JS**: Replace mock data functions with real API calls
2. **Implement Backend Endpoints**: Add new analytics controllers
3. **Database Migrations**: Add required columns and tables
4. **Data Collection**: Implement tracking for new metrics
5. **Testing**: Verify all dashboard features work with real data

## Estimated Development Time
- **Backend API Development**: 2-3 weeks
- **Database Schema Updates**: 1 week  
- **Frontend Integration**: 1 week
- **Testing & Optimization**: 1 week

**Total**: 5-6 weeks for complete implementation 