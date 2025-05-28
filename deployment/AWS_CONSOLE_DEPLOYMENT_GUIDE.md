# MVA CRM API - AWS Console Deployment Guide

## 🎯 Overview
Complete step-by-step guide to deploy the CRM backend functionality through the AWS Console interface. This includes lead management, admin dashboard, and authentication middleware.

## 📋 Prerequisites
- AWS Console access with appropriate permissions
- Existing Lambda function: `mva-inbound-posting-api`
- Existing API Gateway: `9qtb4my1ij`
- DynamoDB tables: `Leads`, `Users`, `Vendors`

---

## 🚀 Step 1: Prepare Deployment Package

### 1.1 Create ZIP File Locally
1. Navigate to your deployment folder: `C:\Users\asieg\Documents\Cursor\MVA-inbound-posting-form\mva-inbound-posting-form-1\deployment`
2. Select all files EXCEPT:
   - `*.md` files
   - `*.zip` files
   - `deploy.sh`
3. Right-click → "Send to" → "Compressed (zipped) folder"
4. Name it: `mva-crm-api.zip`

### 1.2 Verify ZIP Contents
Your ZIP should contain:
- `index.js` (main router)
- `leadController.js` (lead CRUD operations)
- `adminController.js` (dashboard metrics)
- `authMiddleware.js` (JWT authentication)
- `get-username-by-email.js` (existing auth)
- `forgot-password.js` (existing auth)
- `confirm-forgot-password.js` (existing auth)
- `package.json` (dependencies)
- `node_modules/` folder (all packages)

---

## 🔧 Step 2: Update Lambda Function

### 2.1 Navigate to Lambda Console
1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
2. Search for function: `mva-inbound-posting-api`
3. Click on the function name

### 2.2 Upload New Code
1. In the **Code** tab, click **Upload from** → **.zip file**
2. Click **Upload** and select your `mva-crm-api.zip` file
3. Click **Save**
4. Wait for the upload to complete (may take 1-2 minutes)

### 2.3 Set Environment Variables
1. Go to **Configuration** tab
2. Click **Environment variables** in the left sidebar
3. Click **Edit**
4. Add the following variables:

| Key | Value |
|-----|-------|
| `LEADS_TABLE` | `Leads` |
| `USERS_TABLE` | `Users` |
| `VENDORS_TABLE` | `Vendors` |
| `USER_POOL_ID` | `us-east-1_lhc964tLD` |
| `COGNITO_CLIENT_ID` | `1ekkeqvftfnv0ld0u8utdbafv1` |
| `JWT_SECRET` | `your-secure-jwt-secret-key-here` |

5. Click **Save**

### 2.4 Update Function Configuration
1. In **Configuration** → **General configuration**
2. Click **Edit**
3. Set **Timeout** to `30 seconds` (for complex queries)
4. Set **Memory** to `512 MB` (for better performance)
5. Click **Save**

---

## 🌐 Step 3: Configure API Gateway

