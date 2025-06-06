const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');

// Initialize AWS SDK v3 clients
const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);
const s3 = new S3Client({ region: 'us-east-1' });
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Environment variables
const LEADS_TABLE = process.env.LEADS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const DOCUMENTS_TABLE = process.env.DOCUMENTS_TABLE || 'Documents';
const DOCUMENT_ACTIVITY_TABLE = process.env.DOCUMENT_ACTIVITY_TABLE || 'DocumentActivity';
const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET || 'mva-documents';

// CORS headers
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://main.d21xta9fg9b6w.amplifyapp.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-api-key",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Content-Type": "application/json"
};

// Utility function to validate JWT token
function validateToken(event) {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No valid authorization header');
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

// Helper function to check if user has access to lead
async function validateLeadAccess(leadId, userEmail, userRole) {
  try {
    const getParams = {
      TableName: LEADS_TABLE,
      Key: { lead_id: leadId }
    };
    
    const result = await dynamodb.get(getParams).promise();
    
    if (!result.Item) {
      return { hasAccess: false, error: 'Lead not found' };
    }
    
    const lead = result.Item;
    
    // Role-based access control
    if (userRole === 'admin') {
      return { hasAccess: true, lead };
    } else if (userRole === 'agent') {
      if (lead.assigned_agent === userEmail) {
        return { hasAccess: true, lead };
      }
    } else if (userRole === 'vendor') {
      if (lead.vendor_code === userEmail) {
        return { hasAccess: true, lead };
      }
    }
    
    return { hasAccess: false, error: 'Access denied to this lead' };
    
  } catch (error) {
    console.error('Lead access validation error:', error);
    return { hasAccess: false, error: 'Failed to validate lead access' };
  }
}

// Helper function to get accessible leads for user
async function getAccessibleLeads(userEmail, userRole) {
  try {
    if (userRole === 'admin') {
      // Admin can access all leads
      const result = await dynamodb.scan({
        TableName: LEADS_TABLE,
        ProjectionExpression: 'lead_id'
      }).promise();
      return result.Items.map(item => item.lead_id);
    } else if (userRole === 'agent') {
      // Agent can access their assigned leads
      const result = await dynamodb.scan({
        TableName: LEADS_TABLE,
        FilterExpression: 'assigned_agent = :userEmail',
        ExpressionAttributeValues: {
          ':userEmail': userEmail
        },
        ProjectionExpression: 'lead_id'
      }).promise();
      return result.Items.map(item => item.lead_id);
    } else if (userRole === 'vendor') {
      // Vendor can access their leads
      const result = await dynamodb.scan({
        TableName: LEADS_TABLE,
        FilterExpression: 'vendor_code = :userEmail',
        ExpressionAttributeValues: {
          ':userEmail': userEmail
        },
        ProjectionExpression: 'lead_id'
      }).promise();
      return result.Items.map(item => item.lead_id);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting accessible leads:', error);
    return [];
  }
}

// Helper function to log document activity
async function logDocumentActivity(documentId, userEmail, activityType, metadata = {}) {
  try {
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const activity = {
      activity_id: activityId,
      document_id: documentId,
      user_email: userEmail,
      activity_type: activityType,
      timestamp: new Date().toISOString(),
      metadata: metadata
    };
    
    await dynamodb.put({
      TableName: DOCUMENT_ACTIVITY_TABLE,
      Item: activity
    }).promise();
    
  } catch (error) {
    console.error('Failed to log document activity:', error);
    // Don't fail the main operation if logging fails
  }
}

// POST /api/documents/search - Search documents across leads
exports.searchDocuments = async (event) => {
  console.log('Search documents request:', JSON.stringify(event, null, 2));
  
  // Validate authentication
  const user = validateToken(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');
    const {
      query = '',
      category = null,
      contentType = null,
      uploadedBy = null,
      dateRange = null,
      tags = [],
      leadIds = [],
      sortBy = 'uploaded_at',
      sortOrder = 'desc',
      limit = 50
    } = requestBody;
    
    const maxLimit = Math.min(limit, 100);
    
    // Get accessible leads for the user
    const accessibleLeads = await getAccessibleLeads(user.email, user.role);
    
    if (accessibleLeads.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          documents: [],
          totalCount: 0,
          message: 'No accessible documents found'
        })
      };
    }
    
    // Filter lead IDs if specified
    let targetLeads = accessibleLeads;
    if (leadIds.length > 0) {
      targetLeads = accessibleLeads.filter(leadId => leadIds.includes(leadId));
    }
    
    // Build search parameters for each lead
    const searchPromises = targetLeads.map(async (leadId) => {
      const queryParams = {
        TableName: DOCUMENTS_TABLE,
        IndexName: 'LeadDocumentsIndex',
        KeyConditionExpression: 'lead_id = :leadId',
        ExpressionAttributeValues: {
          ':leadId': leadId
        },
        ScanIndexForward: sortOrder === 'asc',
        Limit: maxLimit
      };
      
      // Build filter expressions
      const filterExpressions = [];
      
      // Always exclude deleted documents
      filterExpressions.push('is_deleted = :notDeleted');
      queryParams.ExpressionAttributeValues[':notDeleted'] = false;
      
      // Text search in filename and description
      if (query) {
        filterExpressions.push('(contains(#filename, :query) OR contains(description, :query))');
        queryParams.ExpressionAttributeValues[':query'] = query;
        queryParams.ExpressionAttributeNames = {
          '#filename': 'filename'
        };
      }
      
      // Category filter
      if (category) {
        filterExpressions.push('document_category = :category');
        queryParams.ExpressionAttributeValues[':category'] = category;
      }
      
      // Content type filter
      if (contentType) {
        filterExpressions.push('content_type = :contentType');
        queryParams.ExpressionAttributeValues[':contentType'] = contentType;
      }
      
      // Uploaded by filter
      if (uploadedBy) {
        filterExpressions.push('uploaded_by = :uploadedBy');
        queryParams.ExpressionAttributeValues[':uploadedBy'] = uploadedBy;
      }
      
      // Date range filter
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        filterExpressions.push('uploaded_at BETWEEN :startDate AND :endDate');
        queryParams.ExpressionAttributeValues[':startDate'] = dateRange.startDate;
        queryParams.ExpressionAttributeValues[':endDate'] = dateRange.endDate;
      }
      
      // Tags filter (if any of the specified tags are present)
      if (tags.length > 0) {
        const tagConditions = tags.map((tag, index) => {
          queryParams.ExpressionAttributeValues[`:tag${index}`] = tag;
          return `contains(tags, :tag${index})`;
        }).join(' OR ');
        filterExpressions.push(`(${tagConditions})`);
      }
      
      if (filterExpressions.length > 0) {
        queryParams.FilterExpression = filterExpressions.join(' AND ');
      }
      
      return dynamodb.query(queryParams).promise();
    });
    
    // Execute all searches in parallel
    const searchResults = await Promise.allSettled(searchPromises);
    
    // Combine and flatten results
    let allDocuments = [];
    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value.Items) {
        allDocuments = allDocuments.concat(result.value.Items);
      }
    }
    
    // Sort combined results
    allDocuments.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      
      if (sortOrder === 'desc') {
        return bVal.localeCompare(aVal);
      } else {
        return aVal.localeCompare(bVal);
      }
    });
    
    // Limit results
    const limitedDocuments = allDocuments.slice(0, maxLimit);
    
    // Format response
    const formattedDocuments = limitedDocuments.map(doc => ({
      documentId: doc.document_id,
      leadId: doc.lead_id,
      filename: doc.filename,
      originalFilename: doc.original_filename,
      fileSize: doc.file_size,
      contentType: doc.content_type,
      category: doc.document_category,
      tags: doc.tags || [],
      description: doc.description || '',
      uploadedBy: doc.uploaded_by,
      uploadedAt: doc.uploaded_at,
      updatedAt: doc.updated_at,
      downloadCount: doc.download_count || 0,
      lastAccessed: doc.last_accessed,
      virusScanStatus: doc.virus_scan_status,
      thumbnailUrl: doc.thumbnail_s3_key ? s3.getSignedUrl('getObject', {
        Bucket: DOCUMENTS_BUCKET,
        Key: doc.thumbnail_s3_key,
        Expires: 3600
      }) : null
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        documents: formattedDocuments,
        totalCount: formattedDocuments.length,
        searchCriteria: {
          query,
          category,
          contentType,
          uploadedBy,
          dateRange,
          tags,
          leadIds: targetLeads,
          sortBy,
          sortOrder
        }
      })
    };
    
  } catch (error) {
    console.error('Search documents error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to search documents', 
        message: error.message 
      })
    };
  }
};

