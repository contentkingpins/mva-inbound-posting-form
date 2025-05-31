# Missing Endpoints Specifications
## Total: 38 Endpoints Required

---

## 🔔 NOTIFICATION SYSTEM (4 endpoints)

### 1. GET /api/notifications/latest
**What it is**: Fetches the most recent notifications for the current user  
**What it does**: Returns an array of notification objects with unread notifications first, limited to last 30 days  
**Expected Response**:
```json
{
  "notifications": [
    {
      "id": "string",
      "type": "lead_assigned|system_update|goal_achieved|warning|info",
      "title": "string",
      "message": "string",
      "timestamp": "ISO-8601",
      "read": boolean,
      "priority": "high|medium|low",
      "data": { /* context-specific data */ }
    }
  ],
  "unreadCount": number
}
```

### 2. POST /api/notifications/mark-read
**What it is**: Marks one or more notifications as read  
**What it does**: Updates notification read status in database  
**Request Body**:
```json
{
  "notificationIds": ["id1", "id2"] // or single "notificationId": "id"
}
```
**Response**: `{ "success": true, "updatedCount": number }`

### 3. GET /api/notifications/count
**What it is**: Gets count of unread notifications  
**What it does**: Returns just the number of unread notifications for badge display  
**Response**: `{ "unreadCount": number }`

### 4. POST /api/notifications/subscribe
**What it is**: WebSocket subscription endpoint for real-time notifications  
**What it does**: Establishes WebSocket connection for push notifications  
**Request**: WebSocket upgrade request with auth token  
**Response**: WebSocket connection with notification events

---

## 📋 LEAD ASSIGNMENT & OPERATIONS (6 endpoints)

### 5. POST /api/leads/{id}/assign
**What it is**: Assigns a single lead to an agent  
**What it does**: Updates lead ownership and sends notification to assigned agent  
**Request Body**:
```json
{
  "agentId": "string",
  "notes": "optional assignment notes"
}
```
**Response**: Updated lead object with assignment details

### 6. POST /api/leads/bulk-assign
**What it is**: Assigns multiple leads to one or more agents  
**What it does**: Batch assignment with round-robin or manual distribution  
**Request Body**:
```json
{
  "leadIds": ["id1", "id2"],
  "agentIds": ["agent1", "agent2"],
  "assignmentMethod": "round-robin|manual|load-balanced",
  "assignments": [ // for manual method
    {"leadId": "id1", "agentId": "agent1"}
  ]
}
```
**Response**: `{ "success": true, "assigned": number, "errors": [] }`

### 7. POST /api/leads/bulk-update
**What it is**: Updates multiple leads with same field values  
**What it does**: Batch update operation for status, tags, or other fields  
**Request Body**:
```json
{
  "leadIds": ["id1", "id2"],
  "updates": {
    "status": "new-status",
    "tags": ["tag1", "tag2"],
    // any other lead fields
  }
}
```
**Response**: `{ "success": true, "updated": number, "errors": [] }`

### 8. POST /api/leads/bulk-export
**What it is**: Exports filtered leads to CSV/Excel  
**What it does**: Creates background export job with filters  
**Request Body**:
```json
{
  "filters": {
    "status": ["active", "pending"],
    "dateRange": { "start": "ISO-8601", "end": "ISO-8601" },
    "agentIds": ["agent1"],
    "tags": ["tag1"]
  },
  "format": "csv|xlsx",
  "fields": ["name", "email", "status"] // specific fields to export
}
```
**Response**: `{ "exportId": "string", "status": "processing" }`

### 9. GET /api/exports/{id}/status
**What it is**: Checks status of export job  
**What it does**: Returns current status and progress of export  
**Response**:
```json
{
  "exportId": "string",
  "status": "processing|completed|failed",
  "progress": 75,
  "fileSize": 1024000,
  "downloadUrl": "string" // when completed
}
```

### 10. GET /api/exports/{id}/download
**What it is**: Downloads completed export file  
**What it does**: Returns file download stream  
**Response**: Binary file stream with appropriate headers

---

## 🔍 ADVANCED SEARCH & FILTERING (4 endpoints)

