# AWS Cognito Integration Setup

This document outlines the steps to complete the AWS Cognito integration for the MVA Lead Management system.

## What Has Been Fixed

- ✅ Corrected character encoding issues in auth-service.js and auth-routes.js
- ✅ Updated package.json with "type": "module" to support ES modules
- ✅ Fixed auth-routes.js to use ES module syntax
- ✅ Added apiEndpoint to config.json
- ✅ Created test-cognito-config.js to validate the configuration
- ✅ Verified Cognito SDK references in HTML files
- ✅ Ensured proper dependencies are installed
- ✅ Updated configuration with correct User Pool ID: us-east-1_Lhc964tLD

## Current Configuration Status

- **User Pool ID**: us-east-1_Lhc964tLD 
- **Admin User**: george@contentkingpins.com
- **API Name**: MVA-Inbound-Posting-API
- **Client ID**: (Still needs to be obtained from AWS Console)

## Required Next Steps

1. **Get the App Client ID**:
   - Log in to the AWS Console
   - Navigate to Amazon Cognito service
   - Select the User Pool with ID us-east-1_Lhc964tLD
   - Go to "App integration" > "App clients"
   - Copy the "App client ID" value
   - Update both config.json files with this value

2. **Update Configuration Files**:
   - Replace placeholder clientId in config.json:
     ```json
     {
       "region": "us-east-1",
       "userPoolId": "us-east-1_Lhc964tLD",
       "clientId": "YOUR_ACTUAL_CLIENT_ID", // Replace with actual App Client ID
       "apiEndpoint": "https://nv01uveape.execute-api.us-east-1.amazonaws.com/prod"
     }
     ```
   - Do the same for dashboard/config.json

3. **Test Configuration**:
   ```
   node test-cognito-config.js
   ```

4. **Bundle the Auth Service for Browser Use**:
   ```
   npm run build:auth
   ```

5. **Update the Dashboard Build**:
   ```
   npm run build
   ```

6. **Deploy to Production**:
   ```
   npm run deploy
   ```
   Note: You may need to update the S3 bucket name in the deploy script in package.json.

## Troubleshooting

If you encounter any issues:

1. **Encoding Problems**:
   - Ensure files are saved with UTF-8 encoding without BOM (Byte Order Mark)
   - If needed, recreate auth-service.js or auth-routes.js using a text editor with proper encoding settings

2. **Module Loading Issues**:
   - Verify the package.json has "type": "module"
   - Ensure imports use .js extension (e.g., import authService from './auth-service.js')
   - For JSON imports, use assert { type: 'json' }

3. **API Connection Issues**:
   - Ensure AWS Cognito User Pool has proper CORS settings
   - Verify the API Gateway has the Authorization header in the allowed headers
   - Check API Gateway deployment stage matches config

4. **Authentication Flow Errors**:
   - Verify ALLOW_USER_PASSWORD_AUTH is enabled in the App Client settings
   - Ensure username format is consistent
   - Check for email verification status

## Additional Resources

- [AWS Cognito User Pools Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [Amazon Cognito Identity JS on npm](https://www.npmjs.com/package/amazon-cognito-identity-js)
- [AWS JavaScript SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/) 