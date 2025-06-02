const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const sqs = new AWS.SQS();
const ses = new AWS.SES();
const jwt = require('jsonwebtoken');

// Environment variables
const LEADS_TABLE = process.env.LEADS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const EXPORT_JOBS_TABLE = process.env.EXPORT_JOBS_TABLE || 'ExportJobs';
const EXPORT_QUEUE_URL = process.env.EXPORT_QUEUE_URL;
const EXPORT_BUCKET = process.env.EXPORT_BUCKET || 'mva-exports';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'no-reply@mva-crm.com';

// CORS headers
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://main.d21xta9fg9b6w.amplifyapp.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-api-key",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
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

// Helper function to generate unique export job ID
function generateJobId(userEmail) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `export_${userEmail.replace('@', '_').replace('.', '_')}_${timestamp}_${random}`;
}

// Helper function to estimate export completion time
function estimateCompletionTime(itemCount, format) {
  const baseTime = 5; // Base 5 seconds
  const itemsPerSecond = format === 'pdf' ? 50 : format === 'excel' ? 200 : 500;
  return Math.max(baseTime, Math.ceil(itemCount / itemsPerSecond));
}

// Helper function to validate export format
function validateExportFormat(format) {
  const validFormats = ['csv', 'excel', 'pdf'];
  return validFormats.includes(format.toLowerCase());
}

// Helper function to apply role-based filtering to export query
function buildExportQuery(searchCriteria, userRole, userEmail) {
  let filterExpression = '';
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};

  // Role-based filtering (always applied first)
  if (userRole === 'vendor') {
    filterExpression = 'vendor_code = :userVendor';
    expressionAttributeValues[':userVendor'] = userEmail;
  } else if (userRole === 'agent') {
    filterExpression = 'assigned_agent = :userAgent';
    expressionAttributeValues[':userAgent'] = userEmail;
  }

  // Apply search criteria if provided
  if (searchCriteria) {
    // Add text search
    if (searchCriteria.text && searchCriteria.text.trim()) {
      const textConditions = [];
      const searchText = searchCriteria.text.trim().toLowerCase();
      
      ['first_name', 'last_name', 'email', 'phone'].forEach((field, index) => {
        const valueKey = `:text${index}`;
        textConditions.push(`contains(${field}, ${valueKey})`);
        expressionAttributeValues[valueKey] = searchText;
      });
      
      const textFilter = `(${textConditions.join(' OR ')})`;
      filterExpression = filterExpression ? `${filterExpression} AND ${textFilter}` : textFilter;
    }

    // Add date range
    if (searchCriteria.dateRange) {
      const { field, startDate, endDate } = searchCriteria.dateRange;
      const dateField = field || 'created_date';
      
      if (startDate && endDate) {
        filterExpression += filterExpression ? ' AND ' : '';
        filterExpression += `#dateField BETWEEN :startDate AND :endDate`;
        expressionAttributeNames['#dateField'] = dateField;
        expressionAttributeValues[':startDate'] = startDate;
        expressionAttributeValues[':endDate'] = endDate;
      }
    }

    // Add status filtering
    if (searchCriteria.dispositions && searchCriteria.dispositions.length > 0) {
      const statusConditions = searchCriteria.dispositions.map((status, i) => {
        const valueKey = `:status${i}`;
        expressionAttributeValues[valueKey] = status;
        return `disposition = ${valueKey}`;
      });
      
      const statusFilter = `(${statusConditions.join(' OR ')})`;
      filterExpression = filterExpression ? `${filterExpression} AND ${statusFilter}` : statusFilter;
    }
  }

  return {
    filterExpression: filterExpression || undefined,
    expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    expressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined
  };
}