### 11. POST /api/leads/advanced-search
**What it is**: Complex search with multiple criteria  
**What it does**: Searches leads using various filters and conditions  
**Request Body**:
```json
{
  "query": "search text",
  "filters": {
    "conditions": [
      {
        "field": "status",
        "operator": "equals|contains|greater_than|less_than|between",
        "value": "active"
      }
    ],
    "logic": "AND|OR"
  },
  "sort": { "field": "createdAt", "order": "desc" },
  "pagination": { "page": 1, "limit": 50 }
}
```
**Response**: Paginated lead results with total count

### 12. GET /api/search/suggestions
**What it is**: Auto-complete suggestions for search  
**What it does**: Returns relevant suggestions based on partial input  
**Query Params**: `?q=partial-search&type=leads|agents|all&limit=10`  
**Response**:
```json
{
  "suggestions": [
    {
      "type": "lead|agent|tag",
      "value": "string",
      "label": "display text",
      "metadata": {}
    }
  ]
}
```

### 13. POST /api/filters/save
**What it is**: Saves a filter preset  
**What it does**: Stores filter configuration for reuse  
**Request Body**:
```json
{
  "name": "My Filter",
  "description": "optional",
  "filters": { /* filter object */ },
  "isPublic": false
}
```
**Response**: Created filter object with ID

### 14. GET /api/filters/presets
**What it is**: Gets saved filter presets  
**What it does**: Returns user's saved filters and public filters  
**Response**:
```json
{
  "userFilters": [...],
  "publicFilters": [...],
  "recentFilters": [...]
}
```

---

## 📄 FILE MANAGEMENT (3 endpoints)

### 15. POST /api/leads/{id}/documents
**What it is**: Upload documents for a lead  
**What it does**: Handles file upload and associates with lead  
**Request**: Multipart form data with file(s)  
**Form Fields**:
- `file`: File binary
- `documentType`: "contract|id|other"
- `description`: Optional description
**Response**:
```json
{
  "documentId": "string",
  "filename": "string",
  "size": number,
  "uploadedAt": "ISO-8601"
}
```

### 16. GET /api/leads/{id}/documents
**What it is**: Lists all documents for a lead  
**What it does**: Returns document metadata for lead  
**Response**:
```json
{
  "documents": [
    {
      "id": "string",
      "filename": "string",
      "documentType": "string",
      "size": number,
      "uploadedBy": "user-name",
      "uploadedAt": "ISO-8601",
      "downloadUrl": "signed-url"
    }
  ]
}
```

### 17. DELETE /api/documents/{id}
**What it is**: Deletes a document  
**What it does**: Removes document from storage and database  
**Response**: `{ "success": true, "message": "Document deleted" }`

---

## 🤖 WORKFLOW AUTOMATION (6 endpoints)

### 18. GET /api/workflows
**What it is**: Lists all workflows  
**What it does**: Returns workflows accessible to user  
**Response**:
```json
{
  "workflows": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "trigger": { "type": "string", "config": {} },
      "isActive": boolean,
      "createdBy": "string",
      "lastRun": "ISO-8601"
    }
  ]
}
```

