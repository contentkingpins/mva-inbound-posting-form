# Agent Analytics Dashboard - Backend Requirements

## Overview
The Agent Analytics Dashboard provides **personal performance analytics** for individual agents. This requires backend support for agent-specific data aggregation, goal tracking, and personalized insights.

## Current Agent Dashboard State
- ✅ Basic agent dashboard (`agent-aurora.html`) with lead management
- ✅ Agent authentication and role-based access
- ✅ Basic agent lead assignments

## New Agent Analytics Requirements

### 1. **Agent-Specific API Endpoints**

#### **A. Personal KPI Data**
```
GET /agent/analytics/kpis
```
**Authentication**: Agent JWT token required
**Response**:
```json
{
  "agentId": "agent123",
  "dateRange": "30",
  "kpis": {
    "leadsHandled": 47,
    "leadsThisWeek": 12,
    "conversionRate": 68.1,
    "totalRevenue": 12450,
    "responseTimeHours": 1.2,
    "satisfactionScore": 4.7,
    "satisfactionCount": 23,
    "teamRanking": 3,
    "totalAgents": 15
  },
  "trends": {
    "leads": 8.3,        // % change vs previous period
    "conversion": 12.1,
    "revenue": 18.7,
    "response": -15.2,   // negative = improvement
    "satisfaction": 4.2,
    "ranking": 2         // positions moved up
  }
}
```

#### **B. Personal Goals Management**
```
GET /agent/goals
POST /agent/goals
PUT /agent/goals
```
**POST/PUT Request**:
```json
{
  "period": "monthly",
  "goals": {
    "conversions": 15,
    "revenue": 15000,
    "responseTimeHours": 2.0
  }
}
```

#### **C. Personal Conversion Funnel**
```
GET /agent/analytics/funnel
```
**Response**:
```json
{
  "funnel": {
    "assigned": 47,
    "contacted": 40,
    "interested": 34,
    "converted": 32
  },
  "conversionRates": {
    "contactRate": 85.1,
    "interestRate": 72.3,
    "conversionRate": 68.0
  }
}
```

#### **D. Personal Lead Sources Performance**
```
GET /agent/analytics/lead-sources
```
**Response**:
```json
{
  "sources": [
    {
      "source": "Referrals",
      "count": 18,
      "conversionRate": 78,
      "revenue": 5400
    },
    {
      "source": "Web Forms", 
      "count": 15,
      "conversionRate": 53,
      "revenue": 3200
    }
  ]
}
```

#### **E. Personal Revenue Trends**
```
GET /agent/analytics/revenue-trends?period=daily|weekly|monthly
```
**Response**:
```json
{
  "period": "daily",
  "data": [
    {
      "date": "2025-05-01",
      "revenue": 450
    },
    {
      "date": "2025-05-02", 
      "revenue": 320
    }
  ],
  "insights": {
    "bestDay": {
      "date": "2025-05-15",
      "revenue": 2100
    },
    "monthTotal": 12450,
    "monthChange": 18.7
  }
}
```

#### **F. Personal Activity Timeline**
```
GET /agent/analytics/activities?filter=all|calls|emails|conversions
```
**Response**:
```json
{
  "activities": [
    {
      "id": "act123",
      "type": "conversion",
      "title": "Lead Converted",
      "description": "John Smith - Auto Insurance Policy",
      "timestamp": "2025-05-30T14:30:00Z",
      "metadata": {
        "leadId": "lead456",
        "revenue": 850
      }
    }
  ]
}
```

### 2. **Database Schema Updates**

#### **A. Agent Goals Table**
```sql
CREATE TABLE agent_goals (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    period VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly'
    goal_type VARCHAR(50) NOT NULL, -- 'conversions', 'revenue', 'response_time'
    target_value DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(agent_id, period, goal_type, period_start)
);
```

#### **B. Agent Performance Metrics Table**
```sql
CREATE TABLE agent_performance_metrics (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    leads_assigned INTEGER DEFAULT 0,
    leads_contacted INTEGER DEFAULT 0,
    leads_interested INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    response_time_avg_hours DECIMAL(5,2),
    satisfaction_score DECIMAL(3,2),
    satisfaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(agent_id, date)
);
```

#### **C. Agent Activity Log Table**
```sql
CREATE TABLE agent_activity_log (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    lead_id VARCHAR(50),
    activity_type VARCHAR(50) NOT NULL, -- 'call', 'email', 'conversion', 'meeting'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_agent_timestamp (agent_id, timestamp),
    INDEX idx_activity_type (activity_type)
);
```