// GET /api/documents/analytics - Document usage analytics
exports.getDocumentAnalytics = async (event) => {
  console.log('Get document analytics request:', JSON.stringify(event, null, 2));
  
  // Validate authentication
  const user = validateToken(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  try {
    const queryParams = event.queryStringParameters || {};
    const timeframe = queryParams.timeframe || '30d'; // 7d, 30d, 90d, 1y
    const groupBy = queryParams.groupBy || 'day'; // day, week, month
    
    // Calculate date range based on timeframe
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    // Get accessible leads for the user
    const accessibleLeads = await getAccessibleLeads(user.email, user.role);
    
    if (accessibleLeads.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          analytics: {
            totalDocuments: 0,
            totalDownloads: 0,
            storageUsed: 0,
            activityTimeline: [],
            categoryBreakdown: {},
            topDocuments: [],
            userActivity: {}
          }
        })
      };
    }
    
    // Get documents for accessible leads
    const documentPromises = accessibleLeads.map(leadId => 
      dynamodb.query({
        TableName: DOCUMENTS_TABLE,
        IndexName: 'LeadDocumentsIndex',
        KeyConditionExpression: 'lead_id = :leadId',
        FilterExpression: 'is_deleted = :notDeleted',
        ExpressionAttributeValues: {
          ':leadId': leadId,
          ':notDeleted': false
        }
      }).promise()
    );
    
    const documentResults = await Promise.allSettled(documentPromises);
    let allDocuments = [];
    
    for (const result of documentResults) {
      if (result.status === 'fulfilled' && result.value.Items) {
        allDocuments = allDocuments.concat(result.value.Items);
      }
    }
    
    // Get activity data for the timeframe
    const activityParams = {
      TableName: DOCUMENT_ACTIVITY_TABLE,
      IndexName: 'UserActivityIndex',
      KeyConditionExpression: 'user_email = :userEmail AND #timestamp BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':userEmail': user.email,
        ':startDate': startDate.toISOString(),
        ':endDate': now.toISOString()
      }
    };
    
    let userActivity = [];
    if (user.role === 'admin') {
      // Admin can see all activity, so scan the entire activity table
      const activityResult = await dynamodb.scan({
        TableName: DOCUMENT_ACTIVITY_TABLE,
        FilterExpression: '#timestamp BETWEEN :startDate AND :endDate',
        ExpressionAttributeNames: {
          '#timestamp': 'timestamp'
        },
        ExpressionAttributeValues: {
          ':startDate': startDate.toISOString(),
          ':endDate': now.toISOString()
        }
      }).promise();
      userActivity = activityResult.Items || [];
    } else {
      // Non-admin users see their own activity
      const activityResult = await dynamodb.query(activityParams).promise();
      userActivity = activityResult.Items || [];
    }
    
    // Calculate analytics
    const totalDocuments = allDocuments.length;
    const totalDownloads = allDocuments.reduce((sum, doc) => sum + (doc.download_count || 0), 0);
    const storageUsed = allDocuments.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
    
    // Category breakdown
    const categoryBreakdown = {};
    allDocuments.forEach(doc => {
      const category = doc.document_category || 'uncategorized';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    });
    
    // Top documents by download count
    const topDocuments = allDocuments
      .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
      .slice(0, 10)
      .map(doc => ({
        documentId: doc.document_id,
        filename: doc.filename,
        downloadCount: doc.download_count || 0,
        lastAccessed: doc.last_accessed,
        category: doc.document_category
      }));
    
    // Activity timeline grouping
    const activityTimeline = {};
    userActivity.forEach(activity => {
      const date = new Date(activity.timestamp);
      let groupKey;
      
      switch (groupBy) {
        case 'day':
          groupKey = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          groupKey = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          groupKey = date.toISOString().split('T')[0];
      }
      
      if (!activityTimeline[groupKey]) {
        activityTimeline[groupKey] = {
          date: groupKey,
          uploads: 0,
          downloads: 0,
          views: 0,
          shares: 0,
          deletes: 0
        };
      }
      
      switch (activity.activity_type) {
        case 'upload_initiated':
        case 'upload_completed':
          activityTimeline[groupKey].uploads++;
          break;
        case 'downloaded':
          activityTimeline[groupKey].downloads++;
          break;
        case 'metadata_accessed':
          activityTimeline[groupKey].views++;
          break;
        case 'shared':
          activityTimeline[groupKey].shares++;
          break;
        case 'soft_deleted':
        case 'permanently_deleted':
          activityTimeline[groupKey].deletes++;
          break;
      }
    });
    
    // Convert timeline to array and sort
    const timelineArray = Object.values(activityTimeline).sort((a, b) => a.date.localeCompare(b.date));
    
    // User activity summary
    const userActivitySummary = {};
    userActivity.forEach(activity => {
      const userEmail = activity.user_email;
      if (!userActivitySummary[userEmail]) {
        userActivitySummary[userEmail] = {
          totalActions: 0,
          uploads: 0,
          downloads: 0,
          views: 0,
          shares: 0
        };
      }
      
      userActivitySummary[userEmail].totalActions++;
      
      switch (activity.activity_type) {
        case 'upload_initiated':
        case 'upload_completed':
          userActivitySummary[userEmail].uploads++;
          break;
        case 'downloaded':
          userActivitySummary[userEmail].downloads++;
          break;
        case 'metadata_accessed':
          userActivitySummary[userEmail].views++;
          break;
        case 'shared':
          userActivitySummary[userEmail].shares++;
          break;
      }
    });
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        analytics: {
          summary: {
            totalDocuments,
            totalDownloads,
            storageUsed,
            storageUsedFormatted: formatBytes(storageUsed),
            averageFileSize: totalDocuments > 0 ? Math.round(storageUsed / totalDocuments) : 0
          },
          activityTimeline: timelineArray,
          categoryBreakdown,
          topDocuments,
          userActivity: userActivitySummary,
          timeframe,
          generatedAt: new Date().toISOString()
        }
      })
    };
    
  } catch (error) {
    console.error('Get document analytics error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to retrieve document analytics', 
        message: error.message 
      })
    };
  }
};

