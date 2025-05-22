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

## User Management

### Authentication System

The CRM includes a comprehensive user authentication system with the following features:

#### Admin Users
- Admin users have full access to the system
- Can view and manage all leads regardless of which vendor they belong to
- Can create, edit, and disable agent accounts
- Can reset agent passwords when needed
- Access the admin panel with additional management capabilities

#### Agent Users
- Limited access based on role-based permissions
- Can only view and manage leads assigned to them
- Cannot access admin-only features
- Each agent has their own username and password

### User Management Process

1. **Creating New Users**
   - Only administrators can create new user accounts
   - From the admin panel, click "Create New User" button
   - Fill out all required information including username, email, and initial password
   - Select the role (Admin or Agent)
   - New users are active by default

2. **Managing Existing Users**
   - View all users in the admin panel
   - Enable/disable users with the status toggle switch
   - Edit user information using the "Edit" button
   - Reset passwords using the "Reset Password" button (admins cannot see current passwords)

3. **Password Management**
   - Passwords are securely stored using bcrypt hashing
   - Admins can reset passwords but cannot view existing passwords
   - Users can be required to change temporary passwords on first login

4. **Login System**
   - Users access the system through a central login page
   - The system automatically redirects users to appropriate areas based on their role
   - JWT tokens are used for secure authentication
   - Session management with automatic logout for inactive sessions

## Lead Event History

The lead management system now includes comprehensive event tracking:

1. **Event Logging**
   - All lead-related actions are automatically logged
   - Each event includes timestamp, action type, and relevant details
   - Events include creation, updates, disposition changes, and DocuSign status changes

2. **Viewing Event History**
   - The event history is displayed in the lead detail view
   - Ordered chronologically with newest events at the top
   - Provides full audit trail of all changes made to a lead

3. **Event Types**
   - **Created**: Initial lead creation
   - **Updated**: Changes to lead information or disposition
   - **DocuSign Status Update**: Changes in document signing status

This event history provides full transparency and audit capabilities for all lead management activities.

# Backend Setup for Authentication System

## Required AWS Resources

To implement the user authentication and management system, you need to set up the following AWS resources:

### 1. DynamoDB Users Table

Create a DynamoDB table to store user account information:

```bash
aws cloudformation deploy \
  --template-file users-table.yaml \
  --stack-name lead-management-users \
  --capabilities CAPABILITY_IAM
```

The Users table has the following schema:
- Primary Key: `username` (string)
- Global Secondary Index: `EmailIndex`
  - Partition Key: `email` (string)
- Fields:
  - `username`: Unique username
  - `email`: User email address
  - `password`: Bcrypt-hashed password (never stored in plain text)
  - `role`: User role (admin or agent)
  - `first_name`: User's first name
  - `last_name`: User's last name
  - `active`: Boolean flag indicating if account is active
  - `created_at`: Timestamp of account creation
  - `last_login`: Timestamp of last successful login
  - `updated_at`: Timestamp of last account update

### 2. Lambda Environment Variables

Add these environment variables to your Lambda function:

```
JWT_SECRET=your_jwt_secret_key_here  # Secret key for signing JWT tokens
USERS_TABLE=Users                    # The name of the Users DynamoDB table
TOKEN_EXPIRATION=24h                 # Token expiration period
```

The JWT_SECRET should be a secure random string at least 32 characters long.

### 3. API Gateway Routes

Add these routes to API Gateway:

- `POST /auth/login`: Endpoint for user login
- `POST /auth/register`: Endpoint for creating new users (admin only)
- `GET /auth/users`: List all users (admin only)
- `GET /auth/users/{username}`: Get user profile
- `PATCH /auth/users/{username}`: Update user profile
- `POST /auth/users/{username}/change-password`: Change password endpoint

### 4. Lambda Function Dependencies

Add these npm packages to the Lambda function:

```bash
npm install bcryptjs jsonwebtoken
```

## Initial Setup Steps

Follow these steps to initialize the authentication system:

### 1. Create Admin User

When deploying for the first time, you need to create an initial admin user directly in the DynamoDB table:

