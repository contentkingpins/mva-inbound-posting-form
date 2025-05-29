# Frontend Integration Guide - MVA CRM API

## Overview
The backend API is now fully deployed and operational. This guide provides all necessary information for frontend integration.

**API Base URL**: `https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod`

## Key Changes Made

### 1. Authentication Flow Fixed
- The "API key is required" error was coming from frontend code, not the backend
- Backend uses **Cognito authentication**, not API keys
- All auth endpoints work with Cognito tokens, not API keys

### 2. Important Notes
- **Remove all API key logic from authentication endpoints**
- **Use Cognito JWT tokens for protected endpoints**
- **Handle 401 responses as authentication errors, not API key errors**

## API Endpoints

### Authentication Endpoints (Public)

#### 1. Get Username by Email
```javascript
POST /auth/get-username
Content-Type: application/json

Request Body:
{
  "email": "user@example.com"
}

Response (200):
{
  "username": "johndoe"
}

Response (404):
{
  "error": "User not found"
}
```

#### 2. Forgot Password
```javascript
POST /auth/forgot-password
Content-Type: application/json

Request Body:
{
  "username": "johndoe"
}

Response (200):
{
  "message": "Password reset code sent"
}
```

#### 3. Confirm Forgot Password
```javascript
POST /auth/confirm
Content-Type: application/json

Request Body:
{
  "username": "johndoe",
  "confirmationCode": "123456",
  "newPassword": "NewPassword123!"
}

Response (200):
{
  "message": "Password reset successful"
}
```

### Protected Endpoints (Require JWT Token)

All protected endpoints require the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### 4. Lead Management

**List Leads**
```javascript
GET /leads
Authorization: Bearer YOUR_JWT_TOKEN

Response (200):
{
  "leads": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "555-0123",
      "company": "ACME Corp",
      "createdAt": "2025-05-28T12:00:00Z"
    }
  ],
  "count": 1
}
```

**Create Lead**
```javascript
POST /leads
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

Request Body:
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "555-0124",
  "company": "Tech Corp"
}

Response (201):
{
  "lead": {
    "id": "generated-uuid",
    ...
  }
}
```

**Update Lead**
```javascript
PATCH /leads/{id}
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

Request Body:
{
  "phone": "555-9999",
  "company": "New Company"
}

Response (200):
{
  "lead": { ...updated lead data... }
}
```

**Delete Lead**
```javascript
DELETE /leads/{id}
Authorization: Bearer YOUR_JWT_TOKEN

Response (200):
{
  "message": "Lead deleted successfully"
}
```

#### 5. Admin Dashboard

**Get Statistics**
```javascript
GET /admin/stats
Authorization: Bearer YOUR_JWT_TOKEN

Response (200):
{
  "totalLeads": 150,
  "totalVendors": 25,
  "totalUsers": 50,
  "leadsThisMonth": 30,
  "conversionRate": 15.5
}
```

**Get Analytics**
```javascript
GET /admin/analytics
Authorization: Bearer YOUR_JWT_TOKEN

Response (200):
{
  "leadsByMonth": [...],
  "leadsBySource": [...],
  "vendorPerformance": [...]
}
```

## Authentication Implementation

### 1. Cognito Sign In
```javascript
import { CognitoUserPool, AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';

const userPool = new CognitoUserPool({
  UserPoolId: 'us-east-1_lhc964tLD',
  ClientId: '1ekkeqvftfnv0ld0u8utdbafv1'
});

async function signIn(username, password) {
  const user = new CognitoUser({
    Username: username,
    Pool: userPool
  });

  const authDetails = new AuthenticationDetails({
    Username: username,
    Password: password
  });

  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        // Store this token and use it for API calls
        localStorage.setItem('authToken', idToken);
        resolve(idToken);
      },
      onFailure: (err) => {
        reject(err);
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        // Handle first-time login password change
        // Show UI to get new password, then:
        // user.completeNewPasswordChallenge(newPassword, {}, callbacks);
      }
    });
  });
}
```

### 2. Making Authenticated API Calls
```javascript
async function fetchLeads() {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch('https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      return;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call failed:', error);
  }
}
```

## Error Handling

### Common Error Responses

1. **401 Unauthorized**
   ```json
   {
     "error": "Unauthorized",
     "message": "Valid authentication token required"
   }
   ```
   **Action**: Redirect to login, clear stored tokens

2. **400 Bad Request**
   ```json
   {
     "error": "Validation error",
     "message": "Missing required fields"
   }
   ```
   **Action**: Show validation errors to user

3. **404 Not Found**
   ```json
   {
     "error": "Not found",
     "message": "Resource not found"
   }
   ```
   **Action**: Show appropriate error message

4. **500 Internal Server Error**
   ```json
   {
     "error": "Internal server error",
     "message": "An error occurred"
   }
   ```
   **Action**: Show generic error message, retry

## CORS Configuration

The API is configured to accept requests from:
- `https://main.d21xta9fg9b6w.amplifyapp.com`

Allowed headers:
- `Content-Type`
- `Authorization`
- `x-api-key` (though not used for auth endpoints)

## Testing

### Test User
- Email: `george@contentkingpins.com`
- Username: `admin`
- Role: Admin (has access to all endpoints)

### Quick Test Commands

Test authentication (no token needed):
```bash
curl -X POST https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/auth/get-username \
  -H "Content-Type: application/json" \
  -d '{"email":"george@contentkingpins.com"}'
```

## Migration Checklist

- [ ] Remove all API key logic from authentication endpoints
- [ ] Update error handling to not show "API key required" for 401 errors
- [ ] Implement Cognito authentication flow
- [ ] Store JWT tokens securely (localStorage or sessionStorage)
- [ ] Add token to Authorization header for protected endpoints
- [ ] Handle token expiration (redirect to login)
- [ ] Update UI to handle "newPasswordRequired" for first-time logins
- [ ] Test all endpoints with proper authentication

## Support

If you encounter any issues:
1. Check CloudWatch logs for the Lambda function
2. Verify JWT token is being sent correctly
3. Ensure CORS headers are present in requests
4. Check that the user has appropriate permissions (role)

## Important Security Notes

1. **Never expose Cognito credentials in frontend code**
2. **Always use HTTPS for API calls**
3. **Implement token refresh logic for long sessions**
4. **Clear tokens on logout**
5. **Handle token expiration gracefully**

---

Backend deployment completed on: May 28, 2025
API Version: 1.0
Lambda Function: mva-inbound-posting-api 