// POST /api/leads/export - Initiate export job
exports.initiateExport = async (event) => {
  console.log('Initiate export request:', JSON.stringify(event, null, 2));
  
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
    const requestBody = JSON.parse(event.body || '{}');
    const { 
      format = 'csv',
      filename,
      fields = [],
      searchCriteria = {},
      includeHeaders = true,
      notifyEmail = true
    } = requestBody;
    
    // Validate export format
    if (!validateExportFormat(format)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Invalid export format', 
          validFormats: ['csv', 'excel', 'pdf'] 
        })
      };
    }
    
    // Generate job ID and determine file naming
    const jobId = generateJobId(user.email);
    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `leads_export_${timestamp}.${format}`;
    
    // Count items to be exported for estimation
    const queryBuilder = buildExportQuery(searchCriteria, user.role, user.email);
    const countParams = {
      TableName: LEADS_TABLE,
      Select: 'COUNT'
    };
    
    if (queryBuilder.filterExpression) {
      countParams.FilterExpression = queryBuilder.filterExpression;
      if (queryBuilder.expressionAttributeNames) {
        countParams.ExpressionAttributeNames = queryBuilder.expressionAttributeNames;
      }
      if (queryBuilder.expressionAttributeValues) {
        countParams.ExpressionAttributeValues = queryBuilder.expressionAttributeValues;
      }
    }
    
    const countResult = await dynamodb.scan(countParams).promise();
    const itemCount = countResult.Count || 0;
    
    if (itemCount === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'No leads found matching the specified criteria' 
        })
      };
    }
    
    // Estimate completion time
    const estimatedDuration = estimateCompletionTime(itemCount, format);
    const estimatedCompletion = new Date(Date.now() + estimatedDuration * 1000).toISOString();
    
    // Create export job record
    const exportJob = {
      job_id: jobId,
      user_email: user.email,
      status: 'queued',
      format: format,
      filename: exportFilename,
      item_count: itemCount,
      fields: fields.length > 0 ? fields : null,
      search_criteria: Object.keys(searchCriteria).length > 0 ? searchCriteria : null,
      include_headers: includeHeaders,
      notify_email: notifyEmail,
      created_at: new Date().toISOString(),
      estimated_completion: estimatedCompletion,
      progress: 0,
      file_size: null,
      download_url: null,
      expires_at: null,
      error_message: null
    };
    
    // Save job to database
    await dynamodb.put({
      TableName: EXPORT_JOBS_TABLE,
      Item: exportJob
    }).promise();
    
    // Queue job for background processing if item count is large
    if (itemCount > 1000) {
      const sqsMessage = {
        QueueUrl: EXPORT_QUEUE_URL,
        MessageBody: JSON.stringify({
          jobId: jobId,
          userEmail: user.email,
          exportParams: {
            format,
            filename: exportFilename,
            fields,
            searchCriteria,
            includeHeaders,
            notifyEmail
          }
        })
      };
      
      await sqs.sendMessage(sqsMessage).promise();
      
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          jobId: jobId,
          status: 'queued',
          message: 'Export job queued for background processing',
          itemCount: itemCount,
          estimatedCompletion: estimatedCompletion,
          format: format
        })
      };
    } else {
      // Process small exports immediately
      // This would typically call the export processing function directly
      // For now, we'll mark it as processing and return the job
      
      await dynamodb.update({
        TableName: EXPORT_JOBS_TABLE,
        Key: { job_id: jobId },
        UpdateExpression: 'SET #status = :status, started_at = :started',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'processing',
          ':started': new Date().toISOString()
        }
      }).promise();
      
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          jobId: jobId,
          status: 'processing',
          message: 'Export processing started',
          itemCount: itemCount,
          estimatedCompletion: estimatedCompletion,
          format: format
        })
      };
    }
    
  } catch (error) {
    console.error('Initiate export error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to initiate export', 
        message: error.message 
      })
    };
  }
};

// GET /api/leads/export/{jobId} - Check export status
exports.getExportStatus = async (event) => {
  console.log('Get export status request:', JSON.stringify(event, null, 2));
  
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
    const jobId = event.pathParameters.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing jobId parameter' })
      };
    }
    
    // Get job from database
    const getParams = {
      TableName: EXPORT_JOBS_TABLE,
      Key: { job_id: jobId }
    };
    
    const result = await dynamodb.get(getParams).promise();
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Export job not found' })
      };
    }
    
    const job = result.Item;
    
    // Check if user owns this job or is admin
    if (job.user_email !== user.email && user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Not authorized to view this export job' })
      };
    }
    
    // Calculate progress based on status and time elapsed
    let currentProgress = job.progress || 0;
    if (job.status === 'processing') {
      const startTime = new Date(job.started_at || job.created_at).getTime();
      const currentTime = Date.now();
      const estimatedEnd = new Date(job.estimated_completion).getTime();
      const totalDuration = estimatedEnd - startTime;
      const elapsed = currentTime - startTime;
      
      if (totalDuration > 0) {
        currentProgress = Math.min(95, Math.floor((elapsed / totalDuration) * 100));
      }
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        job: {
          jobId: job.job_id,
          status: job.status,
          format: job.format,
          filename: job.filename,
          itemCount: job.item_count,
          progress: currentProgress,
          fileSize: job.file_size,
          createdAt: job.created_at,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          estimatedCompletion: job.estimated_completion,
          downloadUrl: job.download_url,
          expiresAt: job.expires_at,
          errorMessage: job.error_message
        }
      })
    };
    
  } catch (error) {
    console.error('Get export status error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to get export status', 
        message: error.message 
      })
    };
  }
};

