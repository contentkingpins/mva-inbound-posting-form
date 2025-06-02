# 🔍📊 Phase 2 API Documentation - Advanced Search & Export

## Overview
Phase 2 introduces 10 new API endpoints that provide advanced search capabilities and a comprehensive export system. All endpoints require JWT authentication and implement role-based access control.

---

## 🔍 **SEARCH ENDPOINTS** (5 endpoints)

### 1. **POST /api/leads/search** - Advanced Multi-Criteria Search

**Description:** Perform complex searches with multiple filter criteria, text search, date ranges, and advanced filtering options.

**Authentication:** Required (Bearer token)  
**Roles:** All authenticated users  
**Rate Limit:** 100 requests/minute  

#### Request Format:
```json
{
  "searchCriteria": {
    "text": "john smith",
    "dateRange": {
      "field": "created_date",
      "startDate": "2024-01-01",
      "endDate": "2024-12-31"
    },
    "dispositions": ["new", "contacted", "qualified"],
    "agentFilter": {
      "type": "specific",
      "agents": ["agent1@company.com", "agent2@company.com"]
    },
    "valueRange": {
      "min": 1000,
      "max": 50000
    },
    "campaignSources": ["google-ads", "facebook"],
    "priorities": ["high", "urgent"],
    "vendors": ["vendor1@company.com"]
  },
  "sortBy": "created_date",
  "sortOrder": "desc",
  "limit": 50,
  "lastEvaluatedKey": "base64-encoded-pagination-key"
}
```

#### Response Format:
```json
{
  "success": true,
  "leads": [
    {
      "lead_id": "lead_123",
      "first_name": "John",
      "last_name": "Smith",
      "email": "john.smith@example.com",
      "phone": "(555) 123-4567",
      "disposition": "qualified",
      "created_date": "2024-01-15T10:30:00Z",
      "assigned_agent": "agent1@company.com",
      "lead_value": 25000,
      "campaign_source": "google-ads",
      "priority": "high"
    }
  ],
  "pagination": {
    "count": 25,
    "limit": 50,
    "hasMore": true,
    "nextKey": "eyJsZWFkX2lkIjoibGVhZF8xMjMifQ=="
  },
  "searchCriteria": { /* echoed search criteria */ },
  "performance": {
    "searchTime": "245ms",
    "scannedCount": 1500,
    "returnedCount": 25
  },
  "sortBy": "created_date",
  "sortOrder": "desc"
}
```

#### Search Criteria Options:

**Text Search:**
- Searches across: `first_name`, `last_name`, `email`, `phone`, `notes`
- Case-insensitive partial matching

**Date Range Fields:**
- `created_date`, `updated_date`, `assigned_at`, `closed_date`
- Format: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)

**Agent Filter Types:**
- `all` - All leads
- `assigned` - Leads assigned to any agent
- `unassigned` - Leads not assigned to any agent
- `specific` - Leads assigned to specific agents (provide array)

**Role-Based Filtering:**
- **Admin:** Can search all leads
- **Agent:** Can only search assigned leads
- **Vendor:** Can only search their own leads

---

### 2. **GET /api/leads/filters** - Get Available Filter Options

**Description:** Retrieve all available filter options for dropdowns and dynamic filter building.

**Authentication:** Required (Bearer token)  
**Roles:** All authenticated users  

#### Request:
```
GET /api/leads/filters
```

#### Response Format:
```json
{
  "success": true,
  "filters": {
    "dispositions": ["new", "contacted", "qualified", "closed-won", "closed-lost"],
    "campaignSources": ["google-ads", "facebook", "linkedin", "referral"],
    "vendors": ["vendor1@company.com", "vendor2@company.com"],
    "assignedAgents": ["agent1@company.com", "agent2@company.com"],
    "priorities": ["low", "normal", "high", "urgent"],
    "allAgents": [
      {
        "email": "agent1@company.com",
        "name": "John Agent",
        "availability": "active"
      }
    ]
  },
  "dateFields": [
    { "value": "created_date", "label": "Created Date" },
    { "value": "updated_date", "label": "Updated Date" },
    { "value": "assigned_at", "label": "Assigned Date" },
    { "value": "closed_date", "label": "Closed Date" }
  ],
  "agentFilterTypes": [
    { "value": "all", "label": "All Leads" },
    { "value": "assigned", "label": "Assigned to Agent" },
    { "value": "unassigned", "label": "Unassigned" },
    { "value": "specific", "label": "Specific Agents" }
  ]
}
```