// POST /api/documents/{documentId}/share - Generate shareable links
exports.shareDocument = async (event) => {
  console.log('Share document request:', JSON.stringify(event, null, 2));
  
  // Validate authentication
  const user = validateToken(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  try {
    const documentId = event.pathParameters.documentId;
    const requestBody = JSON.parse(event.body || '{}');
    const { 
      expirationHours = 24,
      allowDownload = true,
      requireAuth = false,
      note = ''
    } = requestBody;
    
    if (!documentId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing documentId parameter' })
      };
    }
    
    // Get document from database
    const getParams = {
      TableName: DOCUMENTS_TABLE,
      Key: { document_id: documentId }
    };
    
    const result = await dynamodb.get(getParams).promise();
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Document not found' })
      };
    }
    
    const document = result.Item;
    
    // Check if document is deleted
    if (document.is_deleted) {
      return {
        statusCode: 410,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Document has been deleted' })
      };
    }
    
    // Validate access to the lead
    const accessCheck = await validateLeadAccess(document.lead_id, user.email, user.role);
    if (!accessCheck.hasAccess) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Access denied to this document' })
      };
    }
    
    // Generate share link
    const shareId = crypto.randomBytes(32).toString('hex');
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + Math.max(1, Math.min(expirationHours, 168))); // Max 7 days
    
    // Create signed URL for the document
    const downloadUrl = s3.getSignedUrl('getObject', {
      Bucket: DOCUMENTS_BUCKET,
      Key: document.s3_key,
      Expires: expirationHours * 3600,
      ResponseContentDisposition: allowDownload 
        ? `attachment; filename="${document.original_filename}"`
        : `inline; filename="${document.original_filename}"`
    });
    
    // Store share information (in a real implementation, you'd want a shares table)
    const shareData = {
      shareId: shareId,
      documentId: documentId,
      sharedBy: user.email,
      sharedAt: new Date().toISOString(),
      expiresAt: expirationTime.toISOString(),
      allowDownload: allowDownload,
      requireAuth: requireAuth,
      note: note,
      accessCount: 0,
      isActive: true
    };
    
    // Log share activity
    await logDocumentActivity(documentId, user.email, 'shared', {
      shareId: shareId,
      expirationHours: expirationHours,
      allowDownload: allowDownload,
      requireAuth: requireAuth
    });
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        share: {
          shareId: shareId,
          shareUrl: `https://main.d21xta9fg9b6w.amplifyapp.com/shared/${shareId}`,
          downloadUrl: downloadUrl,
          document: {
            filename: document.original_filename,
            fileSize: document.file_size,
            contentType: document.content_type
          },
          settings: {
            expiresAt: expirationTime.toISOString(),
            allowDownload: allowDownload,
            requireAuth: requireAuth,
            note: note
          },
          sharedBy: user.email,
          sharedAt: new Date().toISOString()
        }
      })
    };
    
  } catch (error) {
    console.error('Share document error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to share document', 
        message: error.message 
      })
    };
  }
};