```bash
aws dynamodb put-item \
  --table-name Users \
  --item '{
    "username": {"S": "admin"},
    "email": {"S": "admin@example.com"},
    "password": {"S": "HASHED_PASSWORD_HERE"},
    "role": {"S": "admin"},
    "active": {"BOOL": true},
    "created_at": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}
  }'
```

**Important**: The password must be hashed using bcrypt. Use the provided utility script to generate a hashed password:

```bash
node scripts/generate-password-hash.js YourStrongPassword123
```

### 2. Configure CORS

Ensure CORS is properly configured in API Gateway to allow requests from your frontend:

```
GET /auth/* 
  - Access-Control-Allow-Origin: 'https://your-frontend-domain.com'
  - Access-Control-Allow-Headers: 'Content-Type,Authorization'
  - Access-Control-Allow-Methods: 'GET,POST,PATCH,DELETE'
```

### 3. Deploy API Gateway Changes

Deploy the updated API Gateway configuration:

```bash
aws apigateway create-deployment \
  --rest-api-id your-api-id \
  --stage-name prod
```

### 4. Set Up Password Encryption

The system uses bcrypt for password hashing. To encrypt passwords for manual creation, use:

```javascript
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const plaintextPassword = 'your-password';

bcrypt.genSalt(saltRounds, function(err, salt) {
    bcrypt.hash(plaintextPassword, salt, function(err, hash) {
        console.log('Hashed password:', hash);
    });
});
```

## Security Considerations

1. **JWT Tokens**: JWT tokens are used for authentication and stored in the client's localStorage.
   - Tokens expire after 24 hours by default
   - Using HTTPS is essential to prevent token interception

2. **Password Requirements**: Enforce strong password policies:
   - Minimum 8 characters
   - Mix of uppercase, lowercase, numbers and special characters
   - Regular password rotation for admin accounts

3. **API Authorization**: Protect sensitive endpoints:
   - Use IAM roles for AWS resource access
   - Implement endpoint authorization based on user roles
   - Use API keys for third-party integrations

# Detailed Backend Implementation Guide

## System Architecture

The system consists of the following components:

1. **API Gateway**: Entry point for all HTTP requests
2. **Lambda Functions**: Business logic handlers
3. **DynamoDB Tables**: Data storage (Leads, Vendors, Users)
4. **Client Application**: Dashboard interface

### Component Relationships

```
┌─────────────┐        ┌───────────────┐        ┌─────────────┐
│             │        │               │        │             │
│   Client    │◄─────► │ API Gateway   │◄─────► │   Lambda    │
│ Application │        │               │        │             │
└─────────────┘        └───────────────┘        └──────┬──────┘
                                                       │
                                                       ▼
                                                ┌─────────────┐
                                                │             │
                                                │  DynamoDB   │
                                                │   Tables    │
                                                │             │
                                                └─────────────┘
```

## Integration Procedure

Follow these steps to integrate the new features:

### Step 1: Update Lambda Function

1. Add the authentication and user management modules to your Lambda codebase:
   - Copy `auth-service.js` and `auth-routes.js` to your project root
   - Import them in your main handler file (e.g., `index.js`)

2. Install required dependencies:
   ```bash
   npm install bcryptjs jsonwebtoken
   ```

3. Update your Lambda handler to route authentication-related requests:

```javascript
// index.js - Main Lambda handler
const authRoutes = require('./auth-routes');

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Extract path and HTTP method
  const path = event.path;
  const httpMethod = event.httpMethod;
  
  // Handle authentication routes
  if (path.startsWith('/auth')) {
    return await handleAuthRoutes(path, httpMethod, event);
  }
  
  // Handle JWT-protected routes
  if (isJwtProtectedRoute(path)) {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const authResult = authRoutes.verifyAuthToken(authHeader);
    
    if (!authResult.authenticated) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 'error',
          message: authResult.message || 'Authentication required'
        })
      };
    }
    
    // For admin-only routes, check role
    if (isAdminRoute(path) && authResult.user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 'error',
          message: 'Admin access required'
        })
      };
    }
    
    // Set authenticated user in event for later use
    event.user = authResult.user;
  }
  
  // Rest of your existing routing logic...
  // ...
};
```