---

### 3. **POST /api/leads/search/saved** - Save Search Template

**Description:** Save a search configuration as a reusable template.

**Authentication:** Required (Bearer token)  
**Roles:** All authenticated users  

#### Request Format:
```json
{
  "searchName": "High Value New Leads",
  "description": "Leads over $10k created in the last 30 days",
  "searchCriteria": {
    "valueRange": { "min": 10000 },
    "dispositions": ["new"],
    "dateRange": {
      "field": "created_date",
      "startDate": "2024-01-01"
    }
  },
  "isPublic": false
}
```

#### Response Format:
```json
{
  "success": true,
  "savedSearch": {
    "searchId": "search_user_1705123456789_abc123",
    "searchName": "High Value New Leads",
    "description": "Leads over $10k created in the last 30 days",
    "isPublic": false,
    "createdAt": "2024-01-13T10:30:45Z"
  }
}
```

---

### 4. **GET /api/leads/search/saved** - Get Saved Searches

**Description:** Retrieve user's saved search templates and public templates.

**Authentication:** Required (Bearer token)  
**Roles:** All authenticated users  

#### Request:
```
GET /api/leads/search/saved
```

#### Response Format:
```json
{
  "success": true,
  "savedSearches": [
    {
      "searchId": "search_user_1705123456789_abc123",
      "searchName": "High Value New Leads",
      "description": "Leads over $10k created in the last 30 days",
      "searchCriteria": { /* full search criteria */ },
      "type": "personal",
      "isPublic": false,
      "createdBy": "user@company.com",
      "createdAt": "2024-01-13T10:30:45Z",
      "updatedAt": "2024-01-13T10:30:45Z",
      "usageCount": 5
    },
    {
      "searchId": "search_admin_1705000000000_xyz789",
      "searchName": "Monthly Review Search",
      "description": "Template for monthly lead reviews",
      "searchCriteria": { /* search criteria */ },
      "type": "public",
      "isPublic": true,
      "createdBy": "admin@company.com",
      "createdAt": "2024-01-10T09:00:00Z",
      "updatedAt": "2024-01-10T09:00:00Z",
      "usageCount": 23
    }
  ]
}
```

---

### 5. **DELETE /api/leads/search/saved/{id}** - Delete Saved Search

**Description:** Delete a saved search template. Users can only delete their own searches, admins can delete any.

**Authentication:** Required (Bearer token)  
**Roles:** All authenticated users (ownership validated)  

#### Request:
```
DELETE /api/leads/search/saved/search_user_1705123456789_abc123
```

#### Response Format:
```json
{
  "success": true,
  "message": "Saved search deleted successfully",
  "deletedSearchId": "search_user_1705123456789_abc123"
}
```

---

## 📊 **EXPORT ENDPOINTS** (5 endpoints)

### 6. **POST /api/leads/export** - Initiate Export Job

**Description:** Start an export job with custom formatting and filtering options.

**Authentication:** Required (Bearer token)  
**Roles:** All authenticated users  

#### Request Format:
```json
{
  "format": "csv",
  "filename": "leads_export_2024-01-13.csv",
  "fields": [
    "first_name", "last_name", "email", "phone", 
    "disposition", "created_date", "lead_value"
  ],
  "searchCriteria": {
    "dispositions": ["qualified", "closed-won"],
    "dateRange": {
      "field": "created_date",
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  },
  "includeHeaders": true,
  "notifyEmail": true
}
```

#### Response Format:
```json
{
  "success": true,
  "jobId": "export_user_company_com_1705123456789_abc123",
  "status": "queued",
  "message": "Export job queued for background processing",
  "itemCount": 1250,
  "estimatedCompletion": "2024-01-13T10:35:00Z",
  "format": "csv"
}
```

#### Export Formats:
- **`csv`** - Comma-separated values
- **`excel`** - Microsoft Excel (.xlsx)
- **`pdf`** - Portable Document Format

#### Field Options:
All lead fields are available. Common fields:
- `lead_id`, `first_name`, `last_name`, `email`, `phone`
- `created_date`, `updated_date`, `disposition`, `assigned_agent`
- `lead_value`, `campaign_source`, `vendor_code`, `priority`, `notes`

---

