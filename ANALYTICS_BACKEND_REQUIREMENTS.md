# Analytics Dashboard Backend Requirements

## Overview
The analytics dashboard currently uses simulated data for demonstration. Here's what would be needed to connect it to real backend systems.

## Required API Endpoints

### 1. Metrics Endpoints
```
GET /api/analytics/metrics
```
Returns current day metrics:
- Total leads today
- Conversion rate
- Average response time
- Active agents count
- Percentage changes from previous period

### 2. Lead Volume Data
```
GET /api/analytics/lead-volume?period=30d|7d|24h
```
Returns time-series data:
- Timestamps
- New leads count
- Conversions count

### 3. Conversion Funnel
```
GET /api/analytics/conversion-funnel?period=month
```
Returns funnel stages:
- New leads
- Contacted
- Qualified
- Retained
- Completed

### 4. Activity Heatmap
```
GET /api/analytics/activity-heatmap?period=week
```
Returns hourly activity data for the week

### 5. Leaderboard
```
GET /api/analytics/leaderboard?period=today|week|month|all-time
```
Returns ranked agents with:
- Agent name and ID
- Total leads
- Converted leads
- Conversion rate
- Average response time
- Trend data

### 6. Activity Feed (WebSocket)
```
ws://api/analytics/activity-stream
```
Real-time events:
- New lead notifications
- Status changes
- Agent actions
- Conversion events

## Database Schema Requirements

### Analytics Tables Needed:
1. **lead_events** - Track all lead state changes
2. **agent_performance** - Daily/hourly agent metrics
3. **conversion_tracking** - Funnel stage timestamps
4. **response_times** - First contact metrics

### Indexes Required:
- Timestamp indexes for time-series queries
- Agent ID indexes for leaderboard
- Lead status indexes for funnel analysis

## Real-time Infrastructure

### Option 1: WebSockets
- AWS API Gateway WebSocket APIs
- Lambda functions for message handling
- DynamoDB for connection management

### Option 2: Server-Sent Events (SSE)
- Simpler one-way communication
- Good for activity feed and metric updates

### Option 3: Polling + Caching
- Redis/ElastiCache for caching
- 5-second polling intervals
- Lower complexity, higher latency

## Performance Considerations

### Caching Strategy:
- Cache leaderboard data (5-minute TTL)
- Cache aggregate metrics (1-minute TTL)  
- Pre-calculate common time ranges

### Data Aggregation:
- Use materialized views for common queries
- Background jobs for metric calculation
- Time-based partitioning for large datasets

## Implementation Steps

1. **Phase 1: Basic Metrics**
   - Implement core API endpoints
   - Add database tracking
   - Connect frontend to real APIs

2. **Phase 2: Real-time Updates**
   - Implement WebSocket infrastructure
   - Add event streaming
   - Update frontend for live data

3. **Phase 3: Advanced Analytics**
   - Add predictive metrics
   - Implement custom date ranges
   - Add export functionality

## Security Considerations

- Rate limiting on API endpoints
- Authentication for WebSocket connections
- Role-based data filtering (agents see own data + aggregate)
- Data anonymization for leaderboard privacy options

## Estimated Backend Work

- **API Development**: 3-5 days
- **Database Setup**: 2-3 days
- **Real-time Infrastructure**: 3-4 days
- **Testing & Integration**: 2-3 days
- **Total**: 10-15 days for full implementation

## Alternative: Quick Start with Mock Backend

For faster deployment, create a mock backend that:
1. Generates realistic data patterns
2. Simulates real-time updates
3. Persists data in localStorage
4. Can be replaced with real APIs later

This approach allows immediate use while real backend is developed. 