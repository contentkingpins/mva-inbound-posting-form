# Backend Implementation Checklist

## ✅ Week 1: Make It Work

### Database (Day 1)
- [ ] Add `lead_value` field (DEFAULT 35.00)
- [ ] Add `campaign_source` field  
- [ ] Add `assigned_agent` field
- [ ] Add `closed_date` field
- [ ] Create indexes on timestamp, status, vendor_code

### Lead Endpoints (Day 2-3)
- [ ] GET /leads (with pagination)
- [ ] POST /leads (create new)
- [ ] PATCH /leads/{id} (update)
- [ ] GET /leads/{id} (single lead)

### Test & Deploy (Day 4-5)
- [ ] Add CORS headers to all endpoints
- [ ] Test with frontend URL
- [ ] Deploy to production

## 📊 Week 2: Admin Dashboard Data

### Stats Endpoint (Day 1-2)
- [ ] GET /admin/stats
  - [ ] Calculate total revenue (closed leads × $35)
  - [ ] Count total leads
  - [ ] Count agents (from users table)
  - [ ] Calculate conversion rate
  - [ ] Compare to last month

### Analytics Endpoint (Day 3-4)
- [ ] GET /admin/analytics?period=week
  - [ ] Generate date labels
  - [ ] Count leads per day
  - [ ] Sum revenue per day
  - [ ] Return as arrays

### Agencies Endpoint (Day 5)
- [ ] GET /agencies
  - [ ] Group leads by vendor_code
  - [ ] Count and calculate per vendor
  - [ ] Return array

## 💰 Week 3: Advanced Features

### Pricing (Day 1-2)
- [ ] Create pricing tables
- [ ] GET /pricing
- [ ] PUT /pricing/default
- [ ] PUT /pricing/vendor/{code}

### Agents (Day 3-4)
- [ ] GET /agents (list with stats)
- [ ] POST /agents/invite
- [ ] DELETE /agents/{id}

### Reports (Day 5)
- [ ] GET /reports/summary
- [ ] GET /reports/export

## 🔴 Non-Negotiable Requirements

### Every Endpoint MUST Have:
```javascript
// 1. CORS Headers
'Access-Control-Allow-Origin': 'https://main.d21xta9fg9b6w.amplifyapp.com'
'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
'Access-Control-Allow-Headers': 'Content-Type, Authorization'

// 2. JWT Validation
if (!validateJWT(token)) return 401;

// 3. Role Checking (admin endpoints)
if (endpoint.startsWith('/admin') && user.role !== 'admin') return 403;

// 4. Vendor Filtering (non-admins)
if (user.role !== 'admin') {
  leads = leads.filter(l => l.vendor_code === user.vendor_code);
}
```

## 📝 Response Formats

### Lead Object
```json
{
  "lead_id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@email.com",
  "phone_home": "555-1234",
  "vendor_code": "ACME",
  "disposition": "New",
  "lead_value": 35.00,
  "assigned_agent": "agent@email.com",
  "created_date": "2024-01-01T00:00:00Z",
  "notes": "string"
}
```

### Stats Object
```json
{
  "revenue": {"total": 42350, "change": 12.5},
  "agents": {"total": 23, "online": 12},
  "conversion": {"rate": 68, "change": 5.3}
}
```

### Analytics Object
```json
{
  "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "leads": [45, 52, 48, 61, 55, 42, 38],
  "revenue": [1575, 1820, 1680, 2135, 1925, 1470, 1330]
}
```

## 🚨 Definition of Done

Each endpoint is DONE when:
1. ✅ Returns correct data format
2. ✅ Has CORS headers
3. ✅ Validates JWT tokens
4. ✅ Filters by vendor_code (if applicable)
5. ✅ Handles errors properly
6. ✅ Works from frontend URL
7. ✅ Deployed to production

## 📞 Daily Check-ins

Backend reports status on:
1. What endpoint they're working on
2. Any blockers
3. Expected completion time
4. What's next

No surprises. No excuses. Just execution. 