### 7. **GET /api/leads/export/{jobId}** - Check Export Status

**Description:** Get the current status and progress of an export job.

**Authentication:** Required (Bearer token)  
**Roles:** All authenticated users (ownership validated)  

#### Request:
```
GET /api/leads/export/export_user_company_com_1705123456789_abc123
```

#### Response Format:
```json
{
  "success": true,
  "job": {
    "jobId": "export_user_company_com_1705123456789_abc123",
    "status": "processing",
    "format": "csv",
    "filename": "leads_export_2024-01-13.csv",
    "itemCount": 1250,
    "progress": 65,
    "fileSize": null,
    "createdAt": "2024-01-13T10:30:00Z",
    "startedAt": "2024-01-13T10:30:15Z",
    "completedAt": null,
    "estimatedCompletion": "2024-01-13T10:35:00Z",
    "downloadUrl": null,
    "expiresAt": null,
    "errorMessage": null
  }
}
```

#### Status Values:
- **`queued`** - Job is waiting to be processed
- **`processing`** - Job is currently being processed
- **`completed`** - Job completed successfully
- **`failed`** - Job failed with error
- **`cancelled`** - Job was cancelled by user

---

### 8. **GET /api/leads/export/{jobId}/download** - Download Export File

**Description:** Get a secure download link for a completed export file.

**Authentication:** Required (Bearer token)  
**Roles:** All authenticated users (ownership validated)  

#### Request:
```
GET /api/leads/export/export_user_company_com_1705123456789_abc123/download
```

#### Response Format:
```json
{
  "success": true,
  "downloadUrl": "https://s3.amazonaws.com/mva-exports/signed-url-with-token",
  "filename": "leads_export_2024-01-13.csv",
  "fileSize": 2048576,
  "expiresIn": 3600
}
```

#### Security Features:
- Signed URLs with 1-hour expiration
- User ownership validation
- Download activity logging
- Automatic file cleanup after 30 days

---

### 9. **GET /api/leads/export/history** - Export Job History

**Description:** Get a paginated list of user's export jobs.

**Authentication:** Required (Bearer token)  
**Roles:** All authenticated users  

#### Request:
```
GET /api/leads/export/history?limit=20&lastEvaluatedKey=base64key
```

#### Response Format:
```json
{
  "success": true,
  "jobs": [
    {
      "jobId": "export_user_company_com_1705123456789_abc123",
      "status": "completed",
      "format": "csv",
      "filename": "leads_export_2024-01-13.csv",
      "itemCount": 1250,
      "fileSize": 2048576,
      "createdAt": "2024-01-13T10:30:00Z",
      "completedAt": "2024-01-13T10:33:45Z",
      "downloadCount": 3,
      "expiresAt": "2024-02-12T10:33:45Z",
      "errorMessage": null
    }
  ],
  "pagination": {
    "count": 20,
    "limit": 20,
    "hasMore": true,
    "nextKey": "eyJqb2JfaWQiOiJleHBvcnRfMTIzIn0="
  }
}
```

---

### 10. **DELETE /api/leads/export/{jobId}** - Cancel/Delete Export Job

**Description:** Cancel a queued/processing job or delete a completed job and its files.

**Authentication:** Required (Bearer token)  
**Roles:** All authenticated users (ownership validated)  

#### Request:
```
DELETE /api/leads/export/export_user_company_com_1705123456789_abc123
```

#### Response Format:
```json
{
  "success": true,
  "message": "Export job cancelled successfully",
  "jobId": "export_user_company_com_1705123456789_abc123"
}
```

---

## 🔒 **AUTHENTICATION & SECURITY**

### Headers Required:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Role-Based Access Control:

| Endpoint | Admin | Agent | Vendor | User |
|----------|-------|-------|--------|------|
| Search endpoints | ✅ All data | ✅ Assigned leads | ✅ Own leads | ❌ |
| Filter options | ✅ All options | ✅ Limited | ✅ Limited | ❌ |
| Save searches | ✅ | ✅ | ✅ | ❌ |
| Export endpoints | ✅ All data | ✅ Assigned leads | ✅ Own leads | ❌ |

### Security Features:
- JWT token validation on all endpoints
- Role-based data filtering
- User ownership validation for saved searches and exports
- Secure S3 signed URLs for downloads
- Rate limiting and request throttling
- Input validation and SQL injection prevention

---