### 19. POST /api/workflows
**What it is**: Creates new automation workflow  
**What it does**: Saves workflow configuration  
**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "trigger": {
    "type": "lead_created|lead_updated|schedule|manual",
    "config": { /* trigger-specific config */ }
  },
  "conditions": [ /* array of conditions */ ],
  "actions": [ /* array of actions */ ],
  "isActive": boolean
}
```
**Response**: Created workflow object

### 20. PUT /api/workflows/{id}
**What it is**: Updates existing workflow  
**What it does**: Modifies workflow configuration  
**Request Body**: Same as POST  
**Response**: Updated workflow object

### 21. DELETE /api/workflows/{id}
**What it is**: Deletes a workflow  
**What it does**: Removes workflow (keeps history)  
**Response**: `{ "success": true }`

### 22. POST /api/workflows/{id}/execute
**What it is**: Manually triggers workflow execution  
**What it does**: Runs workflow immediately  
**Request Body**:
```json
{
  "targetIds": ["lead1", "lead2"], // optional specific targets
  "parameters": {} // optional runtime parameters
}
```
**Response**: `{ "executionId": "string", "status": "started" }`

### 23. GET /api/workflows/{id}/history
**What it is**: Gets workflow execution history  
**What it does**: Returns past executions with results  
**Response**:
```json
{
  "executions": [
    {
      "id": "string",
      "startedAt": "ISO-8601",
      "completedAt": "ISO-8601",
      "status": "success|failed|partial",
      "affectedItems": number,
      "errors": []
    }
  ]
}
```

---

## 👥 COLLABORATION & REAL-TIME (5 endpoints)

### 24. WebSocket /ws/presence
**What it is**: User presence tracking  
**What it does**: Shows who's online and their current activity  
**WebSocket Events**:
- Send: `{ "type": "status", "data": { "status": "online|away", "currentPage": "string" }}`
- Receive: `{ "type": "presence", "users": [ /* online users */ ]}`

### 25. WebSocket /ws/updates
**What it is**: Real-time data updates  
**What it does**: Pushes data changes to connected clients  
**WebSocket Events**:
- Receive: `{ "type": "lead_updated|lead_created", "data": { /* entity data */ }}`

### 26. POST /api/comments
**What it is**: Adds comment to entity  
**What it does**: Creates comment on lead/task/etc  
**Request Body**:
```json
{
  "entityType": "lead|task|workflow",
  "entityId": "string",
  "comment": "string",
  "mentions": ["@user1", "@user2"]
}
```
**Response**: Created comment object

### 27. GET /api/leads/{id}/comments
**What it is**: Gets comments for a lead  
**What it does**: Returns all comments with user info  
**Response**:
```json
{
  "comments": [
    {
      "id": "string",
      "author": { "id": "string", "name": "string", "avatar": "url" },
      "comment": "string",
      "createdAt": "ISO-8601",
      "mentions": ["@user1"]
    }
  ]
}
```

### 28. GET /api/activities/timeline
**What it is**: Activity timeline/feed  
**What it does**: Returns chronological activity stream  
**Query Params**: `?type=all|leads|system&limit=50&before=timestamp`  
**Response**:
```json
{
  "activities": [
    {
      "id": "string",
      "type": "lead_created|comment_added|status_changed",
      "actor": { "id": "string", "name": "string" },
      "description": "string",
      "metadata": {},
      "timestamp": "ISO-8601"
    }
  ]
}
```

---

## 📊 SYSTEM MONITORING (4 endpoints)

### 29. POST /api/errors/report
**What it is**: Frontend error reporting  
**What it does**: Logs client-side errors for debugging  
**Request Body**:
```json
{
  "error": {
    "message": "string",
    "stack": "string",
    "userAgent": "string",
    "url": "string",
    "timestamp": "ISO-8601"
  },
  "context": {
    "userId": "string",
    "action": "what user was doing"
  }
}
```
**Response**: `{ "errorId": "string", "logged": true }`

### 30. GET /api/health
**What it is**: System health check  
**What it does**: Returns system status and component health  
**Response**:
```json
{
  "status": "healthy|degraded|down",
  "components": {
    "database": "up",
    "cache": "up",
    "storage": "up"
  },
  "version": "1.0.0",
  "uptime": 86400
}
```

### 31. POST /api/analytics/events
**What it is**: User activity tracking  
**What it does**: Records user interactions for analytics  
**Request Body**:
```json
{
  "event": "page_view|button_click|feature_used",
  "properties": {
    "page": "string",
    "action": "string",
    /* custom properties */
  },
  "timestamp": "ISO-8601"
}
```
**Response**: `{ "tracked": true }`

### 32. POST /api/feedback
**What it is**: User feedback submission  
**What it does**: Collects user feedback and suggestions  
**Request Body**:
```json
{
  "type": "bug|feature|general",
  "subject": "string",
  "message": "string",
  "attachments": ["base64-screenshots"],
  "metadata": {
    "page": "current-page",
    "browser": "user-agent"
  }
}
```
**Response**: `{ "feedbackId": "string", "status": "submitted" }`

---

## 📈 ADVANCED ADMIN ANALYTICS (8 endpoints)

### 33. GET /admin/analytics/kpis?period={days}
**What it is**: Admin KPI dashboard data  
**What it does**: Returns high-level KPIs for specified period  
**Response**:
```json
{
  "revenue": { "total": number, "change": percentage },
  "leads": { "total": number, "change": percentage },
  "conversionRate": { "rate": percentage, "change": percentage },
  "avgDealSize": { "amount": number, "change": percentage }
}
```

### 34. GET /admin/analytics/funnel?period={days}
**What it is**: Conversion funnel analysis  
**What it does**: Returns funnel stages with conversion rates  
**Response**:
```json
{
  "stages": [
    {
      "name": "New Lead",
      "count": number,
      "percentage": 100,
      "conversionRate": percentage
    }
  ],
  "overallConversion": percentage
}
```

### 35. GET /admin/analytics/lead-sources?period={days}
**What it is**: Lead source performance analysis  
**What it does**: Breaks down leads and revenue by source  
**Response**:
```json
{
  "sources": [
    {
      "name": "string",
      "leads": number,
      "revenue": number,
      "conversionRate": percentage,
      "avgValue": number
    }
  ]
}
```

### 36. GET /admin/analytics/agents?metric={metric}&period={days}
**What it is**: Agent performance leaderboard  
**What it does**: Ranks agents by specified metric  
**Query Params**: `metric=revenue|leads|conversion|activity`  
**Response**:
```json
{
  "leaderboard": [
    {
      "agentId": "string",
      "agentName": "string",
      "rank": number,
      "value": number,
      "change": percentage,
      "details": { /* metric-specific details */ }
    }
  ]
}
```

### 37. GET /admin/analytics/publishers?period={days}
**What it is**: Publisher ROI analysis  
**What it does**: Shows publisher performance and ROI  
**Response**:
```json
{
  "publishers": [
    {
      "publisherId": "string",
      "name": "string",
      "leads": number,
      "cost": number,
      "revenue": number,
      "roi": percentage,
      "qualityScore": number
    }
  ]
}
```

### 38. GET /admin/analytics/predictions
**What it is**: Predictive analytics  
**What it does**: ML-based predictions for revenue and trends  
**Response**:
```json
{
  "predictions": {
    "revenue": {
      "next30Days": number,
      "next90Days": number,
      "confidence": percentage
    },
    "leadVolume": {
      "trend": "increasing|stable|decreasing",
      "expectedChange": percentage
    }
  }
}
```

### 39. GET /admin/analytics/lead-quality?period={days}
**What it is**: Lead quality metrics  
**What it does**: Analyzes lead quality by various factors  
**Response**:
```json
{
  "qualityMetrics": {
    "averageScore": number,
    "distribution": {
      "high": percentage,
      "medium": percentage,
      "low": percentage
    },
    "topFactors": [ /* factors affecting quality */ ]
  }
}
```

### 40. GET /admin/analytics/revenue-trends?period={days}&forecast={days}
**What it is**: Revenue trends and forecasting  
**What it does**: Historical trends with future projections  
**Response**:
```json
{
  "historical": [
    { "date": "ISO-8601", "revenue": number }
  ],
  "forecast": [
    { "date": "ISO-8601", "revenue": number, "confidence": percentage }
  ],
  "insights": [ /* AI-generated insights */ ]
}
```

---

## 🔑 GENERAL REQUIREMENTS FOR ALL ENDPOINTS

1. **Authentication**: All endpoints require Bearer token in Authorization header
2. **Error Responses**: Consistent error format:
   ```json
   {
     "error": {
       "code": "ERROR_CODE",
       "message": "Human readable message",
       "details": {}
     }
   }
   ```
3. **CORS Headers**: Must include proper CORS headers for browser access
4. **Rate Limiting**: Consider implementing rate limits, especially for analytics
5. **Caching**: Analytics endpoints should support cache headers
6. **Pagination**: List endpoints should support standard pagination params
7. **Validation**: All inputs must be validated with clear error messages 