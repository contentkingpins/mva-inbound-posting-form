const docusign = require('docusign-esign');
const moment = require('moment');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  GetCommand,
  UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

// Constants
const LEADS_TABLE = process.env.LEADS_TABLE;
const DS_INTEGRATION_KEY = process.env.DS_INTEGRATION_KEY;
const DS_SECRET_KEY = process.env.DS_SECRET_KEY;
const DS_ACCOUNT_ID = process.env.DS_ACCOUNT_ID || '1cd48c0c-1772-4dda-8652-01f771015168'; // Use the provided Account ID
const DS_USER_ID = process.env.DS_USER_ID || '534890fa-b646-4dd0-b6be-8edefa446308'; // Use the provided User ID
const DS_AUTH_SERVER = process.env.DS_AUTH_SERVER || 'https://account-d.docusign.com';
const DS_API_URL = process.env.DS_API_URL || 'https://demo.docusign.net/restapi';
const DS_RETAINER_TEMPLATE_ID = process.env.DS_RETAINER_TEMPLATE_ID;
const DS_PRIVATE_KEY = process.env.DS_PRIVATE_KEY; // RSA private key for JWT auth

// Cache the token to avoid requesting a new one for every operation
let accessToken = null;
let tokenExpiration = null;

// Initialize DocuSign API client
async function getDocusignApiClient() {
  try {
    const dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(DS_API_URL);
    
    // Check if we have a valid token
    if (!accessToken || Date.now() >= tokenExpiration) {
      // Get a new access token
      const token = await getAccessToken();
      accessToken = token.accessToken;
      tokenExpiration = Date.now() + (token.expiresIn * 1000) - 60000; // Remove 1 minute for safety
    }
    
    // Set the access token
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    
    return dsApiClient;
  } catch (error) {
    console.error('Error initializing DocuSign client:', error);
    throw error;
  }
}

// Get access token using JWT grant
async function getAccessToken() {
  if (!DS_INTEGRATION_KEY) {
    throw new Error('DocuSign Integration Key is not configured');
  }
  
  if (!DS_PRIVATE_KEY) {
    throw new Error('DocuSign Private Key is not configured');
  }
  
  try {
    const apiClient = new docusign.ApiClient();
    apiClient.setOAuthBasePath(DS_AUTH_SERVER);
    
    const response = await apiClient.requestJWTUserToken(
      DS_INTEGRATION_KEY,
      DS_USER_ID,
      ['signature', 'impersonation'],
      DS_PRIVATE_KEY,
      3600 // 1 hour expiration
    );
    
    return response.body;
  } catch (error) {
    console.error('Error getting DocuSign access token:', error);
    throw error;
  }
}

// Send a retainer agreement to a claimant
async function sendRetainer(leadId, options = {}) {
  try {
    // Get lead information
    const leadResult = await dynamoDB.send(
      new GetCommand({
        TableName: LEADS_TABLE,
        Key: { lead_id: leadId }
      })
    );
    
    if (!leadResult.Item) {
      throw new Error('Lead not found');
    }
    
    const lead = leadResult.Item;
    
    // Initialize DocuSign API client
    const dsApiClient = await getDocusignApiClient();
    const envelopeApi = new docusign.EnvelopesApi(dsApiClient);
    
    // Create envelope definition
    const envelopeDefinition = createEnvelopeFromTemplate(lead, options);
    
    // Send the envelope
    const envelope = await envelopeApi.createEnvelope(DS_ACCOUNT_ID, {
      envelopeDefinition: envelopeDefinition
    });
    
    // Update lead record with DocuSign envelope information
    const timestamp = new Date().toISOString();
    const docusignInfo = {
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      sentAt: timestamp, 
      lastUpdated: timestamp
    };
    
    // Update the lead in DynamoDB
    await updateLeadWithRetainerInfo(leadId, docusignInfo);
    
    return {
      status: 'success',
      envelopeId: envelope.envelopeId,
      message: 'Retainer agreement sent successfully'
    };
  } catch (error) {
    console.error('Error sending retainer agreement:', error);
    throw error;
  }
}

