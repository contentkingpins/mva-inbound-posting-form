# Backend Completion Checklist

## 🚨 BLOCKER: Fix CORS First (30 minutes)
- [ ] Open AWS Console → API Gateway → `9qtb4my1ij`
- [ ] Enable CORS on ALL endpoints
- [ ] Deploy to production stage
- [ ] Test with: `curl -X OPTIONS {endpoint} -H "Origin: https://main.d21xta9fg9b6w.amplifyapp.com"`

## Phase 1: MVP Data Tracking (This Week)

### Database Schema Updates
- [ ] Add to leads table:
  - [ ] `lead_value` (decimal) - default: 35.00
  - [ ] `campaign_source` (string) - where lead came from
  - [ ] `assigned_agent` (string) - agent email/id
  - [ ] `closed_date` (timestamp) - when converted
  
- [ ] Create indexes:
  - [ ] GSI on `timestamp` for date queries
  - [ ] GSI on `disposition` for status filtering

### New API Endpoints

#### 1. Admin Stats Endpoint
- [ ] `GET /admin/stats`
- [ ] Calculate from existing data:
  ```javascript
  // Pseudo-code
  revenue.total = sum(leads.lead_value where timestamp >= thisMonth)
  agents.total = count(users where role = 'agent')
  agents.online = count(users where lastActivity >= now - 30min)
  conversion.rate = count(leads where disposition = 'Closed') / count(leads) * 100
  ```

#### 2. Analytics Endpoint  
- [ ] `GET /admin/analytics?period={today|week|month}`
- [ ] Return time-series data:
  ```javascript
  // Group leads by date
  for each day in period:
    labels.push(day)
    leads.push(count where date = day)
    revenue.push(sum(lead_value) where date = day)
  ```

#### 3. Agencies Endpoint
- [ ] `GET /agencies`
- [ ] Group leads by vendor_code:
  ```javascript
  for each vendor:
    {
      code: vendor.vendor_code,
      name: vendor.name,
      leads: count(leads where vendor_code = code),
      revenue: sum(lead_value where vendor_code = code),
      monthlyGoal: 600 // hardcode for now
    }
  ```

## Phase 2: Enhanced Tracking (Next Week)

### Pricing Management
- [ ] Create pricing_rules table
- [ ] `GET /pricing` - Get current pricing config
- [ ] `PUT /pricing/default` - Update default price
- [ ] `PUT /pricing/vendor/{code}` - Set vendor price

### Agent Management  
- [ ] Track agent activity in users table
- [ ] `GET /agents` - List agents with stats
- [ ] `POST /agents/invite` - Send invitation
- [ ] `DELETE /agents/{id}` - Remove agent

### Reports
- [ ] `GET /reports/summary` - Aggregated data
- [ ] `GET /reports/export` - CSV generation

## Phase 3: Advanced Features (Future)

### Real-time Updates
- [ ] WebSocket endpoint for live data
- [ ] EventBridge for lead events
- [ ] SNS for notifications

### Background Jobs
- [ ] Hourly stats aggregation
- [ ] Daily report generation
- [ ] Lead scoring algorithm

## Testing & Deployment

### Unit Tests
- [ ] Test stat calculations
- [ ] Test date filtering
- [ ] Test aggregations

### Integration Tests  
- [ ] End-to-end auth flow
- [ ] Admin dashboard data flow
- [ ] Report generation

### Performance
- [ ] Load test analytics endpoints
- [ ] Implement caching (5 min TTL)
- [ ] Optimize DynamoDB queries

## Current Config Reference
```json
{
  "apiEndpoint": "https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod",
  "region": "us-east-1",
  "userPoolId": "us-east-1_lhc964tLD",
  "leads_table": "LEADS_TABLE",
  "vendors_table": "VENDORS_TABLE"
}
```

## Success Criteria
- [ ] Admin can login and see dashboard
- [ ] Stats cards show real data
- [ ] Charts display actual lead trends  
- [ ] Agency cards show performance
- [ ] All without CORS errors!

## Remember
1. **CORS first** - nothing works without it
2. **Start simple** - hardcoded values are OK initially
3. **Iterate quickly** - we can refine data accuracy later
4. **Frontend is ready** - will adapt to your data structure 