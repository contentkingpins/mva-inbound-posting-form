const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const ses = new AWS.SES();

// Environment variables
const LEADS_TABLE = process.env.LEADS_TABLE;
const EXPORT_JOBS_TABLE = process.env.EXPORT_JOBS_TABLE || 'ExportJobs';
const EXPORT_BUCKET = process.env.EXPORT_BUCKET || 'mva-exports';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'no-reply@mva-crm.com';

// Default field mapping for exports
const DEFAULT_FIELDS = {
  'lead_id': 'Lead ID',
  'first_name': 'First Name',
  'last_name': 'Last Name',
  'email': 'Email',
  'phone': 'Phone',
  'created_date': 'Created Date',
  'disposition': 'Status',
  'vendor_code': 'Vendor',
  'assigned_agent': 'Assigned Agent',
  'lead_value': 'Lead Value',
  'campaign_source': 'Campaign Source',
  'priority': 'Priority',
  'notes': 'Notes'
};

// Helper function to sanitize field values for CSV
function sanitizeCSVValue(value) {
  if (value === null || value === undefined) return '';
  
  let sanitized = String(value);
  
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (sanitized.includes('"')) {
    sanitized = sanitized.replace(/"/g, '""');
  }
  
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n') || sanitized.includes('\r')) {
    sanitized = `"${sanitized}"`;
  }
  
  return sanitized;
}

// Helper function to format date values
function formatDate(dateValue) {
  if (!dateValue) return '';
  
  try {
    const date = new Date(dateValue);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch (error) {
    return dateValue;
  }
}

// Helper function to format currency values
function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '';
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(numValue);
}

// Helper function to get field value with formatting
function getFormattedFieldValue(item, field) {
  const value = item[field];
  
  // Apply specific formatting based on field type
  switch (field) {
    case 'created_date':
    case 'updated_date':
    case 'assigned_at':
    case 'closed_date':
      return formatDate(value);
    case 'lead_value':
      return formatCurrency(value);
    case 'phone':
      // Format phone number if needed
      if (value && typeof value === 'string') {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length === 10) {
          return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
        }
      }
      return value || '';
    default:
      return value || '';
  }
}

