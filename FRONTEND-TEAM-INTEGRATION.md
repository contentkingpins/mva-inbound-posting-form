# Frontend Team - AWS Cognito Integration Guide

This document provides the necessary information for integrating the frontend application with AWS Cognito authentication.

## AWS Cognito Configuration

Use these values in your config files:

```json
{
  "region": "us-east-1",
  "userPoolId": "us-east-1_Lhc964tLD",
  "clientId": "YOUR_CLIENT_ID",  // Get this from AWS Console or ask backend team
  "apiEndpoint": "https://nv01uveape.execute-api.us-east-1.amazonaws.com/prod"
}
```

## Admin Test User

An admin user has been created for testing:
- Email: george@contentkingpins.com
- Password: (Use the temporary password provided or contact admin for credentials)

## API Details

The API to use for all backend requests is: **MVA-Inbound-Posting-API**

## Integration Steps

1. **Update Configuration**:
   - Replace the placeholders in both config.json files with the values above
   - Get the Client ID from the AWS Console or backend team

2. **Authentication Flow**:
   - The integration is implemented using standard Cognito authentication
   - Make sure the login form uses the authService.signIn() method
   - All API requests should include the Cognito token in Authorization header
   - Token refresh has been implemented with a 45-minute interval

3. **CORS and Headers**:
   - The API is configured to accept the Authorization header
   - All requests should include 'Authorization' and 'x-api-key' headers

4. **Testing Authentication**:
   - Use the test admin user to verify the login flow
   - Check that protected API endpoints work with the token
   - Verify admin-specific functionality (user management)

5. **Deployment**:
   - After testing locally, build the application using `npm run build`
   - Deploy to the production environment using `npm run deploy`
   - The Amplify app URL is: https://main.d21xta9fg9b6w.amplifyapp.com/

## Troubleshooting

If you encounter authentication issues:

1. **Invalid client ID or user pool ID**:
   - Verify the configuration values match exactly with AWS Console
   - Run `node test-cognito-config.js` to check the configuration

2. **Authentication failure**:
   - Check if ALLOW_USER_PASSWORD_AUTH is enabled in App Client settings
   - Verify user exists and has verified email

3. **Token not recognized by API**:
   - Ensure token is passed correctly in the Authorization header
   - Check for token expiration and refresh logic

4. **User role issues**:
   - Admin users should be in the "admin" group
   - Check if custom:role attribute is set correctly

## Additional Notes

- The token refresh logic is implemented in app.js with the setupTokenRefresh() function
- User roles are extracted from the token's 'custom:role' attribute or the 'cognito:groups' claim
- All authentication code has been thoroughly tested and fixed for encoding issues

For any questions or issues, please contact the backend team. 