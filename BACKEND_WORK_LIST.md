# Backend Work Needed for CRM

## Database Changes
- [ ] Add `lead_value` field to leads table (default: 35.00)
- [ ] Add `campaign_source` field to leads table
- [ ] Add `assigned_agent` field to leads table  
- [ ] Add `closed_date` field to leads table
- [ ] Create indexes on timestamp, disposition, vendor_code

## Lead Management Endpoints
- [ ] GET /leads - List leads with filtering (status, vendor, date range)
- [ ] POST /leads - Create new lead
- [ ] PATCH /leads/{id} - Update lead (disposition, notes, assigned agent)
- [ ] DELETE /leads/{id} - Delete lead
- [ ] GET /leads/{id} - Get single lead details

## Admin Dashboard Endpoints
- [ ] GET /admin/stats - Current metrics (revenue, CPA, agents online, conversion rate)
- [ ] GET /admin/analytics - Time series data (daily/weekly/monthly leads & revenue)

## Agency Management Endpoints
- [ ] GET /agencies - List all agencies with performance metrics
- [ ] GET /agencies/{code} - Single agency details
- [ ] PATCH /agencies/{code} - Update agency settings

## Pricing Endpoints
- [ ] GET /pricing - Get current pricing configuration
- [ ] POST /pricing - Update pricing (default, smart, custom by vendor)
- [ ] GET /pricing/calculate - Calculate price for a lead

## Agent Management Endpoints  
- [ ] GET /agents - List agents with performance
- [ ] GET /agents/{id} - Agent details
- [ ] PATCH /agents/{id} - Update agent status

## Reporting Endpoints
- [ ] GET /reports/export - Generate CSV/PDF export
- [ ] GET /reports/summary - Period summaries

## Required for ALL Endpoints
- [ ] Add CORS headers to every response
- [ ] JWT validation on every request
- [ ] Role-based access (admin vs vendor filtering)
- [ ] Error handling with proper status codes

## That's It
No microservices. No complex architecture. Just Lambda functions that query DynamoDB and return JSON. 