// CSV Generation
function generateCSV(items, fields, includeHeaders = true) {
  const csvRows = [];
  
  // Determine fields to export
  const exportFields = fields && fields.length > 0 ? fields : Object.keys(DEFAULT_FIELDS);
  
  // Add headers if requested
  if (includeHeaders) {
    const headers = exportFields.map(field => 
      DEFAULT_FIELDS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    );
    csvRows.push(headers.map(sanitizeCSVValue).join(','));
  }
  
  // Add data rows
  items.forEach(item => {
    const row = exportFields.map(field => {
      const value = getFormattedFieldValue(item, field);
      return sanitizeCSVValue(value);
    });
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

// Excel Generation (simplified - returns CSV format with different extension)
// In a real implementation, you'd use a library like 'exceljs' or 'xlsx'
function generateExcel(items, fields, includeHeaders = true) {
  // For this example, we'll generate CSV content but save with .xlsx extension
  // In production, you'd want to use a proper Excel generation library
  
  const csvContent = generateCSV(items, fields, includeHeaders);
  
  // Note: This is a simplified approach
  // In production, use a library like 'exceljs' to generate proper Excel files
  return csvContent;
}

// PDF Generation (simplified - returns formatted text)
// In a real implementation, you'd use a library like 'jspdf' or 'pdfkit'
function generatePDF(items, fields, includeHeaders = true) {
  const lines = [];
  
  // Add title
  lines.push('Lead Export Report');
  lines.push('Generated: ' + new Date().toLocaleString());
  lines.push('Total Records: ' + items.length);
  lines.push(''); // Empty line
  
  // Determine fields to export
  const exportFields = fields && fields.length > 0 ? fields : Object.keys(DEFAULT_FIELDS);
  
  // Add headers
  if (includeHeaders) {
    const headers = exportFields.map(field => 
      DEFAULT_FIELDS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    );
    lines.push(headers.join(' | '));
    lines.push('-'.repeat(headers.join(' | ').length));
  }
  
  // Add data rows
  items.forEach((item, index) => {
    const row = exportFields.map(field => {
      const value = getFormattedFieldValue(item, field);
      return String(value).substring(0, 20); // Truncate for PDF readability
    });
    lines.push(row.join(' | '));
    
    // Add separator every 10 rows for readability
    if ((index + 1) % 10 === 0) {
      lines.push('');
    }
  });
  
  // Note: This is a simplified text-based approach
  // In production, use a library like 'pdfkit' to generate proper PDF files
  return lines.join('\n');
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

// Helper function to fetch all leads for export
async function fetchLeadsForExport(searchCriteria, userRole, userEmail) {
  const items = [];
  let lastEvaluatedKey = null;
  
  const queryBuilder = buildExportQuery(searchCriteria, userRole, userEmail);
  
  do {
    const scanParams = {
      TableName: LEADS_TABLE
    };
    
    if (queryBuilder.filterExpression) {
      scanParams.FilterExpression = queryBuilder.filterExpression;
    }
    
    if (queryBuilder.expressionAttributeNames) {
      scanParams.ExpressionAttributeNames = queryBuilder.expressionAttributeNames;
    }
    
    if (queryBuilder.expressionAttributeValues) {
      scanParams.ExpressionAttributeValues = queryBuilder.expressionAttributeValues;
    }
    
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const result = await dynamodb.scan(scanParams).promise();
    items.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
    
  } while (lastEvaluatedKey);
  
  return items;
}

// Helper function to upload file to S3
async function uploadToS3(content, jobId, filename, contentType = 'text/plain') {
  const s3Key = `exports/${jobId}/${filename}`;
  
  const uploadParams = {
    Bucket: EXPORT_BUCKET,
    Key: s3Key,
    Body: content,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
    Metadata: {
      'export-job-id': jobId,
      'generated-at': new Date().toISOString()
    }
  };
  
  const result = await s3.upload(uploadParams).promise();
  
  return {
    location: result.Location,
    key: s3Key,
    size: Buffer.byteLength(content, 'utf8')
  };
}

// Helper function to send notification email
async function sendCompletionEmail(userEmail, jobId, filename, downloadUrl) {
  const emailParams = {
    Source: SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [userEmail]
    },
    Message: {
      Subject: {
        Data: 'Your Lead Export is Ready'
      },
      Body: {
        Html: {
          Data: `
            <h2>Export Complete</h2>
            <p>Your lead export has been completed successfully.</p>
            <p><strong>File:</strong> ${filename}</p>
            <p><strong>Job ID:</strong> ${jobId}</p>
            <p>Your download link will be available for 24 hours:</p>
            <p><a href="${downloadUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Export</a></p>
            <p>If you have any questions, please contact support.</p>
            <hr>
            <p><small>This is an automated message from MVA CRM.</small></p>
          `
        },
        Text: {
          Data: `
Export Complete

Your lead export has been completed successfully.

File: ${filename}
Job ID: ${jobId}

Your download link will be available for 24 hours.

If you have any questions, please contact support.

This is an automated message from MVA CRM.
          `
        }
      }
    }
  };
  
  try {
    await ses.sendEmail(emailParams).promise();
    console.log('Completion email sent successfully');
  } catch (error) {
    console.error('Failed to send completion email:', error);
    // Don't fail the export if email fails
  }
}

// Main export processing function (SQS message handler)
exports.processExportJob = async (event) => {
  console.log('Processing export job:', JSON.stringify(event, null, 2));
  
  try {
    // Parse SQS message
    const records = event.Records || [];
    
    for (const record of records) {
      const messageBody = JSON.parse(record.body);
      const { jobId, userEmail, exportParams } = messageBody;
      
      console.log(`Processing export job: ${jobId}`);
      
      // Update job status to processing
      await dynamodb.update({
        TableName: EXPORT_JOBS_TABLE,
        Key: { job_id: jobId },
        UpdateExpression: 'SET #status = :status, started_at = :started, progress = :progress',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'processing',
          ':started': new Date().toISOString(),
          ':progress': 10
        }
      }).promise();
      
      try {
        // Get user info for role-based filtering
        const userResult = await dynamodb.get({
          TableName: 'Users',
          Key: { email: userEmail }
        }).promise();
        
        const userRole = userResult.Item?.role || 'user';
        
        // Fetch leads for export
        console.log('Fetching leads for export...');
        await dynamodb.update({
          TableName: EXPORT_JOBS_TABLE,
          Key: { job_id: jobId },
          UpdateExpression: 'SET progress = :progress',
          ExpressionAttributeValues: { ':progress': 30 }
        }).promise();
        
        const leads = await fetchLeadsForExport(
          exportParams.searchCriteria || {},
          userRole,
          userEmail
        );
        
        console.log(`Found ${leads.length} leads for export`);
        
        if (leads.length === 0) {
          throw new Error('No leads found matching the specified criteria');
        }
        
        // Update progress
        await dynamodb.update({
          TableName: EXPORT_JOBS_TABLE,
          Key: { job_id: jobId },
          UpdateExpression: 'SET progress = :progress',
          ExpressionAttributeValues: { ':progress': 60 }
        }).promise();
        
        // Generate file content based on format
        let fileContent;
        let contentType;
        
        switch (exportParams.format.toLowerCase()) {
          case 'csv':
            fileContent = generateCSV(leads, exportParams.fields, exportParams.includeHeaders);
            contentType = 'text/csv';
            break;
          case 'excel':
            fileContent = generateExcel(leads, exportParams.fields, exportParams.includeHeaders);
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            break;
          case 'pdf':
            fileContent = generatePDF(leads, exportParams.fields, exportParams.includeHeaders);
            contentType = 'application/pdf';
            break;
          default:
            throw new Error(`Unsupported export format: ${exportParams.format}`);
        }
        
        console.log('File content generated, uploading to S3...');
        
        // Update progress
        await dynamodb.update({
          TableName: EXPORT_JOBS_TABLE,
          Key: { job_id: jobId },
          UpdateExpression: 'SET progress = :progress',
          ExpressionAttributeValues: { ':progress': 80 }
        }).promise();
        
        // Upload to S3
        const uploadResult = await uploadToS3(
          fileContent,
          jobId,
          exportParams.filename,
          contentType
        );
        
        console.log('File uploaded successfully');
        
        // Generate download URL with 24 hour expiration
        const downloadUrl = s3.getSignedUrl('getObject', {
          Bucket: EXPORT_BUCKET,
          Key: uploadResult.key,
          Expires: 24 * 60 * 60, // 24 hours
          ResponseContentDisposition: `attachment; filename="${exportParams.filename}"`
        });
        
        // Calculate expiration time
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        // Update job as completed
        await dynamodb.update({
          TableName: EXPORT_JOBS_TABLE,
          Key: { job_id: jobId },
          UpdateExpression: 'SET #status = :status, completed_at = :completed, progress = :progress, file_size = :fileSize, download_url = :downloadUrl, expires_at = :expiresAt',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': 'completed',
            ':completed': new Date().toISOString(),
            ':progress': 100,
            ':fileSize': uploadResult.size,
            ':downloadUrl': downloadUrl,
            ':expiresAt': expiresAt
          }
        }).promise();
        
        // Send notification email if requested
        if (exportParams.notifyEmail) {
          await sendCompletionEmail(userEmail, jobId, exportParams.filename, downloadUrl);
        }
        
        console.log(`Export job ${jobId} completed successfully`);
        
      } catch (error) {
        console.error(`Export job ${jobId} failed:`, error);
        
        // Update job as failed
        await dynamodb.update({
          TableName: EXPORT_JOBS_TABLE,
          Key: { job_id: jobId },
          UpdateExpression: 'SET #status = :status, failed_at = :failed, error_message = :error',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': 'failed',
            ':failed': new Date().toISOString(),
            ':error': error.message
          }
        }).promise();
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Export jobs processed successfully' })
    };
    
  } catch (error) {
    console.error('Export worker error:', error);
    throw error;
  }
};

// Direct export functions for testing/immediate use
exports.generateCSV = generateCSV;
exports.generateExcel = generateExcel;
exports.generatePDF = generatePDF; 