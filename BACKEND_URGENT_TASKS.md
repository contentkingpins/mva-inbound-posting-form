# 🚨 URGENT Backend Tasks - System is DOWN

## Current Situation
- **Frontend**: ✅ 100% complete including premium admin dashboard
- **Backend**: ❌ CORS blocking ALL operations - app is non-functional
- **Users**: Cannot login or use any features

## IMMEDIATE ACTIONS REQUIRED (Today)

### 1. FIX CORS IN API GATEWAY (Priority: CRITICAL)
**Time Required**: 30 minutes
**Impact**: Without this, NOTHING works

1. Open AWS Console → API Gateway
2. Select API: `9qtb4my1ij` 
3. For EACH endpoint, enable CORS:
   ```
   Access-Control-Allow-Origin: https://main.d21xta9fg9b6w.amplifyapp.com
   Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key
   ```
4. **DEPLOY TO PROD** (Don't forget this step!)

See `CORS_FIX_INSTRUCTIONS.md` for detailed steps.

### 2. Test Authentication Flow (Priority: HIGH)
**Time Required**: 15 minutes
Once CORS is fixed, verify:
- Login works from https://main.d21xta9fg9b6w.amplifyapp.com/dashboard/login.html
- JWT tokens are properly validated
- Admin users can access admin dashboard

## This Week's Priorities

### 3. Implement Basic Admin Stats Endpoint
**Time Required**: 2-3 hours
**Endpoint**: `GET /admin/stats`

Create a new Lambda function or add to existing that returns:
```javascript
{
  "revenue": {
    "total": /* Calculate from leads table */,
    "change": /* % change from last month */
  },
  "agents": {
    "total": /* Count from users table where role=agent */,
    "online": /* Count recently active */
  },
  "conversion": {
    "rate": /* Calculate from leads with disposition='Closed' */,
    "change": /* % change from last month */
  }
}
```

### 4. Implement Analytics Endpoint
**Time Required**: 3-4 hours  
**Endpoint**: `GET /admin/analytics?period=week`

Return time-series data:
```javascript
// Query leads table grouped by date
{
  "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "leads": [/* count per day */],
  "revenue": [/* sum of lead values per day */]
}
```

### 5. Basic Agency Endpoint
**Time Required**: 2 hours
**Endpoint**: `GET /agencies`

```javascript
// Group leads by vendor_code and calculate stats
[
  {
    "code": "ACME",
    "name": "Acme Corp", 
    "leads": /* count */,
    "revenue": /* sum */,
    "monthlyGoal": 600 // can be hardcoded initially
  }
]
```

## Data We're Currently Tracking

### In Leads Table
- ✅ lead_id, timestamp, vendor_code
- ✅ first_name, last_name, email, phone
- ✅ disposition (New, Contacted, Qualified, etc.)
- ✅ notes, checklist_data

### Missing Data Points
- ❌ Lead value/price (needed for revenue)
- ❌ Campaign source (for attribution)
- ❌ Agent assignment (who handled the lead)
- ❌ Conversion timestamp (when closed)

## Quick Wins for This Week

1. **Add `lead_value` field** to leads table (default: $35)
2. **Add `assigned_agent` field** to track who handles leads  
3. **Add `campaign_source` field** for attribution
4. **Create DynamoDB GSI** on `timestamp` for faster date queries

## Backend Architecture Recommendations

### For Quick Implementation:
1. Add new endpoints to existing Lambda
2. Use DynamoDB queries with date filtering
3. Cache results in DynamoDB with 5-minute TTL
4. Return hardcoded data where real data isn't available yet

### Don't Block On:
- Perfect data accuracy (we can refine later)
- Real-time updates (polling every 30s is fine)
- Complex aggregations (simple counts/sums are enough)

## Testing Checklist
- [ ] CORS allows requests from Amplify URL
- [ ] JWT tokens authenticate properly
- [ ] Admin endpoints check for admin role
- [ ] Stats endpoint returns data
- [ ] Analytics endpoint returns time-series data
- [ ] Frontend can display the data

## Need Help?
1. Check existing code examples in `index.js`
2. Use the auth pattern from `/auth` routes
3. Frontend is ready to integrate immediately
4. We can work with mock data initially

## Remember
The app is **completely non-functional** until CORS is fixed. This should take less than 30 minutes but blocks everything else. Please prioritize this above all else.

Once CORS is working, we can iterate quickly on the endpoints. Frontend will work with whatever data structure you provide - we can adjust as needed. 