## 📋 **ERROR HANDLING**

### Common Error Responses:

#### 401 Unauthorized:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

#### 403 Forbidden:
```json
{
  "error": "Not authorized to access this resource",
  "message": "User does not have permission for this operation"
}
```

#### 400 Bad Request:
```json
{
  "error": "Invalid search criteria",
  "message": "Date range start date must be before end date",
  "field": "dateRange.startDate"
}
```

#### 404 Not Found:
```json
{
  "error": "Export job not found",
  "jobId": "export_invalid_id"
}
```

#### 500 Server Error:
```json
{
  "error": "Failed to perform advanced search",
  "message": "Database connection error"
}
```

---

## 🚀 **INTEGRATION EXAMPLES**

### Frontend Search Integration:
```javascript
// Advanced search with multiple criteria
async function performAdvancedSearch(criteria) {
  const response = await fetch('/api/leads/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      searchCriteria: criteria,
      sortBy: 'created_date',
      sortOrder: 'desc',
      limit: 50
    })
  });
  
  return await response.json();
}

// Load filter options for dropdowns
async function loadFilterOptions() {
  const response = await fetch('/api/leads/filters', {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  });
  
  const data = await response.json();
  populateFilterDropdowns(data.filters);
}
```

### Export Workflow Example:
```javascript
// Initiate export
async function exportLeads(format, searchCriteria) {
  const exportJob = await fetch('/api/leads/export', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      format: format,
      searchCriteria: searchCriteria,
      includeHeaders: true,
      notifyEmail: true
    })
  });
  
  const job = await exportJob.json();
  
  // Monitor progress
  const progressInterval = setInterval(async () => {
    const status = await checkExportStatus(job.jobId);
    
    if (status.job.status === 'completed') {
      clearInterval(progressInterval);
      showDownloadLink(job.jobId);
    } else if (status.job.status === 'failed') {
      clearInterval(progressInterval);
      showError(status.job.errorMessage);
    } else {
      updateProgressBar(status.job.progress);
    }
  }, 2000);
}

async function checkExportStatus(jobId) {
  const response = await fetch(`/api/leads/export/${jobId}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  });
  return await response.json();
}
```

---

## 📊 **PERFORMANCE CONSIDERATIONS**

### Search Performance:
- Use pagination for large result sets (limit ≤ 100)
- Text searches are optimized but may be slower for very large datasets
- Date range filtering is highly optimized with GSI indexes
- Consider saved searches for frequently used filter combinations

### Export Performance:
- Small exports (< 1000 records) process immediately
- Large exports are queued for background processing
- Progress tracking available for all exports
- Email notifications recommended for large exports

### Rate Limits:
- Search endpoints: 100 requests/minute per user
- Export endpoints: 10 requests/minute per user
- Filter options: 20 requests/minute per user

---

## 🎯 **BEST PRACTICES**

### For Frontend Integration:
1. **Cache filter options** - Load once per session
2. **Implement progressive search** - Show results as user types
3. **Use saved searches** - Reduce repeated complex queries
4. **Monitor export progress** - Provide real-time feedback
5. **Handle errors gracefully** - Show user-friendly messages

### For Backend Performance:
1. **Use appropriate indexes** - Ensure GSI indexes are properly configured
2. **Implement caching** - Cache frequently accessed filter options
3. **Monitor metrics** - Track search/export performance
4. **Set up alarms** - Monitor queue depth and error rates

---

## ✅ **DEPLOYMENT CHECKLIST**

### Prerequisites:
- [ ] Phase 2 infrastructure deployed (CloudFormation)
- [ ] SavedSearches and ExportJobs tables created
- [ ] SQS queue and S3 bucket configured
- [ ] Export worker Lambda function deployed
- [ ] Environment variables updated

### Testing Checklist:
- [ ] All 10 endpoints respond correctly
- [ ] Authentication works for all endpoints
- [ ] Role-based filtering functions properly
- [ ] Search performance meets targets (< 500ms)
- [ ] Export jobs process successfully
- [ ] Email notifications work
- [ ] File downloads work with signed URLs

### Monitoring Setup:
- [ ] CloudWatch alarms configured
- [ ] Performance metrics tracking
- [ ] Error rate monitoring
- [ ] Queue depth monitoring

---

**🎉 Phase 2 API Documentation Complete!**  
**Ready for frontend integration and production deployment.** 