### Step 2: Configure Environment Variables

Add these environment variables to your Lambda function:

```
JWT_SECRET=your_jwt_secret_key_here  # Secret key for signing JWT tokens
USERS_TABLE=Users                    # The name of the Users DynamoDB table
TOKEN_EXPIRATION=24h                 # Token expiration period
```

### Step 3: Deploy DynamoDB Users Table

Deploy the CloudFormation template to create the Users table:

```bash
aws cloudformation deploy \
  --template-file users-table.yaml \
  --stack-name lead-management-users \
  --capabilities CAPABILITY_IAM
```

### Step 4: Create Initial Admin User

Generate a password hash:

```bash
node scripts/generate-password-hash.js YourStrongPassword123
```

Create the admin user in DynamoDB:

```bash
aws dynamodb put-item \
  --table-name Users \
  --item '{
    "username": {"S": "admin"},
    "email": {"S": "admin@example.com"},
    "password": {"S": "HASHED_PASSWORD_HERE"},
    "role": {"S": "admin"},
    "active": {"BOOL": true},
    "created_at": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}
  }'
```

## Authentication Implementation

The authentication system uses JWT tokens for user validation. Here's how to implement authentication checks:

### 1. Authentication Middleware

Create a middleware function to validate auth tokens:

```javascript
// auth-middleware.js
const authRoutes = require('./auth-routes');

function authenticateRequest(event, requiredRole = null) {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  const authResult = authRoutes.verifyAuthToken(authHeader);
  
  if (!authResult.authenticated) {
    return {
      authenticated: false,
      statusCode: 401,
      message: authResult.message || 'Authentication required'
    };
  }
  
  // Check role if required
  if (requiredRole && authResult.user.role !== requiredRole) {
    return {
      authenticated: false,
      statusCode: 403,
      message: `${requiredRole} access required`
    };
  }
  
  return {
    authenticated: true,
    user: authResult.user
  };
}

module.exports = { authenticateRequest };
```

### 2. Protect Routes

Apply this middleware to your endpoints:

```javascript
// Example of protecting an endpoint
async function handleGetLeads(event) {
  // Authenticate the request
  const authResult = authenticateRequest(event);
  if (!authResult.authenticated) {
    return createResponse(authResult.statusCode, { 
      status: 'error', 
      message: authResult.message 
    });
  }
  
  // Request is authenticated, user info is in authResult.user
  const user = authResult.user;
  
  // For agents, only show their leads
  let leads;
  if (user.role === 'admin') {
    // Admins can see all leads
    leads = await getAllLeads();
  } else {
    // Agents can only see their own leads
    leads = await getLeadsByAgent(user.username);
  }
  
  return createResponse(200, leads);
}
```

## User Management Implementation

Implement these functions to handle user management:

### 1. List Users (Admin Only)

```javascript
async function handleListUsers(event) {
  // Check admin authorization
  const authResult = authenticateRequest(event, 'admin');
  if (!authResult.authenticated) {
    return createResponse(authResult.statusCode, { 
      status: 'error', 
      message: authResult.message 
    });
  }

  // Get users from database
  const users = await authService.listUsers();
  
  return createResponse(200, { 
    status: 'success', 
    users: users 
  });
}
```

### 2. Create New User (Admin Only)

```javascript
async function handleCreateUser(event) {
  // Check admin authorization
  const authResult = authenticateRequest(event, 'admin');
  if (!authResult.authenticated) {
    return createResponse(authResult.statusCode, { 
      status: 'error', 
      message: authResult.message 
    });
  }

  // Parse request body
  const userData = JSON.parse(event.body);
  
  // Validate required fields
  if (!userData.username || !userData.email || !userData.password) {
    return createResponse(400, { 
      status: 'error', 
      message: 'Missing required fields' 
    });
  }
  
  // Create the user
  const result = await authService.registerUser(userData);
  
  if (result.success) {
    return createResponse(201, { 
      status: 'success', 
      message: 'User created successfully',
      user: result.user
    });
  } else {
    return createResponse(400, { 
      status: 'error', 
      message: result.message 
    });
  }
}
```

