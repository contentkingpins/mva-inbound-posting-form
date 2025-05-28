# MVA CRM API Deployment Guide

## 🎯 Overview
This guide will help you deploy the complete CRM functionality including:
- Lead management (CRUD operations)
- Admin dashboard (stats & analytics)
- Authentication middleware
- API Gateway integration

## 📋 Prerequisites
- AWS CLI configured with appropriate permissions
- Node.js installed locally
- Access to AWS Lambda function: `mva-inbound-posting-api`
- API Gateway ID: `9qtb4my1ij`

## 🚀 Deployment Steps

### Step 1: Install Dependencies
```bash
# Navigate to deployment folder
cd deployment

# Install required packages
npm install @aws-sdk/client-dynamodb@^3.458.0
npm install @aws-sdk/lib-dynamodb@^3.458.0  
npm install jsonwebtoken@^9.0.2
npm install uuid@^9.0.0

# Verify installation
ls node_modules
```

### Step 2: Create Lambda Deployment Package
```bash
# Create deployment ZIP with all files
zip -r mva-crm-api.zip . -x "*.md" "*.zip"

# Or create manually with these files:
# - index.js (main router)
# - leadController.js (lead CRUD operations)
# - adminController.js (dashboard metrics)
# - authMiddleware.js (JWT authentication)
# - get-username-by-email.js (existing auth function)
# - forgot-password.js (existing auth function)
# - confirm-forgot-password.js (existing auth function)
# - package.json (dependencies)
# - node_modules/ (all installed packages)
```

### Step 3: Update Lambda Function
```bash
# Update the existing Lambda function
aws lambda update-function-code \
  --function-name mva-inbound-posting-api \
  --zip-file fileb://mva-crm-api.zip

# Verify the update
aws lambda get-function --function-name mva-inbound-posting-api
```

### Step 4: Set Environment Variables
```bash
# Add required environment variables
aws lambda update-function-configuration \
  --function-name mva-inbound-posting-api \
  --environment Variables='{
    "LEADS_TABLE":"Leads",
    "USERS_TABLE":"Users",
    "VENDORS_TABLE":"Vendors",
    "USER_POOL_ID":"us-east-1_lhc964tLD",
    "COGNITO_CLIENT_ID":"1ekkeqvftfnv0ld0u8utdbafv1",
    "JWT_SECRET":"your-secure-jwt-secret-key-here"
  }'
```

### Step 5: Update API Gateway Routes

#### A. Create Lead Routes
```bash
# Get the root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id 9qtb4my1ij --query 'items[?path==`/`].id' --output text)

# Create /leads resource
aws apigateway create-resource \
  --rest-api-id 9qtb4my1ij \
  --parent-id $ROOT_ID \
  --path-part leads

# Get the leads resource ID
LEADS_ID=$(aws apigateway get-resources --rest-api-id 9qtb4my1ij --query 'items[?pathPart==`leads`].id' --output text)

# Create GET method for /leads
aws apigateway put-method \
  --rest-api-id 9qtb4my1ij \
  --resource-id $LEADS_ID \
  --http-method GET \
  --authorization-type NONE

# Create POST method for /leads  
aws apigateway put-method \
  --rest-api-id 9qtb4my1ij \
  --resource-id $LEADS_ID \
  --http-method POST \
  --authorization-type NONE

# Create {id} resource under /leads
aws apigateway create-resource \
  --rest-api-id 9qtb4my1ij \
  --parent-id $LEADS_ID \
  --path-part '{id}'

# Get the {id} resource ID
LEAD_ID_ID=$(aws apigateway get-resources --rest-api-id 9qtb4my1ij --query 'items[?pathPart==`{id}`].id' --output text)

# Create PATCH method for /leads/{id}
aws apigateway put-method \
  --rest-api-id 9qtb4my1ij \
  --resource-id $LEAD_ID_ID \
  --http-method PATCH \
  --authorization-type NONE

# Create DELETE method for /leads/{id}
aws apigateway put-method \
  --rest-api-id 9qtb4my1ij \
  --resource-id $LEAD_ID_ID \
  --http-method DELETE \
  --authorization-type NONE
```