// GET /api/documents/recent - Recently uploaded/accessed documents
exports.getRecentDocuments = async (event) => {
  console.log('Get recent documents request:', JSON.stringify(event, null, 2));
  
  // Validate authentication
  const user = validateToken(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  try {
    const queryParams = event.queryStringParameters || {};
    const type = queryParams.type || 'uploaded'; // uploaded, accessed, modified
    const limit = Math.min(parseInt(queryParams.limit) || 20, 50);
    const days = Math.min(parseInt(queryParams.days) || 7, 30);
    
    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateThresholdISO = dateThreshold.toISOString();
    
    // Get accessible leads for the user
    const accessibleLeads = await getAccessibleLeads(user.email, user.role);
    
    if (accessibleLeads.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          documents: [],
          type: type,
          days: days
        })
      };
    }
    
    // Search documents across accessible leads
    const documentPromises = accessibleLeads.map(leadId => {
      let queryParams = {
        TableName: DOCUMENTS_TABLE,
        IndexName: 'LeadDocumentsIndex',
        KeyConditionExpression: 'lead_id = :leadId',
        ExpressionAttributeValues: {
          ':leadId': leadId,
          ':notDeleted': false,
          ':dateThreshold': dateThresholdISO
        },
        ScanIndexForward: false, // Latest first
        Limit: limit
      };
      
      // Filter based on type
      switch (type) {
        case 'uploaded':
          queryParams.FilterExpression = 'is_deleted = :notDeleted AND uploaded_at >= :dateThreshold';
          break;
        case 'accessed':
          queryParams.FilterExpression = 'is_deleted = :notDeleted AND last_accessed >= :dateThreshold';
          break;
        case 'modified':
          queryParams.FilterExpression = 'is_deleted = :notDeleted AND updated_at >= :dateThreshold';
          break;
        default:
          queryParams.FilterExpression = 'is_deleted = :notDeleted AND uploaded_at >= :dateThreshold';
      }
      
      return dynamodb.query(queryParams).promise();
    });
    
    const results = await Promise.allSettled(documentPromises);
    
    // Combine and sort results
    let allDocuments = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.Items) {
        allDocuments = allDocuments.concat(result.value.Items);
      }
    }
    
    // Sort by the appropriate date field
    const sortField = type === 'accessed' ? 'last_accessed' : 
                     type === 'modified' ? 'updated_at' : 'uploaded_at';
    
    allDocuments.sort((a, b) => {
      const aDate = a[sortField] || a.uploaded_at;
      const bDate = b[sortField] || b.uploaded_at;
      return new Date(bDate) - new Date(aDate);
    });
    
    // Limit results
    const limitedDocuments = allDocuments.slice(0, limit);
    
    // Format response
    const formattedDocuments = limitedDocuments.map(doc => ({
      documentId: doc.document_id,
      leadId: doc.lead_id,
      filename: doc.filename,
      originalFilename: doc.original_filename,
      fileSize: doc.file_size,
      contentType: doc.content_type,
      category: doc.document_category,
      tags: doc.tags || [],
      description: doc.description || '',
      uploadedBy: doc.uploaded_by,
      uploadedAt: doc.uploaded_at,
      updatedAt: doc.updated_at,
      lastAccessed: doc.last_accessed,
      downloadCount: doc.download_count || 0,
      virusScanStatus: doc.virus_scan_status,
      thumbnailUrl: doc.thumbnail_s3_key ? s3.getSignedUrl('getObject', {
        Bucket: DOCUMENTS_BUCKET,
        Key: doc.thumbnail_s3_key,
        Expires: 3600
      }) : null
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        documents: formattedDocuments,
        type: type,
        days: days,
        totalCount: formattedDocuments.length
      })
    };
    
  } catch (error) {
    console.error('Get recent documents error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to retrieve recent documents', 
        message: error.message 
      })
    };
  }
};