### 3. Update User Status

```javascript
async function handleUpdateUserStatus(event) {
  // Check admin authorization
  const authResult = authenticateRequest(event, 'admin');
  if (!authResult.authenticated) {
    return createResponse(authResult.statusCode, { 
      status: 'error', 
      message: authResult.message 
    });
  }

  // Get username from path parameter
  const username = event.pathParameters.username;
  
  // Parse request body
  const data = JSON.parse(event.body);
  
  // Update the user
  const result = await authService.updateUser(username, {
    active: data.active
  });
  
  if (result.success) {
    return createResponse(200, { 
      status: 'success', 
      message: `User ${data.active ? 'activated' : 'deactivated'} successfully` 
    });
  } else {
    return createResponse(400, { 
      status: 'error', 
      message: result.message 
    });
  }
}
```

## Lead Event History Implementation

The lead event history tracking should be integrated into any code that modifies leads:

### 1. Update Lead Handler

Modify your lead update handler to add history entries:

```javascript
async function handleUpdateLead(leadId, data, user) {
  // Get existing lead
  const lead = await getLead(leadId);
  if (!lead) {
    return createResponse(404, { status: 'error', message: 'Lead not found' });
  }
  
  // Check permissions
  if (user.role !== 'admin' && lead.assignedTo !== user.username) {
    return createResponse(403, { 
      status: 'error', 
      message: 'Not authorized to update this lead' 
    });
  }
  
  // Record timestamp for the update
  const timestamp = new Date().toISOString();
  
  // Create history entry
  const historyEntry = {
    timestamp,
    action: "updated",
    user: user.username,
    disposition: data.disposition || lead.disposition,
    notes: data.notes !== undefined ? 'Updated' : undefined,
    checklist_updated: data.checklist_data ? true : undefined
  };
  
  // Get existing history or initialize empty array
  const updateHistory = lead.update_history || [];
  
  // Update lead with new data and add to history
  const updateParams = {
    TableName: LEADS_TABLE,
    Key: { lead_id: leadId },
    UpdateExpression: 'SET updated_at = :timestamp, update_history = :history',
    ExpressionAttributeValues: {
      ':timestamp': timestamp,
      ':history': [...updateHistory, historyEntry]
    },
    ReturnValues: 'ALL_NEW'
  };
  
  // Add other fields to update expression if provided
  if (data.disposition) {
    updateParams.UpdateExpression += ', disposition = :disposition';
    updateParams.ExpressionAttributeValues[':disposition'] = data.disposition;
  }
  
  if (data.notes !== undefined) {
    updateParams.UpdateExpression += ', notes = :notes';
    updateParams.ExpressionAttributeValues[':notes'] = data.notes;
  }
  
  if (data.checklist_data) {
    updateParams.UpdateExpression += ', checklist_data = :checklist';
    updateParams.ExpressionAttributeValues[':checklist'] = data.checklist_data;
  }
  
  // Perform the update
  const result = await dynamoDB.update(updateParams).promise();
  
  return createResponse(200, { 
    status: 'success', 
    lead: result.Attributes 
  });
}
```

### 2. Tracking DocuSign Events

When DocuSign status changes, add history entry:

```javascript
async function updateDocuSignStatus(leadId, status, eventTimestamp) {
  // Get existing lead
  const lead = await getLead(leadId);
  if (!lead) {
    console.error(`Lead ${leadId} not found`);
    return false;
  }
  
  // Create history entry
  const historyEntry = {
    timestamp: new Date().toISOString(),
    action: "docusign_status_update",
    status: status
  };
  
  // Get existing history or initialize empty array
  const updateHistory = lead.update_history || [];
  
  // Update the lead
  await dynamoDB.update({
    TableName: LEADS_TABLE,
    Key: { lead_id: leadId },
    UpdateExpression: 'SET docusign_info.status = :status, update_history = :history',
    ExpressionAttributeValues: {
      ':status': status,
      ':history': [...updateHistory, historyEntry]
    }
  }).promise();
  
  return true;
}
```

