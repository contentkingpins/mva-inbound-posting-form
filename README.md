# Lead Management API

A serverless Node.js application for managing sales leads using AWS Lambda, API Gateway, and DynamoDB.

## Features

- POST /leads endpoint to validate and store lead information
- GET /leads endpoint to retrieve all leads or filter by vendor code
- Automatic validation of lead data
- Vendor verification against a Vendors DynamoDB table
- API key protection for POST endpoint
- Full request logging to CloudWatch
- DocuSign integration for sending retainer agreements
- Lead status updates when retainers are sent/completed
- Option to resend retainer agreements

## API Documentation

### POST /leads

Creates a new lead record.

**Authentication:**
This endpoint requires an API key to be included in the `x-api-key` header.

**Request Body:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "zip_code": "12345",
  "state": "CA",
  "phone_home": "1234567890",
  "lp_caller_id": "1234567890", 
  "email": "john.doe@example.com",
  "vendor_code": "VENDOR1"
}
```

**Required Fields:**
- `first_name` (string)
- `last_name` (string)
- `phone_home` (string, exactly 10 digits)
- `lp_caller_id` (string, must match phone_home)
- `email` (string, valid email format)
- `vendor_code` (string, must exist in Vendors table)

**Optional Fields:**
- `zip_code` (string)
- `state` (string)

**Note:** Either `zip_code` or `state` must be present.

**Success Response (200):**

```json
{
  "status": "success",
  "lead_id": "uuid-string",
  "message": "Lead received"
}
```

**Error Response (400):**

```json
{
  "status": "error",
  "errors": ["List of validation errors"]
}
```

### GET /leads

Retrieves lead records.

**Query Parameters:**
- `vendor_code` (optional): Filter leads by vendor code

**Response (200):**

```json
[
  {
    "lead_id": "uuid-string",
    "first_name": "John",
    "last_name": "Doe",
    "zip_code": "12345",
    "state": "CA",
    "phone_home": "1234567890",
    "lp_caller_id": "1234567890",
    "email": "john.doe@example.com",
    "vendor_code": "VENDOR1",
    "timestamp": "2023-05-10T15:30:00.000Z"
  },
  ...
]
```

Results are sorted by timestamp in descending order (newest first).

### POST /leads/{lead_id}/send-retainer

Sends a retainer agreement to a lead via DocuSign.

**Authentication:**
This endpoint requires an API key to be included in the `x-api-key` header.

**Request Body:**

```json
{
  "emailSubject": "Your Retainer Agreement",
  "emailBlurb": "Please review and sign the attached retainer agreement.",
  "sendNow": true,
  "force": false
}
```

**Optional Fields:**
- `emailSubject` (string): Custom subject line for the email
- `emailBlurb` (string): Custom message for the email
- `sendNow` (boolean): Whether to send immediately (defaults to true)
- `force` (boolean): Whether to resend even if already sent (defaults to false)

**Success Response (200):**

```json
{
  "status": "success",
  "envelopeId": "docusign-envelope-id",
  "message": "Retainer agreement sent successfully"
}
```

**Error Response (400):**

```json
{
  "status": "error",
  "message": "A retainer agreement has already been sent. Use force=true to send another."
}
```

## Deployment Information

The API is deployed at: 
`https://nv01uveape.execute-api.us-east-1.amazonaws.com/prod/leads`

### Environment Setup

For local testing, set the API_KEY environment variable:

```
export API_KEY=your_api_key_here  # Linux/Mac
set API_KEY=your_api_key_here     # Windows
```

### Testing

Run the automated tests with:

```
API_KEY=your_api_key node scripts/test-api.js
```

## Database Structure

### Vendors Table
- Primary Key: `vendor_code` (string)

### Leads Table
- Primary Key: `lead_id` (string)
- Global Secondary Index: `VendorTimestampIndex`
  - Partition Key: `vendor_code`
  - Sort Key: `timestamp`
- Global Secondary Index: `EmailIndex`
  - Partition Key: `email`
- Global Secondary Index: `PhoneIndex`
  - Partition Key: `phone_home`
- Global Secondary Index: `EnvelopeIdIndex`
  - Partition Key: `envelope_id`

## Monitoring

API requests are logged to CloudWatch under the log group `/aws/apigateway/leads-api`. You can view these logs in the AWS Console or using the AWS CLI:

```
aws logs get-log-events --log-group-name /aws/apigateway/leads-api --log-stream-name YOUR_LOG_STREAM
```

# Lead Management System

This repository contains the code for a lead management system with AWS Lambda, API Gateway, and DynamoDB.

## Duplicate Lead Detection

The system now includes functionality to detect and reject duplicate lead submissions. A lead is considered a duplicate if either:

1. The same email address has been used before, or
2. The same phone number has been used before

When a duplicate is detected, the API returns a 409 Conflict status code with an error message.

## Deployment Instructions

### 1. Update DynamoDB Tables

The duplicate checking functionality requires two new Global Secondary Indexes (GSIs) on the Leads table:

- `EmailIndex`: For checking duplicates by email
- `PhoneIndex`: For checking duplicates by phone number

Deploy the updated CloudFormation template:

