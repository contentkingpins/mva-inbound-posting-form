# Email to Username Authentication Solution

## Problem

Users sign up with AWS Cognito and get assigned a random username (e.g., `user_1621234567_abc123`), but try to log in using their email address. This causes authentication failures since the login attempt uses email where a username is expected.

## Solution

We've implemented a backend API endpoint that securely converts an email address to a Cognito username. The frontend can call this endpoint before attempting to authenticate, then use the returned username with Cognito's authentication methods.

### API Endpoint

**URL**: `https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/auth/get-username`

**Method**: `POST`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Successful Response** (200 OK):
```json
{
  "username": "user_1621234567_abc123"
}
```

**User Not Found Response** (404 Not Found):
```json
{
  "error": "User not found"
}
```

### Integration Steps

1. When a user attempts to log in with their email address:
   - First call the `/auth/get-username` endpoint with the email
   - Use the returned username to authenticate with Cognito
   
2. Handle error cases:
   - 404: User doesn't exist (invalid email or not signed up)
   - 400: Invalid request (missing email)
   - 500: Server error

### Security

This approach keeps admin-level Cognito access on the backend rather than in the browser, following security best practices. The Lambda function has the necessary IAM permissions to query Cognito user pools.

### Example Implementation

See `frontend-example.js` for a sample implementation showing how to integrate this endpoint with your authentication flow.

## Troubleshooting

If users are still having authentication issues:

1. Verify the correct API endpoint is being called
2. Check for CORS issues in browser developer tools
3. Ensure the email format matches exactly what was used during signup
4. Confirm the Cognito user pool ID is correctly configured on the backend 