## API Routes Configuration

Set up these additional routes in API Gateway:

### Authentication Routes

| Method | Path                              | Handler Function          | Required Role |
|--------|-----------------------------------|---------------------------|--------------|
| POST   | /auth/login                       | handleLogin               | None         |
| POST   | /auth/register                    | handleRegister            | Admin        |
| GET    | /auth/users                       | handleListUsers           | Admin        |
| GET    | /auth/users/{username}            | handleGetUser             | Admin/Self   |
| PATCH  | /auth/users/{username}            | handleUpdateUser          | Admin/Self   |
| POST   | /auth/users/{username}/change-password | handleChangePassword | Admin/Self   |

### Protected Lead Routes

| Method | Path               | Handler Function  | Required Role       |
|--------|--------------------|--------------------|---------------------|
| GET    | /leads             | handleGetLeads     | Any Authenticated  |
| POST   | /leads             | handleCreateLead   | Any Authenticated  |
| GET    | /leads/{leadId}    | handleGetLead      | Admin/Assigned Agent |
| PATCH  | /leads/{leadId}    | handleUpdateLead   | Admin/Assigned Agent |
| POST   | /leads/{leadId}/send-retainer | handleSendRetainer | Admin/Assigned Agent |

## Testing Procedures

Follow these testing procedures to verify the implementation:

### 1. User Authentication Testing

Test the authentication flow:

1. Create a test user:
   ```
   POST /auth/register
   {
     "username": "testadmin",
     "email": "testadmin@example.com",
     "password": "Test123!",
     "role": "admin"
   }
   ```

2. Login with the user:
   ```
   POST /auth/login
   {
     "username": "testadmin",
     "password": "Test123!"
   }
   ```
   
   Verify the response contains a JWT token.

3. Access a protected endpoint using the token:
   ```
   GET /auth/users
   Authorization: Bearer <token>
   ```
   
   Verify you receive a list of users.

### 2. Role-Based Access Testing

Test role-based restrictions:

1. Create an agent user:
   ```
   POST /auth/register
   {
     "username": "testagent",
     "email": "testagent@example.com",
     "password": "Test123!",
     "role": "agent"
   }
   ```

2. Login with the agent:
   ```
   POST /auth/login
   {
     "username": "testagent",
     "password": "Test123!"
   }
   ```

3. Try to access admin-only endpoints:
   ```
   GET /auth/users
   Authorization: Bearer <agent-token>
   ```
   
   Verify you receive a 403 Forbidden error.

### 3. Lead History Testing

Test lead history tracking:

1. Create a lead
2. Update the lead's disposition
3. Get the lead details
4. Verify the update_history array contains entries for both the creation and update

## Security Considerations

1. **JWT Secret Management**:
   - Store JWT_SECRET in AWS Secrets Manager
   - Rotate secrets periodically
   - Use different secrets for different environments

2. **Input Validation**:
   - Always validate and sanitize user inputs
   - Use strict type checking
   - Implement rate limiting

3. **Access Control**:
   - Apply principle of least privilege
   - Double-check role requirements in handlers
   - Log all security-related events

4. **Password Security**:
   - Enforce strong password policies
   - Store only hashed passwords
   - Implement account lockout after failed attempts

5. **API Security**:
   - Use HTTPS for all communications
   - Implement CORS properly
   - Set secure HTTP headers

## Deployment Checklist

Before deploying to production, ensure:

1. ✅ JWT_SECRET is set to a strong, unique value
2. ✅ All environment variables are configured
3. ✅ DynamoDB Users table is deployed
4. ✅ CORS is properly configured in API Gateway
5. ✅ Admin user is created
6. ✅ Authentication middleware is integrated
7. ✅ Lead history tracking is implemented
8. ✅ All API routes are protected appropriately
9. ✅ Test users and data are removed from production

# Password Recovery System

## Implementation Requirements

### Backend Components

1. **DynamoDB Updates**
   - Add a new GSI to the Users table: `ResetTokenIndex`
     - Partition Key: `reset_token` (string)
   - Add new fields to user records:
     - `reset_token`: For password reset validation
     - `reset_token_expires`: Timestamp when token expires