### 3.1 Navigate to API Gateway Console
1. Go to [API Gateway Console](https://console.aws.amazon.com/apigateway/)
2. Find API with ID: `9qtb4my1ij`
3. Click on the API name

### 3.2 Create /leads Resource
1. Click **Resources** in the left sidebar
2. Select the root resource `/`
3. Click **Actions** → **Create Resource**
4. Set **Resource Name**: `leads`
5. Set **Resource Path**: `leads`
6. Check **Enable API Gateway CORS**
7. Click **Create Resource**

### 3.3 Create /leads Methods

#### GET /leads (List leads)
1. Select the `/leads` resource
2. Click **Actions** → **Create Method**
3. Select **GET** from dropdown → Click checkmark
4. Set **Integration type**: `Lambda Function`
5. Check **Use Lambda Proxy integration**
6. Set **Lambda Function**: `mva-inbound-posting-api`
7. Click **Save**
8. Click **OK** to grant permissions

#### POST /leads (Create lead)
1. Select the `/leads` resource
2. Click **Actions** → **Create Method**
3. Select **POST** from dropdown → Click checkmark
4. Set **Integration type**: `Lambda Function`
5. Check **Use Lambda Proxy integration**
6. Set **Lambda Function**: `mva-inbound-posting-api`
7. Click **Save**
8. Click **OK** to grant permissions

### 3.4 Create /leads/{id} Resource
1. Select the `/leads` resource
2. Click **Actions** → **Create Resource**
3. Set **Resource Name**: `{id}`
4. Set **Resource Path**: `{id}`
5. Check **Enable API Gateway CORS**
6. Click **Create Resource**

### 3.5 Create /leads/{id} Methods

#### PATCH /leads/{id} (Update lead)
1. Select the `/leads/{id}` resource
2. Click **Actions** → **Create Method**
3. Select **PATCH** from dropdown → Click checkmark
4. Set **Integration type**: `Lambda Function`
5. Check **Use Lambda Proxy integration**
6. Set **Lambda Function**: `mva-inbound-posting-api`
7. Click **Save**
8. Click **OK** to grant permissions

#### DELETE /leads/{id} (Delete lead)
1. Select the `/leads/{id}` resource
2. Click **Actions** → **Create Method**
3. Select **DELETE** from dropdown → Click checkmark
4. Set **Integration type**: `Lambda Function`
5. Check **Use Lambda Proxy integration**
6. Set **Lambda Function**: `mva-inbound-posting-api`
7. Click **Save**
8. Click **OK** to grant permissions

### 3.6 Create /admin Resource
1. Select the root resource `/`
2. Click **Actions** → **Create Resource**
3. Set **Resource Name**: `admin`
4. Set **Resource Path**: `admin`
5. Check **Enable API Gateway CORS**
6. Click **Create Resource**

### 3.7 Create /admin/stats Resource
1. Select the `/admin` resource
2. Click **Actions** → **Create Resource**
3. Set **Resource Name**: `stats`
4. Set **Resource Path**: `stats`
5. Check **Enable API Gateway CORS**
6. Click **Create Resource**

### 3.8 Create GET /admin/stats Method
1. Select the `/admin/stats` resource
2. Click **Actions** → **Create Method**
3. Select **GET** from dropdown → Click checkmark
4. Set **Integration type**: `Lambda Function`
5. Check **Use Lambda Proxy integration**
6. Set **Lambda Function**: `mva-inbound-posting-api`
7. Click **Save**
8. Click **OK** to grant permissions

### 3.9 Create /admin/analytics Resource
1. Select the `/admin` resource
2. Click **Actions** → **Create Resource**
3. Set **Resource Name**: `analytics`
4. Set **Resource Path**: `analytics`
5. Check **Enable API Gateway CORS**
6. Click **Create Resource**

### 3.10 Create GET /admin/analytics Method
1. Select the `/admin/analytics` resource
2. Click **Actions** → **Create Method**
3. Select **GET** from dropdown → Click checkmark
4. Set **Integration type**: `Lambda Function`
5. Check **Use Lambda Proxy integration**
6. Set **Lambda Function**: `mva-inbound-posting-api`
7. Click **Save**
8. Click **OK** to grant permissions

---

## 🔄 Step 4: Configure CORS (If Not Auto-Enabled)

### 4.1 Enable CORS for Each Resource
For each resource (`/leads`, `/leads/{id}`, `/admin/stats`, `/admin/analytics`):

1. Select the resource
2. Click **Actions** → **Enable CORS**
3. Set **Access-Control-Allow-Origin**: `*`
4. Set **Access-Control-Allow-Headers**: 
   ```
   Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
   ```
5. Set **Access-Control-Allow-Methods**: Select all relevant methods
6. Click **Enable CORS and replace existing CORS headers**

---

## 🚀 Step 5: Deploy API

### 5.1 Deploy to Production Stage
1. Click **Actions** → **Deploy API**
2. Select **Deployment stage**: `prod`
3. Set **Deployment description**: `CRM API deployment with lead management and admin dashboard`
4. Click **Deploy**

### 5.2 Verify Deployment
1. Go to **Stages** → **prod**
2. Note the **Invoke URL**: `https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod`
3. Your new endpoints will be:
   - `GET /leads` - List leads
   - `POST /leads` - Create lead
   - `PATCH /leads/{id}` - Update lead
   - `DELETE /leads/{id}` - Delete lead
   - `GET /admin/stats` - Dashboard stats
   - `GET /admin/analytics` - Analytics data

---

## 🧪 Step 6: Test the API

### 6.1 Test Authentication Endpoint
```bash
curl -X GET "https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/auth/get-username?email=test@example.com"
```

### 6.2 Test Lead Creation (requires JWT token)
```bash
curl -X POST "https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "555-0123",
    "company": "Test Company"
  }'
```

### 6.3 Test Admin Stats (requires admin JWT token)
```bash
curl -X GET "https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/admin/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

---

## 🔍 Step 7: Monitor and Troubleshoot

### 7.1 Check Lambda Logs
1. Go to **Lambda Console** → `mva-inbound-posting-api`
2. Click **Monitor** tab
3. Click **View CloudWatch logs**
4. Check recent log streams for errors

### 7.2 Check API Gateway Logs
1. Go to **API Gateway Console** → Your API
2. Go to **Stages** → **prod**
3. Click **Logs/Tracing** tab
4. Enable **CloudWatch Logs** if needed

### 7.3 Common Issues and Solutions

#### Issue: 502 Bad Gateway
- **Cause**: Lambda function error
- **Solution**: Check Lambda logs for specific error

#### Issue: 403 Forbidden
- **Cause**: Missing or invalid JWT token
- **Solution**: Ensure proper Authorization header

#### Issue: CORS Error
- **Cause**: CORS not properly configured
- **Solution**: Re-enable CORS for affected resources

#### Issue: 404 Not Found
- **Cause**: API not deployed or wrong endpoint
- **Solution**: Redeploy API and verify endpoint URLs

---

## ✅ Step 8: Verification Checklist

- [ ] Lambda function updated with new code
- [ ] Environment variables configured
- [ ] All API Gateway resources created:
  - [ ] `/leads` (GET, POST)
  - [ ] `/leads/{id}` (PATCH, DELETE)
  - [ ] `/admin/stats` (GET)
  - [ ] `/admin/analytics` (GET)
- [ ] CORS enabled for all resources
- [ ] API deployed to `prod` stage
- [ ] Test endpoints working
- [ ] CloudWatch logs accessible

---

## 🎉 Completion

Your CRM backend API is now fully deployed and ready for the frontend team to integrate! The API provides:

- **Lead Management**: Full CRUD operations with role-based access
- **Admin Dashboard**: Real-time stats and analytics
- **Authentication**: JWT-based security with role verification
- **Performance**: Optimized DynamoDB queries with GSI
- **Monitoring**: CloudWatch logs for debugging

**Base URL**: `https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod`

The frontend team can now proceed with their integration using the endpoints documented in the API specification. 