# Backend API Requirements for Full Data Tracking & Admin Dashboard

## 🚨 CRITICAL: CORS Configuration Must Be Fixed First
Before any of these endpoints will work, API Gateway MUST have CORS properly configured. See `CORS_FIX_INSTRUCTIONS.md` for details.

## Current Status
- ✅ Frontend: 100% complete with admin dashboard
- ❌ Backend: Missing most data tracking and analytics endpoints
- ❌ CORS: Blocking all authenticated API calls

## Required API Endpoints

### 1. Authentication & Authorization ✅ (Partially Complete)
**Status**: Basic auth works but CORS blocks it
- `POST /auth/login` - ✅ Implemented
- `POST /auth/logout` - ✅ Implemented
- `POST /auth/refresh` - ✅ Implemented
- `GET /auth/get-username` - ✅ Implemented

### 2. Lead Management ✅ (Complete)
**Status**: Basic CRUD operations exist
- `GET /leads` - ✅ Get all leads (with filters)
- `POST /leads` - ✅ Create new lead
- `GET /leads/{id}` - ✅ Get single lead
- `PATCH /leads/{id}` - ✅ Update lead
- `POST /leads/{id}/send-retainer` - ✅ Send DocuSign

### 3. Admin Dashboard Stats ❌ (NOT IMPLEMENTED)
**Required for**: Admin dashboard metrics cards

#### `GET /admin/stats`
```json
{
  "revenue": {
    "total": 42350,
    "change": 12,  // percentage change from last period
    "period": "month"
  },
  "cpa": {
    "average": 28,
    "change": -15,  // negative means improvement
    "period": "month"
  },
  "agents": {
    "total": 23,
    "online": 12,
    "offline": 11
  },
  "conversion": {
    "rate": 68,  // percentage
    "change": 5,
    "period": "month"
  }
}
```

### 4. Performance Analytics ❌ (NOT IMPLEMENTED)
**Required for**: Admin dashboard charts

#### `GET /admin/analytics?period={today|week|month}`
```json
{
  "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "leads": [45, 52, 48, 61, 55, 42, 38],
  "revenue": [1575, 1820, 1680, 2135, 1925, 1470, 1330],
  "conversions": [30, 35, 33, 42, 38, 29, 26]
}
```

### 5. Agency Management ❌ (NOT IMPLEMENTED)
**Required for**: Agency performance cards

#### `GET /agencies`
```json
[
  {
    "code": "ACME",
    "name": "Acme Corp",
    "leads": 523,
    "monthlyGoal": 600,
    "cpa": 28,
    "revenue": 14644,
    "topCampaign": "Google Ads",
    "campaignCPA": 18,
    "grade": "A",
    "conversionRate": 68
  }
]
```

#### `GET /agencies/{code}/stats?period={today|week|month}`
```json
{
  "leads": 523,
  "revenue": 14644,
  "avgCPA": 28,
  "campaigns": [
    {"name": "Google Ads", "leads": 234, "cpa": 18},
    {"name": "Facebook", "leads": 189, "cpa": 32},
    {"name": "Direct", "leads": 100, "cpa": 40}
  ]
}
```

### 6. Pricing Management ❌ (NOT IMPLEMENTED)
**Required for**: Lead pricing controls

#### `GET /pricing`
```json
{
  "default": 35,
  "smartPricingEnabled": false,
  "vendorPrices": {
    "ACME": 45,
    "BETA": 35,
    "GAMMA": 40
  }
}
```

#### `PUT /pricing/default`
```json
{
  "price": 40
}
```

#### `PUT /pricing/vendor/{code}`
```json
{
  "price": 45
}
```

#### `PUT /pricing/smart`
```json
{
  "enabled": true,
  "rules": {
    "highDemand": {"multiplier": 1.3},
    "lowQuality": {"multiplier": 0.8}
  }
}
```

### 7. Agent Management ❌ (NOT IMPLEMENTED)
**Required for**: Team management section

#### `GET /agents`
```json
[
  {
    "id": "uuid",
    "name": "John Smith",
    "email": "john@agency.com",
    "status": "online",  // online|offline|away
    "lastSeen": "2024-01-15T10:30:00Z",
    "stats": {
      "leadsHandled": 145,
      "conversionRate": 72,
      "avgResponseTime": 180  // seconds
    }
  }
]
```

#### `POST /agents/invite`
```json
{
  "email": "newagent@agency.com",
  "role": "agent",  // agent|manager|admin
  "vendorCode": "ACME"
}
```