// PUT /api/documents/{documentId} - Update document metadata
exports.updateDocumentMetadata = async (event) => {
  console.log('Update document metadata request:', JSON.stringify(event, null, 2));
  
  // Validate authentication
  const user = validateToken(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  try {
    const documentId = event.pathParameters.documentId;
    const requestBody = JSON.parse(event.body || '{}');
    
    if (!documentId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing documentId parameter' })
      };
    }
    
    // Get document from database
    const getParams = {
      TableName: DOCUMENTS_TABLE,
      Key: { document_id: documentId }
    };
    
    const result = await dynamodb.get(getParams).promise();
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Document not found' })
      };
    }
    
    const document = result.Item;
    
    // Check if document is deleted
    if (document.is_deleted) {
      return {
        statusCode: 410,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Document has been deleted' })
      };
    }
    
    // Validate access to the lead
    const accessCheck = await validateLeadAccess(document.lead_id, user.email, user.role);
    if (!accessCheck.hasAccess) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Access denied to this document' })
      };
    }
    
    // Check if user can update (owner or admin)
    if (document.uploaded_by !== user.email && user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Only the uploader or admin can update this document' })
      };
    }
    
    // Extract updatable fields
    const updatableFields = {
      description: requestBody.description,
      document_category: requestBody.category,
      tags: requestBody.tags,
      access_level: requestBody.accessLevel
    };
    
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    
    Object.entries(updatableFields).forEach(([key, value]) => {
      if (value !== undefined) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        
        updateExpressions.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      }
    });
    
    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'No valid fields to update' })
      };
    }
    
    // Always update the updated_at timestamp
    updateExpressions.push('#updated_at = :updated_at');
    expressionAttributeNames['#updated_at'] = 'updated_at';
    expressionAttributeValues[':updated_at'] = new Date().toISOString();
    
    // Update document
    const updateParams = {
      TableName: DOCUMENTS_TABLE,
      Key: { document_id: documentId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };
    
    const updateResult = await dynamodb.update(updateParams).promise();
    const updatedDocument = updateResult.Attributes;
    
    // Log update activity
    await logDocumentActivity(documentId, user.email, 'metadata_updated', {
      updatedFields: Object.keys(updatableFields).filter(key => updatableFields[key] !== undefined),
      changes: updatableFields
    });
    
    // Format response
    const documentMetadata = {
      documentId: updatedDocument.document_id,
      leadId: updatedDocument.lead_id,
      filename: updatedDocument.filename,
      originalFilename: updatedDocument.original_filename,
      fileSize: updatedDocument.file_size,
      contentType: updatedDocument.content_type,
      category: updatedDocument.document_category,
      tags: updatedDocument.tags || [],
      description: updatedDocument.description || '',
      accessLevel: updatedDocument.access_level,
      uploadedBy: updatedDocument.uploaded_by,
      uploadedAt: updatedDocument.uploaded_at,
      updatedAt: updatedDocument.updated_at,
      downloadCount: updatedDocument.download_count || 0,
      lastAccessed: updatedDocument.last_accessed,
      virusScanStatus: updatedDocument.virus_scan_status
    };
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        document: documentMetadata,
        message: 'Document metadata updated successfully'
      })
    };
    
  } catch (error) {
    console.error('Update document metadata error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to update document metadata', 
        message: error.message 
      })
    };
  }
};

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
} 