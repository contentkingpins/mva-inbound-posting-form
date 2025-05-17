const docusign = require('docusign-esign');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const moment = require('moment');

// DocuSign API configuration from environment variables
const DS_INTEGRATION_KEY = process.env.DS_INTEGRATION_KEY;
const DS_SECRET_KEY = process.env.DS_SECRET_KEY;
const DS_ACCOUNT_ID = process.env.DS_ACCOUNT_ID;
const DS_USER_ID = process.env.DS_USER_ID;
const DS_RETAINER_TEMPLATE_ID = process.env.DS_RETAINER_TEMPLATE_ID;
const DS_PRIVATE_KEY = process.env.DS_PRIVATE_KEY;

// JWT configuration
const SCOPES = ['signature', 'impersonation'];
const TOKEN_EXPIRATION_IN_SECONDS = 3600; // 1 hour

// Store token to prevent unnecessary authentication on each call
let tokenExpirationTimestamp = null;
let accessToken = null;

/**
 * Get an access token via JWT grant
 * @returns {Promise<string>} DocuSign access token
 */
async function getAccessToken() {
  // Check if we have a valid token already
  if (accessToken && tokenExpirationTimestamp && moment().unix() < tokenExpirationTimestamp) {
    return accessToken;
  }

  try {
    const jwtLifeSec = TOKEN_EXPIRATION_IN_SECONDS;
    const dsApiClient = new docusign.ApiClient();
    
    // Set the DocuSign environment
    dsApiClient.setOAuthBasePath('account.docusign.com');
    
    const privateKey = DS_PRIVATE_KEY;
    const response = await dsApiClient.requestJWTUserToken(
      DS_INTEGRATION_KEY,
      DS_USER_ID,
      SCOPES,
      privateKey,
      jwtLifeSec
    );
    
    const tokenInfo = response.body;
    
    // Save the token and calculate expiration
    accessToken = tokenInfo.access_token;
    tokenExpirationTimestamp = moment().unix() + tokenInfo.expires_in - 300; // 5 min buffer
    
    return accessToken;
  } catch (error) {
    console.error(`Error getting DocuSign access token: ${error}`);
    throw new Error(`Failed to authenticate with DocuSign: ${error.message}`);
  }
}

/**
 * Initialize DocuSign API client with authentication
 * @returns {Promise<{apiClient: docusign.ApiClient, envelopesApi: docusign.EnvelopesApi}>}
 */
async function initializeDocuSignClient() {
  try {
    const token = await getAccessToken();
    
    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(`https://account.docusign.com/restapi`);
    apiClient.addDefaultHeader('Authorization', `Bearer ${token}`);
    
    // Create envelope API instance
    const envelopesApi = new docusign.EnvelopesApi(apiClient);
    
    return { apiClient, envelopesApi };
  } catch (error) {
    console.error(`Error initializing DocuSign client: ${error}`);
    throw new Error(`DocuSign client initialization failed: ${error.message}`);
  }
}

/**
 * Send a retainer agreement to a lead
 * @param {Object} lead - Lead data from DynamoDB
 * @returns {Promise<Object>} DocuSign envelope creation result
 */
async function sendRetainerAgreement(lead) {
  try {
    // Initialize DocuSign client
    const { apiClient, envelopesApi } = await initializeDocuSignClient();
    
    // Extract lead data for template filling
    const { first_name, last_name, email, phone_home, address } = lead;
    
    // Create a new envelope definition
    const envDef = new docusign.EnvelopeDefinition();
    
    // Set envelope status to "sent" to send immediately
    envDef.status = 'sent';
    
    // Set up template with role assignments
    envDef.templateId = DS_RETAINER_TEMPLATE_ID;
    
    // Create template role for client
    const clientRole = docusign.TemplateRole.constructFromObject({
      email: email,
      name: `${first_name} ${last_name}`,
      roleName: 'Client',
      routingOrder: '1',
      // Add template tabs (form fields) with client information
      tabs: {
        textTabs: [
          {
            tabLabel: 'Client_FirstName',
            value: first_name
          },
          {
            tabLabel: 'Client_LastName',
            value: last_name
          },
          {
            tabLabel: 'Client_Email',
            value: email
          },
          {
            tabLabel: 'Client_Phone',
            value: phone_home || ''
          },
          {
            tabLabel: 'Client_Address',
            value: address || ''
          }
        ]
      }
    });
    
    // Add role to envelope
    envDef.templateRoles = [clientRole];
    
    // Add custom email subject and body
    envDef.emailSubject = 'Please sign your Retainer Agreement';
    envDef.emailBlurb = 'Thank you for your interest in our services. Please review and sign the retainer agreement.';
    
    // Create the envelope
    const envelopeResults = await envelopesApi.createEnvelope(DS_ACCOUNT_ID, { envelopeDefinition: envDef });
    
    return {
      envelopeId: envelopeResults.envelopeId,
      status: envelopeResults.status,
      created: envelopeResults.statusDateTime
    };
  } catch (error) {
    console.error(`Error sending retainer agreement: ${error}`);
    throw new Error(`Failed to send retainer agreement: ${error.message}`);
  }
}

/**
 * Get the status of a DocuSign envelope
 * @param {string} envelopeId - DocuSign envelope ID
 * @returns {Promise<Object>} Envelope status information
 */
async function getEnvelopeStatus(envelopeId) {
  try {
    // Initialize DocuSign client
    const { apiClient, envelopesApi } = await initializeDocuSignClient();
    
    // Get envelope information
    const envelope = await envelopesApi.getEnvelope(DS_ACCOUNT_ID, envelopeId);
    
    return {
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      created: envelope.createdDateTime,
      sent: envelope.sentDateTime,
      delivered: envelope.deliveredDateTime,
      signed: envelope.completedDateTime,
      declined: envelope.declinedDateTime
    };
  } catch (error) {
    console.error(`Error getting envelope status: ${error}`);
    throw new Error(`Failed to get envelope status: ${error.message}`);
  }
}

/**
 * Process a DocuSign webhook notification
 * @param {Object} webhookData - Data from DocuSign webhook
 * @returns {Promise<Object>} Processed envelope information
 */
async function processWebhookNotification(webhookData) {
  try {
    // Extract envelope information from webhook data
    const envelopeStatus = {
      envelopeId: webhookData.envelopeId,
      status: webhookData.status,
      emailSubject: webhookData.emailSubject,
      timestampStr: webhookData.timeGenerated
    };
    
    // Add recipient information if available
    if (webhookData.recipients && webhookData.recipients.signers && webhookData.recipients.signers.length > 0) {
      const signer = webhookData.recipients.signers[0];
      envelopeStatus.signerEmail = signer.email;
      envelopeStatus.signerName = signer.name;
      envelopeStatus.signedTimestamp = signer.signedDateTime;
    }
    
    return envelopeStatus;
  } catch (error) {
    console.error(`Error processing webhook notification: ${error}`);
    throw new Error(`Failed to process webhook notification: ${error.message}`);
  }
}

module.exports = {
  sendRetainerAgreement,
  getEnvelopeStatus,
  processWebhookNotification
}; 