#### `DELETE /agents/{id}`

### 8. Advanced Reports ❌ (NOT IMPLEMENTED)
**Required for**: Reports section

#### `GET /reports/summary?period={today|week|month|custom}&startDate=&endDate=`
```json
{
  "period": "month",
  "totalLeads": 1202,
  "totalRevenue": 40017,
  "avgCPA": 33,
  "byVendor": [
    {
      "vendor": "Acme Corp",
      "leads": 523,
      "revenue": 14644,
      "cpa": 28
    }
  ],
  "bySource": [
    {
      "source": "Google Ads",
      "leads": 456,
      "revenue": 12768,
      "cpa": 28
    }
  ]
}
```

#### `GET /reports/export?format={csv|pdf}&period={week|month}`
Returns file download

### 9. DocuSign Template Management ❌ (NOT IMPLEMENTED)
**Required for**: DocuSign section (future)

#### `GET /docusign/templates`
#### `POST /docusign/templates`
#### `PUT /docusign/auto-send-rules`

### 10. Real-time Updates ❌ (NOT IMPLEMENTED)
**Required for**: Live dashboard updates

#### WebSocket: `wss://api.domain.com/live`
Events:
- `lead.new` - New lead created
- `lead.updated` - Lead status changed
- `agent.status` - Agent online/offline
- `stats.updated` - Metrics changed

## Database Schema Requirements

### New Tables/Indexes Needed

1. **agent_stats** table
   - agent_id (PK)
   - timestamp
   - leads_handled
   - conversion_rate
   - avg_response_time

2. **pricing_rules** table
   - vendor_code (PK)
   - base_price
   - smart_pricing_enabled
   - custom_rules (JSON)

3. **campaign_performance** table
   - vendor_code
   - campaign_name
   - timestamp
   - leads
   - cost
   - revenue

### Required Indexes on Existing Tables

1. **leads** table needs:
   - GSI on `timestamp` for time-based queries
   - GSI on `disposition` for status filtering
   - GSI on `campaign_source` for attribution

## Integration Requirements

### 1. Background Jobs Needed
- Hourly stats aggregation
- Daily report generation
- Real-time agent status monitoring
- Lead quality scoring

### 2. Third-party Integrations
- Google Analytics API (for campaign data)
- Facebook Ads API (for campaign data)
- Stripe/Payment processor (for revenue tracking)

## Performance Requirements
- All dashboard endpoints must respond in <500ms
- Stats should be pre-calculated, not computed on-demand
- Use caching for frequently accessed data
- Implement pagination for large datasets

## Security Requirements
- All admin endpoints require JWT with `role: admin`
- Rate limiting: 100 requests/minute per user
- Audit logging for all admin actions
- Data encryption at rest and in transit

## Priority Order for Implementation

### Phase 1 (MVP - This Week)
1. Fix CORS in API Gateway ⚠️
2. `/admin/stats` endpoint
3. `/admin/analytics` endpoint
4. `/agencies` endpoint

### Phase 2 (Next Week)
1. `/pricing` endpoints
2. `/agents` endpoints
3. Basic report generation

### Phase 3 (Following Week)
1. WebSocket real-time updates
2. Advanced analytics
3. Export functionality
4. Background job system

## Testing Requirements
- Unit tests for all new endpoints
- Integration tests for data aggregation
- Load testing for dashboard endpoints
- End-to-end tests for critical flows

## Documentation Needed
- API documentation (OpenAPI/Swagger)
- Database schema documentation
- Integration guide for frontend
- Admin user guide

## Next Steps for Backend Team

1. **IMMEDIATELY**: Fix CORS in API Gateway (see `CORS_FIX_INSTRUCTIONS.md`)
2. **TODAY**: Review this requirements doc and provide feedback
3. **TOMORROW**: Start implementing Phase 1 endpoints
4. **THIS WEEK**: Deploy MVP endpoints to production

## Questions for Backend Team
1. What's your preferred approach for real-time updates? (WebSocket, SSE, Polling?)
2. Do you have existing data aggregation jobs we can leverage?
3. What's your caching strategy? (Redis, DynamoDB TTL, CloudFront?)
4. Can we get read access to campaign data sources?

## Contact
Frontend team is ready to integrate as soon as endpoints are available. We can work endpoint by endpoint - no need to wait for everything to be complete.

**Critical**: The app is currently 100% non-functional due to CORS. This must be fixed before any other work matters. 