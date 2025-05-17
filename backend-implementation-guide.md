# Backend Implementation Guide

This document provides detailed instructions for the backend team on how to integrate the authentication system, user management, and lead event history tracking with the existing infrastructure.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Integration Procedure](#integration-procedure)
3. [Authentication Implementation](#authentication-implementation)
4. [User Management Implementation](#user-management-implementation)
5. [Lead Event History Implementation](#lead-event-history-implementation)
6. [API Routes Configuration](#api-routes-configuration)
7. [Testing Procedures](#testing-procedures)
8. [Security Considerations](#security-considerations)

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