#### **D. Update Existing Leads Table**
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_agent_id VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS interested_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS response_time_hours DECIMAL(5,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_agent ON leads(disposition, assigned_agent_id);
```

### 3. **Backend Business Logic Requirements**

#### **A. Performance Calculation Engine**
```javascript
// Functions needed:
calculateAgentKPIs(agentId, dateRange)
calculateConversionRates(agentId, dateRange)
calculateTeamRanking(agentId)
calculateTrends(agentId, currentPeriod, previousPeriod)
generatePersonalInsights(agentId)
```

#### **B. Real-time Metrics Updates**
- Update `agent_performance_metrics` daily via cron job
- Calculate rolling averages for response time
- Update team rankings when any agent metrics change
- Trigger insights recalculation on significant performance changes

#### **C. Goal Progress Tracking**
```javascript
// Functions needed:
updateGoalProgress(agentId, goalType, newValue)
checkGoalAchievements(agentId)
calculateGoalCompletionPercentage(agentId, goalType)
```

### 4. **Authorization & Security**

#### **A. Agent-Only Access Control**
```javascript
// Middleware required:
function requireAgentRole(req, res, next) {
    if (req.user.role !== 'agent') {
        return res.status(403).json({ error: 'Agent access required' });
    }
    next();
}

function requireAgentDataAccess(req, res, next) {
    const requestedAgentId = req.params.agentId || req.user.id;
    if (req.user.role === 'agent' && req.user.id !== requestedAgentId) {
        return res.status(403).json({ error: 'Can only access own data' });
    }
    next();
}
```

#### **B. Data Privacy**
- Agents can only access their own performance data
- No access to other agents' personal metrics
- Team ranking shows position only, not other agents' details

### 5. **Data Aggregation Requirements**

#### **A. Daily Aggregation Jobs**
```sql
-- Daily metrics calculation
INSERT INTO agent_performance_metrics (agent_id, date, leads_assigned, leads_contacted, ...)
SELECT 
    assigned_agent_id,
    CURRENT_DATE,
    COUNT(*) as leads_assigned,
    COUNT(CASE WHEN contacted_at IS NOT NULL THEN 1 END) as leads_contacted,
    -- ... other calculations
FROM leads 
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY assigned_agent_id;
```

#### **B. Team Ranking Calculation**
```javascript
// Calculate agent rankings based on weighted scoring:
// - Conversion rate (40%)
// - Satisfaction score (35%) 
// - Response time (25%)
function calculateTeamRankings() {
    // Implementation needed
}
```

### 6. **API Performance Considerations**

#### **A. Caching Strategy**
- Cache agent KPIs for 5 minutes
- Cache team rankings for 15 minutes
- Cache revenue trends for 1 hour
- Real-time updates only for activity timeline

#### **B. Query Optimization**
- Create composite indexes for agent + date range queries
- Use materialized views for complex aggregations
- Implement pagination for activity timeline

### 7. **Integration Points**

#### **A. Activity Logging Integration**
```javascript
// Log activities when:
// - Agent calls a lead
// - Agent sends email
// - Lead status changes
// - Lead converts
// - Meeting scheduled

logAgentActivity(agentId, leadId, activityType, title, description, metadata);
```

#### **B. Lead Assignment Integration**
```javascript
// When lead is assigned to agent:
updateAgentMetrics(agentId, 'leads_assigned', +1);
createActivityLog(agentId, leadId, 'assignment', 'Lead Assigned', leadDetails);
```

## Implementation Priority

### **Phase 1 (Critical - Week 1)**
1. Create database schema
2. Implement basic KPI endpoints
3. Add agent authentication middleware
4. Basic goal setting functionality

### **Phase 2 (Important - Week 2)**
5. Revenue trends calculation
6. Activity logging system
7. Team ranking algorithm
8. Lead source analytics

### **Phase 3 (Enhanced - Week 3)**
9. Advanced insights generation
10. Performance optimization
11. Caching implementation
12. Real-time updates

## Testing Requirements

### **A. Unit Tests**
- Test all calculation functions
- Test goal setting/updating
- Test team ranking algorithm
- Test data privacy controls

### **B. Integration Tests**
- Test agent-only access
- Test data aggregation accuracy
- Test real-time activity logging
- Test performance with large datasets

## Documentation Needed

1. **API Documentation** - All new endpoints with examples
2. **Database Schema** - Updated ERD with new tables
3. **Business Logic** - Calculation algorithms and formulas
4. **Security Guidelines** - Agent data access controls

---

**Total Estimated Development Time**: 2-3 weeks for complete implementation
**Critical Dependencies**: Agent authentication system, leads database structure
**Required Skills**: Node.js/Python backend, SQL optimization, caching strategies 