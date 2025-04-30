# Lead Management API

A serverless Node.js application for managing sales leads using AWS Lambda, API Gateway, and DynamoDB.

## Features

- POST /leads endpoint to validate and store lead information
- GET /leads endpoint to retrieve all leads or filter by vendor code
- Automatic validation of lead data
- Vendor verification against a Vendors DynamoDB table
- API key protection for POST endpoint
- Full request logging to CloudWatch

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

## Monitoring

API requests are logged to CloudWatch under the log group `/aws/apigateway/leads-api`. You can view these logs in the AWS Console or using the AWS CLI:

```
aws logs get-log-events --log-group-name /aws/apigateway/leads-api --log-stream-name YOUR_LOG_STREAM
```