#### B. Create Admin Routes
```bash
# Create /admin resource
aws apigateway create-resource \
  --rest-api-id 9qtb4my1ij \
  --parent-id $ROOT_ID \
  --path-part admin

# Get admin resource ID
ADMIN_ID=$(aws apigateway get-resources --rest-api-id 9qtb4my1ij --query 'items[?pathPart==`admin`].id' --output text)

# Create /admin/stats resource
aws apigateway create-resource \
  --rest-api-id 9qtb4my1ij \
  --parent-id $ADMIN_ID \
  --path-part stats

# Create /admin/analytics resource  
aws apigateway create-resource \
  --rest-api-id 9qtb4my1ij \
  --parent-id $ADMIN_ID \
  --path-part analytics

# Get stats and analytics resource IDs
STATS_ID=$(aws apigateway get-resources --rest-api-id 9qtb4my1ij --query 'items[?pathPart==`stats`].id' --output text)
ANALYTICS_ID=$(aws apigateway get-resources --rest-api-id 9qtb4my1ij --query 'items[?pathPart==`analytics`].id' --output text)

# Create GET methods
aws apigateway put-method --rest-api-id 9qtb4my1ij --resource-id $STATS_ID --http-method GET --authorization-type NONE
aws apigateway put-method --rest-api-id 9qtb4my1ij --resource-id $ANALYTICS_ID --http-method GET --authorization-type NONE
```

#### C. Configure Lambda Integration
```bash
# Get Lambda function ARN
LAMBDA_ARN=$(aws lambda get-function --function-name mva-inbound-posting-api --query 'Configuration.FunctionArn' --output text)

# Create integrations for each method (example for GET /leads)
aws apigateway put-integration \
  --rest-api-id 9qtb4my1ij \
  --resource-id $LEADS_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations"

# Add Lambda permissions for API Gateway
aws lambda add-permission \
  --function-name mva-inbound-posting-api \
  --statement-id "api-gateway-leads-access" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:337909762852:9qtb4my1ij/*/*"
```

#### D. Enable CORS
```bash
# Enable CORS for each method (example for /leads)
aws apigateway put-method \
  --rest-api-id 9qtb4my1ij \
  --resource-id $LEADS_ID \
  --http-method OPTIONS \
  --authorization-type NONE

aws apigateway put-method-response \
  --rest-api-id 9qtb4my1ij \
  --resource-id $LEADS_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{
    "method.response.header.Access-Control-Allow-Origin": true,
    "method.response.header.Access-Control-Allow-Methods": true,
    "method.response.header.Access-Control-Allow-Headers": true
  }'
```

### Step 6: Deploy API Gateway
```bash
# Deploy all changes to prod stage
aws apigateway create-deployment \
  --rest-api-id 9qtb4my1ij \
  --stage-name prod \
  --description "CRM functionality deployment v2.0"
```

### Step 7: Test Endpoints
```bash
# Test the new endpoints
curl -X GET "https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

curl -X GET "https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/admin/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

## 🔧 Troubleshooting

### Common Issues

#### 1. CORS Errors
- Ensure CORS headers are returned in ALL responses (including errors)
- Check that CORS_HEADERS constant is used consistently
- Verify OPTIONS method is configured for each endpoint

#### 2. Authentication Errors  
- Check JWT_SECRET environment variable is set
- Verify JWT token format: `Bearer <token>`
- Ensure user role is included in token claims

#### 3. DynamoDB Permissions
```bash
# Add DynamoDB permissions to Lambda execution role
aws iam attach-role-policy \
  --role-name lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

#### 4. Lambda Timeout Issues
```bash
# Increase Lambda timeout for heavy operations
aws lambda update-function-configuration \
  --function-name mva-inbound-posting-api \
  --timeout 30
```

## 📊 New API Endpoints

### Authentication Required
All endpoints require `Authorization: Bearer <JWT_TOKEN>` header.

### Lead Management
- `GET /leads` - List leads (with filtering)
- `POST /leads` - Create new lead  
- `PATCH /leads/{id}` - Update lead
- `DELETE /leads/{id}` - Delete lead (admin only)

### Admin Dashboard (Admin Only)
- `GET /admin/stats` - Dashboard metrics
- `GET /admin/analytics?period=week` - Time series data

### Existing Authentication Endpoints  
- `POST /auth/get-username` - Convert email to username
- `POST /auth/forgot-password` - Initiate password reset
- `POST /auth/confirm` - Confirm password reset

## 🎉 Success Verification

Your deployment is successful when:
1. ✅ Lambda function shows updated code
2. ✅ All environment variables are set
3. ✅ API Gateway shows new routes
4. ✅ CORS enabled for all methods
5. ✅ Test calls return 200/201 (not 403/500)
6. ✅ Frontend can authenticate and fetch data

## 📞 Support

If you encounter issues:
1. Check CloudWatch logs for Lambda function
2. Verify API Gateway execution logs
3. Test with Postman/curl before frontend integration
4. Ensure DynamoDB tables exist and have correct schema

**Estimated deployment time: 15-30 minutes** 