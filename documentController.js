const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Environment variables
const LEADS_TABLE = process.env.LEADS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const DOCUMENTS_TABLE = process.env.DOCUMENTS_TABLE || 'Documents';
const DOCUMENT_ACTIVITY_TABLE = process.env.DOCUMENT_ACTIVITY_TABLE || 'DocumentActivity';
const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET || 'mva-documents';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'text/plain',
  'text/csv'
];

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

// Helper function to generate unique document ID
function generateDocumentId(leadId, filename) {
  const timestamp = Date.now();
  const hash = crypto.createHash('md5').update(`${leadId}-${filename}-${timestamp}`).digest('hex').substring(0, 8);
  return `doc_${leadId}_${timestamp}_${hash}`;
}

// Helper function to validate file type and size
function validateFile(contentType, contentLength) {
  const errors = [];
  
  if (!ALLOWED_FILE_TYPES.includes(contentType)) {
    errors.push(`File type ${contentType} is not allowed`);
  }
  
  if (contentLength > MAX_FILE_SIZE) {
    errors.push(`File size ${contentLength} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
  }
  
  return errors;
}

// Helper function to get file extension from filename
function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

// Helper function to generate S3 key for document storage
function generateS3Key(leadId, documentId, filename) {
  const extension = getFileExtension(filename);
  return `leads/${leadId}/documents/${documentId}.${extension}`;
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

// POST /api/leads/{leadId}/documents - Upload document
exports.uploadDocument = async (event) => {
  console.log('Upload document request:', JSON.stringify(event, null, 2));
  
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
    const leadId = event.pathParameters.leadId;
    
    if (!leadId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing leadId parameter' })
      };
    }
    
    // Validate lead access
    const accessCheck = await validateLeadAccess(leadId, user.email, user.role);
    if (!accessCheck.hasAccess) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: accessCheck.error })
      };
    }
    
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');
    const { 
      filename,
      contentType,
      contentLength,
      description = '',
      category = 'general',
      tags = []
    } = requestBody;
    
    if (!filename || !contentType) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Missing required fields: filename, contentType' 
        })
      };
    }
    
    // Validate file
    const validationErrors = validateFile(contentType, contentLength);
    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'File validation failed',
          details: validationErrors
        })
      };
    }
    
    // Generate document metadata
    const documentId = generateDocumentId(leadId, filename);
    const s3Key = generateS3Key(leadId, documentId, filename);
    const timestamp = new Date().toISOString();
    
    // Create presigned URL for upload
    const uploadUrl = s3.getSignedUrl('putObject', {
      Bucket: DOCUMENTS_BUCKET,
      Key: s3Key,
      ContentType: contentType,
      Expires: 3600, // 1 hour
      Conditions: [
        ['content-length-range', 0, MAX_FILE_SIZE]
      ]
    });
    
    // Create document record
    const document = {
      document_id: documentId,
      lead_id: leadId,
      filename: filename.replace(/[^a-zA-Z0-9.\-_]/g, '_'), // Sanitize filename
      original_filename: filename,
      file_size: contentLength || 0,
      content_type: contentType,
      file_extension: getFileExtension(filename),
      s3_bucket: DOCUMENTS_BUCKET,
      s3_key: s3Key,
      uploaded_by: user.email,
      uploaded_at: timestamp,
      updated_at: timestamp,
      document_category: category,
      tags: tags,
      description: description,
      version: 1,
      parent_document_id: null,
      access_level: 'lead', // lead, team, public
      download_count: 0,
      last_accessed: null,
      thumbnail_s3_key: null,
      content_extracted: false,
      virus_scan_status: 'pending',
      virus_scan_date: null,
      retention_date: null,
      is_deleted: false
    };
    
    // Save document metadata to database
    await dynamodb.put({
      TableName: DOCUMENTS_TABLE,
      Item: document
    }).promise();
    
    // Log activity
    await logDocumentActivity(documentId, user.email, 'upload_initiated', {
      filename: filename,
      contentType: contentType,
      fileSize: contentLength
    });
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        documentId: documentId,
        uploadUrl: uploadUrl,
        s3Key: s3Key,
        expiresIn: 3600,
        message: 'Upload URL generated successfully'
      })
    };
    
  } catch (error) {
    console.error('Upload document error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to initiate document upload', 
        message: error.message 
      })
    };
  }
};

// GET /api/leads/{leadId}/documents - List lead documents
exports.getLeadDocuments = async (event) => {
  console.log('Get lead documents request:', JSON.stringify(event, null, 2));
  
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
    const leadId = event.pathParameters.leadId;
    const queryParams = event.queryStringParameters || {};
    const limit = Math.min(parseInt(queryParams.limit) || 50, 100);
    const category = queryParams.category;
    const includeDeleted = queryParams.includeDeleted === 'true';
    
    if (!leadId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing leadId parameter' })
      };
    }
    
    // Validate lead access
    const accessCheck = await validateLeadAccess(leadId, user.email, user.role);
    if (!accessCheck.hasAccess) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: accessCheck.error })
      };
    }
    
    // Build query parameters
    const queryParameters = {
      TableName: DOCUMENTS_TABLE,
      IndexName: 'LeadDocumentsIndex',
      KeyConditionExpression: 'lead_id = :leadId',
      ExpressionAttributeValues: {
        ':leadId': leadId
      },
      ScanIndexForward: false, // Sort by uploaded_at descending
      Limit: limit
    };
    
    // Add filters
    const filterExpressions = [];
    
    if (!includeDeleted) {
      filterExpressions.push('is_deleted = :notDeleted');
      queryParameters.ExpressionAttributeValues[':notDeleted'] = false;
    }
    
    if (category) {
      filterExpressions.push('document_category = :category');
      queryParameters.ExpressionAttributeValues[':category'] = category;
    }
    
    if (filterExpressions.length > 0) {
      queryParameters.FilterExpression = filterExpressions.join(' AND ');
    }
    
    const result = await dynamodb.query(queryParameters).promise();
    const documents = result.Items || [];
    
    // Format response with secure URLs for thumbnails (if they exist)
    const formattedDocuments = documents.map(doc => ({
      documentId: doc.document_id,
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
      version: doc.version,
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
        leadId: leadId,
        totalCount: documents.length,
        hasMore: !!result.LastEvaluatedKey
      })
    };
    
  } catch (error) {
    console.error('Get lead documents error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to retrieve documents', 
        message: error.message 
      })
    };
  }
};

// GET /api/documents/{documentId} - Get document metadata
exports.getDocumentMetadata = async (event) => {
  console.log('Get document metadata request:', JSON.stringify(event, null, 2));
  
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
    
    // Validate access to the lead
    const accessCheck = await validateLeadAccess(document.lead_id, user.email, user.role);
    if (!accessCheck.hasAccess) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Access denied to this document' })
      };
    }
    
    // Log access activity
    await logDocumentActivity(documentId, user.email, 'metadata_accessed');
    
    // Format response
    const documentMetadata = {
      documentId: document.document_id,
      leadId: document.lead_id,
      filename: document.filename,
      originalFilename: document.original_filename,
      fileSize: document.file_size,
      contentType: document.content_type,
      fileExtension: document.file_extension,
      category: document.document_category,
      tags: document.tags || [],
      description: document.description || '',
      version: document.version,
      parentDocumentId: document.parent_document_id,
      accessLevel: document.access_level,
      uploadedBy: document.uploaded_by,
      uploadedAt: document.uploaded_at,
      updatedAt: document.updated_at,
      downloadCount: document.download_count || 0,
      lastAccessed: document.last_accessed,
      virusScanStatus: document.virus_scan_status,
      virusScanDate: document.virus_scan_date,
      contentExtracted: document.content_extracted,
      retentionDate: document.retention_date,
      isDeleted: document.is_deleted,
      thumbnailUrl: document.thumbnail_s3_key ? s3.getSignedUrl('getObject', {
        Bucket: DOCUMENTS_BUCKET,
        Key: document.thumbnail_s3_key,
        Expires: 3600
      }) : null
    };
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        document: documentMetadata
      })
    };
    
  } catch (error) {
    console.error('Get document metadata error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to retrieve document metadata', 
        message: error.message 
      })
    };
  }
};

// GET /api/documents/{documentId}/download - Download document
exports.downloadDocument = async (event) => {
  console.log('Download document request:', JSON.stringify(event, null, 2));
  
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
    
    // Generate secure download URL
    const downloadUrl = s3.getSignedUrl('getObject', {
      Bucket: DOCUMENTS_BUCKET,
      Key: document.s3_key,
      Expires: 3600, // 1 hour
      ResponseContentDisposition: `attachment; filename="${document.original_filename}"`
    });
    
    // Update download count and last accessed
    await dynamodb.update({
      TableName: DOCUMENTS_TABLE,
      Key: { document_id: documentId },
      UpdateExpression: 'SET download_count = if_not_exists(download_count, :zero) + :one, last_accessed = :accessed',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1,
        ':accessed': new Date().toISOString()
      }
    }).promise();
    
    // Log download activity
    await logDocumentActivity(documentId, user.email, 'downloaded', {
      filename: document.original_filename,
      fileSize: document.file_size
    });
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        downloadUrl: downloadUrl,
        filename: document.original_filename,
        fileSize: document.file_size,
        contentType: document.content_type,
        expiresIn: 3600
      })
    };
    
  } catch (error) {
    console.error('Download document error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to generate download link', 
        message: error.message 
      })
    };
  }
};

// DELETE /api/documents/{documentId} - Delete document
exports.deleteDocument = async (event) => {
  console.log('Delete document request:', JSON.stringify(event, null, 2));
  
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
    const queryParams = event.queryStringParameters || {};
    const permanentDelete = queryParams.permanent === 'true';
    
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
    
    // Validate access to the lead
    const accessCheck = await validateLeadAccess(document.lead_id, user.email, user.role);
    if (!accessCheck.hasAccess) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Access denied to this document' })
      };
    }
    
    // Check if user can delete (owner or admin)
    if (document.uploaded_by !== user.email && user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Only the uploader or admin can delete this document' })
      };
    }
    
    if (permanentDelete) {
      // Permanent deletion - remove from S3 and database
      try {
        // Delete from S3
        await s3.deleteObject({
          Bucket: DOCUMENTS_BUCKET,
          Key: document.s3_key
        }).promise();
        
        // Delete thumbnail if exists
        if (document.thumbnail_s3_key) {
          await s3.deleteObject({
            Bucket: DOCUMENTS_BUCKET,
            Key: document.thumbnail_s3_key
          }).promise();
        }
      } catch (s3Error) {
        console.warn('S3 deletion failed:', s3Error);
        // Continue with database deletion even if S3 fails
      }
      
      // Delete from database
      await dynamodb.delete({
        TableName: DOCUMENTS_TABLE,
        Key: { document_id: documentId }
      }).promise();
      
      // Log activity
      await logDocumentActivity(documentId, user.email, 'permanently_deleted', {
        filename: document.original_filename
      });
      
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Document permanently deleted',
          documentId: documentId
        })
      };
      
    } else {
      // Soft deletion - mark as deleted
      await dynamodb.update({
        TableName: DOCUMENTS_TABLE,
        Key: { document_id: documentId },
        UpdateExpression: 'SET is_deleted = :deleted, updated_at = :timestamp',
        ExpressionAttributeValues: {
          ':deleted': true,
          ':timestamp': new Date().toISOString()
        }
      }).promise();
      
      // Log activity
      await logDocumentActivity(documentId, user.email, 'soft_deleted', {
        filename: document.original_filename
      });
      
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Document marked as deleted',
          documentId: documentId
        })
      };
    }
    
  } catch (error) {
    console.error('Delete document error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to delete document', 
        message: error.message 
      })
    };
  }
}; 