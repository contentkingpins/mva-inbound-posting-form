# DocuSign Integration for Lead Management System

This document describes the DocuSign integration implemented in the lead management system. The integration allows sending retainer agreements to leads and tracking their signature status.

## Architecture Overview

The integration consists of the following components:

1. **DocuSign API Integration**: Using JWT authentication to interact with DocuSign
2. **DynamoDB Schema**: Extended to store envelope IDs and signature status
3. **API Endpoints**: New endpoints for sending agreements and handling webhooks
4. **Lead History**: Tracking of DocuSign-related events in lead history

## Environment Variables

The following environment variables are required for the DocuSign integration:

- `DS_USER_ID`: DocuSign User ID
- `DS_ACCOUNT_ID`: DocuSign Account ID
- `DS_INTEGRATION_KEY`: DocuSign Integration Key
- `DS_SECRET_KEY`: DocuSign Secret Key
- `DS_RETAINER_TEMPLATE_ID`: DocuSign Template ID for the retainer agreement
- `DS_PRIVATE_KEY`: RSA Private Key for JWT authentication

## API Endpoints

### Send Retainer Agreement

```
POST /leads/{lead_id}/send-retainer
```

Sends a retainer agreement to the lead using DocuSign.

**Request**:
```json
{}
```

**Response**:
```json
{
  "status": "success",
  "message": "Retainer agreement sent successfully",
  "data": {
    "envelopeId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "sent"
  }
}
```

### DocuSign Webhook Handler

```
POST /docusign/webhook
```

Handles DocuSign webhook notifications to update lead status.

**Request**: DocuSign webhook format

**Response**:
```json
{
  "status": "success",
  "message": "Webhook processed successfully"
}
```

## DynamoDB Schema Updates

The `Leads` table has been updated with:

1. `envelope_id` attribute: Stores the DocuSign envelope ID
2. `EnvelopeIdIndex` GSI: For looking up leads by DocuSign envelope ID
3. `docusign_info` object: Contains envelope status and timestamps
4. `history` array: Stores lead history including DocuSign events

## Implementation Details

### DocuSign Authentication

The system uses JWT (JSON Web Token) authentication to interact with DocuSign. The authentication flow:

1. Generate a JWT using the integration key and private key
2. Request an access token from DocuSign
3. Use the access token for subsequent API calls
4. Cache the token until it expires

### Template Configuration

The DocuSign template should have the following fields:

- `Client_FirstName`: First name of the lead
- `Client_LastName`: Last name of the lead
- `Client_Email`: Email address of the lead
- `Client_Phone`: Phone number of the lead
- `Client_Address`: Address of the lead

### Lead History

DocuSign events are tracked in the lead history:

1. When a retainer agreement is sent
2. When the agreement status changes (delivered, signed, declined, etc.)

### Error Handling

The integration includes robust error handling:

1. Authentication failures are logged and reported
2. API errors are caught and reported with appropriate status codes
3. Duplicate sending is prevented by checking existing envelope IDs

## Testing

To test the DocuSign integration:

1. Create a test lead in the system
2. Send a retainer agreement to the test lead
3. Open the agreement in DocuSign
4. Sign or decline the agreement
5. Verify that the lead status is updated in the system

## Troubleshooting

Common issues and solutions:

1. **Authentication Errors**: Verify environment variables are correctly set
2. **Webhook Not Working**: Check CORS configuration in DocuSign admin
3. **Template Issues**: Verify the template ID and field names 