// Create envelope definition from template
function createEnvelopeFromTemplate(lead, options) {
  // Create a text tab with the lead information
  const textTabs = [];
  
  // Add custom field placeholders as needed
  if (lead.first_name) {
    textTabs.push({
      tabLabel: 'Client_FirstName',
      value: lead.first_name
    });
  }
  
  if (lead.last_name) {
    textTabs.push({
      tabLabel: 'Client_LastName',
      value: lead.last_name
    });
  }
  
  if (lead.email) {
    textTabs.push({
      tabLabel: 'Client_Email',
      value: lead.email
    });
  }
  
  if (lead.phone_home) {
    textTabs.push({
      tabLabel: 'Client_Phone',
      value: lead.phone_home
    });
  }
  
  if (lead.address) {
    textTabs.push({
      tabLabel: 'Client_Address',
      value: lead.address
    });
  }
  
  // Create recipient information
  const recipientInfo = {
    email: lead.email,
    name: `${lead.first_name} ${lead.last_name}`,
    clientUserId: options.clientUserId, // Optional: for embedded signing
    recipientId: '1',
    roleName: 'Client', // This should match the role name in your template
    tabs: {
      textTabs: textTabs
    }
  };

  // Create envelope definition
  const envelopeDefinition = {
    templateId: DS_RETAINER_TEMPLATE_ID,
    status: options.sendNow ? 'sent' : 'created',
    templateRoles: [recipientInfo],
    emailSubject: options.emailSubject || 'Please sign the retainer agreement',
    emailBlurb: options.emailBlurb || 'Please review and sign the attached retainer agreement.'
  };
  
  return envelopeDefinition;
}

// Handle webhook (DocuSign Connect) callback
async function handleStatusCallback(payload) {
  try {
    const envelopeId = payload.envelopeId;
    const envelopeStatus = payload.status;
    const timestamp = new Date().toISOString();
    
    console.log(`Received DocuSign callback for envelope ${envelopeId} with status ${envelopeStatus}`);
    
    // Find the lead with this envelope ID
    const result = await dynamoDB.send(
      new GetCommand({
        TableName: LEADS_TABLE,
        IndexName: 'EnvelopeIdIndex', // Assuming we will create this GSI
        KeyConditionExpression: 'envelope_id = :envelopeId',
        ExpressionAttributeValues: {
          ':envelopeId': envelopeId
        }
      })
    );
    
    if (!result.Items || result.Items.length === 0) {
      console.error(`No lead found with envelope ID ${envelopeId}`);
      return;
    }
    
    const lead = result.Items[0];
    
    // Update lead with new status
    const docusignInfo = {
      envelopeId: envelopeId,
      status: envelopeStatus,
      lastUpdated: timestamp
    };
    
    // Add specific timestamps based on status
    switch (envelopeStatus) {
      case 'delivered':
        docusignInfo.deliveredAt = timestamp;
        break;
      case 'completed':
        docusignInfo.completedAt = timestamp;
        break;
      case 'declined':
        docusignInfo.declinedAt = timestamp;
        break;
      case 'viewed':
        docusignInfo.viewedAt = timestamp;
        break;
    }
    
    // Update the lead in DynamoDB
    await updateLeadWithRetainerInfo(lead.lead_id, docusignInfo);
    
    return {
      status: 'success',
      message: 'Lead updated with new document status'
    };
  } catch (error) {
    console.error('Error handling DocuSign status callback:', error);
    throw error;
  }
}

// Update the lead record with retainer information
async function updateLeadWithRetainerInfo(leadId, docusignInfo) {
  try {
    // Prepare update expression parts
    const updateExpressionParts = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    
    // Base docusign_info object if it doesn't exist yet
    updateExpressionParts.push('SET #docusignInfo = if_not_exists(#docusignInfo, :emptyObject)');
    expressionAttributeValues[':emptyObject'] = {};
    expressionAttributeNames['#docusignInfo'] = 'docusign_info';
    
    // Update each field in the docusign_info object
    Object.entries(docusignInfo).forEach(([key, value]) => {
      updateExpressionParts.push(`#docusignInfo.#${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
      expressionAttributeNames[`#${key}`] = key;
    });
    
    // Set envelope_id at root level for indexing
    if (docusignInfo.envelopeId) {
      updateExpressionParts.push('#envelopeId = :envelopeIdValue');
      expressionAttributeValues[':envelopeIdValue'] = docusignInfo.envelopeId;
      expressionAttributeNames['#envelopeId'] = 'envelope_id';
    }
    
    // Add entry to update_history
    const historyEntry = {
      timestamp: new Date().toISOString(),
      action: 'docusign_status_update',
      status: docusignInfo.status || 'unknown'
    };
    
    updateExpressionParts.push('#updateHistory = list_append(if_not_exists(#updateHistory, :emptyList), :newHistory)');
    expressionAttributeValues[':emptyList'] = [];
    expressionAttributeValues[':newHistory'] = [historyEntry];
    expressionAttributeNames['#updateHistory'] = 'update_history';
    
    // Execute the update
    await dynamoDB.send(
      new UpdateCommand({
        TableName: LEADS_TABLE,
        Key: { lead_id: leadId },
        UpdateExpression: updateExpressionParts.join(', '),
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames
      })
    );
    
    return true;
  } catch (error) {
    console.error('Error updating lead with retainer info:', error);
    throw error;
  }
}

module.exports = {
  sendRetainer,
  handleStatusCallback
}; 