2. **New API Endpoints**
   - `POST /auth/forgot-password`: Initiates password reset process
   - `GET /auth/verify-reset-token`: Validates a reset token
   - `POST /auth/reset-password`: Updates password using a valid token

3. **Email Service Integration**
   - AWS SES (Simple Email Service) configuration
   - Verified sender email address
   - HTML email template for password reset

4. **Environment Variables**
   - `SES_REGION`: AWS region for SES
   - `SES_SENDER_EMAIL`: Verified sender email
   - `RESET_TOKEN_EXPIRY`: Token expiration time (in minutes)
   - `FRONTEND_URL`: Base URL for the frontend (for reset links)

### Frontend Components

1. **Forgot Password Page**
   - Form to enter email address
   - Success/error message display
   - Link back to login page

2. **Password Reset Page**
   - URL format: `/reset-password?token=RESET_TOKEN`
   - Form with new password and confirmation fields
   - Password strength requirements
   - Success/error message display

## User Flow

1. User clicks "Forgot Password" on login page
2. User enters their email address
3. System generates a secure reset token and stores it in the user record
4. System sends an email with a reset link containing the token
5. User clicks the link in the email
6. Frontend validates the token with the backend
7. If valid, user enters a new password
8. Backend verifies the token again and updates the password
9. User is redirected to login with the new password

## API Documentation

### POST /auth/forgot-password

Initiates the password reset process.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Password reset instructions sent to your email"
}
```

**Note:** For security reasons, the API returns success even if the email is not found, to prevent email enumeration attacks.

### GET /auth/verify-reset-token

Validates a reset token before showing the password reset form.

**Query Parameters:**
- `token`: The reset token from the email link

**Success Response (200):**
```json
{
  "status": "success",
  "valid": true
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "message": "Invalid or expired reset token"
}
```

### POST /auth/reset-password

Resets the user's password using a valid token.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "new-password"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Password updated successfully"
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "message": "Invalid or expired reset token"
}
```

## Implementation Details

### Token Generation

Reset tokens should be:
- Cryptographically secure random strings (at least 32 characters)
- Unique across all users
- Short-lived (typically 15-60 minutes)

Example token generation:

```javascript
const crypto = require('crypto');
const generateResetToken = () => crypto.randomBytes(32).toString('hex');
```

### Email Template

The password reset email should:
- Clearly identify your application
- Provide context about the password reset request
- Include a direct link to reset the password
- Mention the expiration time
- Provide support contact information

Example reset link format:
```
https://your-app-domain.com/reset-password?token=RESET_TOKEN
```

### Security Considerations

1. **Token Lifecycle**:
   - Invalidate tokens immediately after use
   - Set short expiration times
   - Store expiration time in the database

2. **Rate Limiting**:
   - Limit password reset requests to prevent abuse
   - Implement progressive delays for multiple attempts

3. **Email Security**:
   - Use DKIM and SPF for email authentication
   - Send emails over TLS
   - Monitor delivery and open rates

4. **Auditing**:
   - Log all password reset attempts
   - Alert on suspicious patterns (multiple resets for different accounts from same IP)

## Backend Code Example

Here's a simplified implementation of the forgot password handler:

```javascript
async function handleForgotPassword(event) {
  // Parse request body
  const { email } = JSON.parse(event.body);
  
  // Find user by email
  const user = await getUserByEmail(email);
  
  // Even if user is not found, return success to prevent email enumeration
  if (!user) {
    console.log(`No user found with email: ${email}`);
    return createResponse(200, { 
      status: 'success', 
      message: 'Password reset instructions sent to your email if it exists in our system' 
    });
  }
  
  // Generate reset token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenExpiry = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour from now
  
  // Save token to user record
  await updateUserResetToken(user.username, token, tokenExpiry);
  
  // Send reset email
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(email, resetLink);
  
  return createResponse(200, { 
    status: 'success', 
    message: 'Password reset instructions sent to your email' 
  });
}
```
# Force deploy trigger Thu May 22 13:51:51 PDT 2025