```bash
aws cloudformation deploy \
  --template-file cloudformation/dynamodb.yaml \
  --stack-name lead-management-dynamodb \
  --capabilities CAPABILITY_IAM
```

### 2. Deploy Lambda Function

Zip the Lambda code:

```bash
zip -r lambda.zip index.js node_modules/
```

Update the Lambda function:

```bash
aws lambda update-function-code \
  --function-name lead-management-api \
  --zip-file fileb://lambda.zip
```

## Testing

To test the duplicate detection:

1. Submit a lead through the API
2. Try to submit another lead with the same email or phone number
3. The second submission should be rejected with a 409 Conflict status code

Example response for a duplicate submission:

```json
{
  "status": "error",
  "message": "Duplicate lead detected. This lead has already been submitted."
}
```

# Lead Export Functionality

The system now includes a CSV export feature for leads that allows internal teams to download lead data for reporting and analysis.

## Features

- Export leads to CSV file from the dashboard
- Filter exports by date range and/or vendor code
- Dynamically generated CSV file with descriptive filename
- Custom backend endpoint for efficient data retrieval

## Usage

1. Click the "Export CSV" button in the dashboard
2. Select filter options:
   - Vendor (optional): Filter leads by specific vendor
   - Date Range (optional): Specify start and end dates
3. Click "Download CSV" to generate and download the file

## API Endpoint

### GET /export

Retrieves leads with optional filtering for export purposes.

**Query Parameters:**
- `vendor_code` (optional): Filter leads by vendor code
- `start_date` (optional): Filter leads after this date (ISO format)
- `end_date` (optional): Filter leads before this date (ISO format)

**Response (200):**
```json
[
  {
    "lead_id": "uuid-string",
    "first_name": "John",
    "last_name": "Doe",
    "zip_code": "12345",
    "state": "CA",
    "phone_home": "1234567890",
    "lp_caller_id": "1234567890",
    "email": "john.doe@example.com",
    "vendor_code": "VENDOR1",
    "timestamp": "2023-05-10T15:30:00.000Z"
  },
  ...
]
```

Results are sorted by timestamp in descending order (newest first).

# DocuSign Integration

The system now includes integration with DocuSign to send and track retainer agreements to leads. This enhancement allows for a streamlined client onboarding process.

## Features

- Send retainer agreements directly from the lead management interface
- Auto-populate client information in DocuSign template
- Track document status (sent, delivered, viewed, completed, declined)
- Automatically update lead status to "completed" when retainer is sent or signed
- Ability to resend retainer agreements when needed

## AWS Backend Requirements

To implement the DocuSign integration, the following AWS resources and configurations are required:

### Environment Variables

The Lambda function requires these additional environment variables:

- `DS_INTEGRATION_KEY`: DocuSign integration key from the developer account
- `DS_USER_ID`: DocuSign API user ID
- `DS_ACCOUNT_ID`: DocuSign account ID
- `DS_RETAINER_TEMPLATE_ID`: ID of the DocuSign template for retainer agreements
- `DS_PRIVATE_KEY`: RSA private key for JWT authentication (Base64 encoded)
- `DS_AUTH_SERVER`: DocuSign authentication server URL (defaults to demo server)
- `DS_API_URL`: DocuSign API URL (defaults to demo API)

### DynamoDB Updates

The Leads table requires the following updates:

1. Add a new Global Secondary Index:
   - `EnvelopeIdIndex`: For looking up leads by DocuSign envelope ID
   - Partition Key: `envelope_id`

2. The Leads table now stores additional fields for each lead:
   - `docusign_info`: Object containing DocuSign status information
     - `envelopeId`: The DocuSign envelope ID
     - `status`: Current status of the document
     - `sentAt`: Timestamp when the document was sent
     - `deliveredAt`: Timestamp when email was delivered
     - `viewedAt`: Timestamp when document was first viewed
     - `completedAt`: Timestamp when document was completed
     - `declinedAt`: Timestamp if document was declined
     - `lastUpdated`: Timestamp of the last status update
   - `envelope_id`: Copy of the envelope ID at root level for the GSI
   - `disposition`: Updated to "completed" when a retainer is sent or completed

### Lambda Function Dependencies

Add these npm packages to the Lambda function:

```bash
npm install docusign-esign jsonwebtoken moment
```

### API Gateway Updates

Add a new route to the API Gateway:

- `POST /leads/{lead_id}/send-retainer`: Endpoint to send retainer agreements
- `POST /docusign/webhook`: Webhook endpoint for DocuSign status callbacks

### DocuSign Setup

1. Create a DocuSign developer account if you don't have one
2. Create a retainer agreement template in DocuSign
3. Set up a DocuSign Connect configuration to send webhooks to the `/docusign/webhook` endpoint
4. Configure the integration key and RSA key pair for JWT authentication

## Deployment

1. Add the required environment variables to your Lambda function
2. Update the DynamoDB table with the new GSI
3. Deploy the updated Lambda code with DocuSign dependencies
4. Configure the API Gateway with the new routes
5. Set up the DocuSign template and webhook

## JWT Authentication

The system uses JWT (JSON Web Token) authentication with DocuSign. The private key is stored as an environment variable, and a token is requested when needed with a 1-hour expiration time. The system caches the token until it expires to minimize authentication requests.