// GET /api/leads/export/{jobId}/download - Download export file
exports.downloadExport = async (event) => {
  console.log('Download export request:', JSON.stringify(event, null, 2));
  
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
    const jobId = event.pathParameters.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing jobId parameter' })
      };
    }
    
    // Get job from database
    const getParams = {
      TableName: EXPORT_JOBS_TABLE,
      Key: { job_id: jobId }
    };
    
    const result = await dynamodb.get(getParams).promise();
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Export job not found' })
      };
    }
    
    const job = result.Item;
    
    // Check if user owns this job or is admin
    if (job.user_email !== user.email && user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Not authorized to download this export' })
      };
    }
    
    // Check if export is completed
    if (job.status !== 'completed') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Export not completed', 
          status: job.status 
        })
      };
    }
    
    // Check if download link has expired
    if (job.expires_at && new Date(job.expires_at) < new Date()) {
      return {
        statusCode: 410,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Download link has expired' })
      };
    }
    
    // Generate secure download URL
    const s3Key = `exports/${jobId}/${job.filename}`;
    const downloadUrl = s3.getSignedUrl('getObject', {
      Bucket: EXPORT_BUCKET,
      Key: s3Key,
      Expires: 3600, // 1 hour
      ResponseContentDisposition: `attachment; filename="${job.filename}"`
    });
    
    // Log download activity
    await dynamodb.update({
      TableName: EXPORT_JOBS_TABLE,
      Key: { job_id: jobId },
      UpdateExpression: 'SET last_downloaded = :downloaded, download_count = if_not_exists(download_count, :zero) + :one',
      ExpressionAttributeValues: {
        ':downloaded': new Date().toISOString(),
        ':zero': 0,
        ':one': 1
      }
    }).promise();
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        downloadUrl: downloadUrl,
        filename: job.filename,
        fileSize: job.file_size,
        expiresIn: 3600
      })
    };
    
  } catch (error) {
    console.error('Download export error:', error);
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

// GET /api/leads/export/history - Export job history
exports.getExportHistory = async (event) => {
  console.log('Get export history request:', JSON.stringify(event, null, 2));
  
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
    const limit = Math.min(parseInt(queryParams.limit) || 20, 100);
    const lastEvaluatedKey = queryParams.lastEvaluatedKey 
      ? JSON.parse(Buffer.from(queryParams.lastEvaluatedKey, 'base64').toString('utf8'))
      : null;
    
    // Build query based on user role
    let scanParams = {
      TableName: EXPORT_JOBS_TABLE,
      Limit: limit
    };
    
    // Non-admin users can only see their own export history
    if (user.role !== 'admin') {
      scanParams.FilterExpression = 'user_email = :userEmail';
      scanParams.ExpressionAttributeValues = {
        ':userEmail': user.email
      };
    }
    
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const result = await dynamodb.scan(scanParams).promise();
    const jobs = result.Items || [];
    
    // Sort by creation date (newest first)
    jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Prepare pagination info
    const nextKey = result.LastEvaluatedKey 
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        jobs: jobs.map(job => ({
          jobId: job.job_id,
          status: job.status,
          format: job.format,
          filename: job.filename,
          itemCount: job.item_count,
          fileSize: job.file_size,
          createdAt: job.created_at,
          completedAt: job.completed_at,
          downloadCount: job.download_count || 0,
          expiresAt: job.expires_at,
          errorMessage: job.error_message
        })),
        pagination: {
          count: jobs.length,
          limit: limit,
          hasMore: !!result.LastEvaluatedKey,
          nextKey: nextKey
        }
      })
    };
    
  } catch (error) {
    console.error('Get export history error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to get export history', 
        message: error.message 
      })
    };
  }
};

// DELETE /api/leads/export/{jobId} - Cancel/delete export job
exports.cancelExport = async (event) => {
  console.log('Cancel export request:', JSON.stringify(event, null, 2));
  
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
    const jobId = event.pathParameters.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing jobId parameter' })
      };
    }
    
    // Get job from database
    const getParams = {
      TableName: EXPORT_JOBS_TABLE,
      Key: { job_id: jobId }
    };
    
    const result = await dynamodb.get(getParams).promise();
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Export job not found' })
      };
    }
    
    const job = result.Item;
    
    // Check if user owns this job or is admin
    if (job.user_email !== user.email && user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Not authorized to cancel this export job' })
      };
    }
    
    // Check if job can be cancelled
    if (job.status === 'completed') {
      // Delete completed job and its files
      try {
        // Delete S3 file if it exists
        if (job.status === 'completed') {
          const s3Key = `exports/${jobId}/${job.filename}`;
          await s3.deleteObject({
            Bucket: EXPORT_BUCKET,
            Key: s3Key
          }).promise();
        }
      } catch (s3Error) {
        console.warn('Failed to delete S3 file:', s3Error);
        // Continue with job deletion even if S3 cleanup fails
      }
      
      // Delete job record
      await dynamodb.delete({
        TableName: EXPORT_JOBS_TABLE,
        Key: { job_id: jobId }
      }).promise();
      
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Export job deleted successfully',
          jobId: jobId
        })
      };
      
    } else if (job.status === 'queued' || job.status === 'processing') {
      // Cancel active job
      await dynamodb.update({
        TableName: EXPORT_JOBS_TABLE,
        Key: { job_id: jobId },
        UpdateExpression: 'SET #status = :status, cancelled_at = :cancelled',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'cancelled',
          ':cancelled': new Date().toISOString()
        }
      }).promise();
      
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Export job cancelled successfully',
          jobId: jobId
        })
      };
      
    } else {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Job cannot be cancelled in current status', 
          status: job.status 
        })
      };
    }
    
  } catch (error) {
    console.error('Cancel export error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to cancel export job', 
        message: error.message 
      })
    };
  }
}; 