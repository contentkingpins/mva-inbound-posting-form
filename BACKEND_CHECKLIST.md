# Backend Team Checklist - CORS Fix for Production

## 🎯 Goal
Enable CORS in API Gateway to support JWT authentication for production CRM deployment.

## ✅ Tasks

### 1. Open AWS Console
- [ ] Navigate to **API Gateway**
- [ ] Find API: `9qtb4my1ij`
- [ ] Click on **Resources**

### 2. Enable CORS on Each Endpoint
For EACH of these resources:
- [ ] `/leads`
- [ ] `/auth` (and all sub-paths)
- [ ] `/stats`
- [ ] `/export`
- [ ] `/vendors`

**Steps per resource:**
- [ ] Click on resource name
- [ ] **Actions** → **Enable CORS**
- [ ] Set **Access-Control-Allow-Origin**: `https://main.d21xta9fg9b6w.amplifyapp.com`
- [ ] Set **Access-Control-Allow-Headers**: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key`
- [ ] Set **Access-Control-Allow-Methods**: `GET,POST,OPTIONS,PUT,PATCH,DELETE`
- [ ] Click **Enable CORS and replace existing CORS headers**

### 3. Deploy API
- [ ] Click **Actions** → **Deploy API**
- [ ] Select **Deployment stage**: `prod`
- [ ] Click **Deploy**

### 4. Verify
- [ ] Test that OPTIONS requests return proper CORS headers
- [ ] Confirm with frontend team that authentication works

## 🚨 Current Issue
Frontend is temporarily disabled authentication to bypass CORS - **NOT production ready!**

## ⏱️ Time Estimate
- **Setup:** 5-10 minutes
- **Testing:** 5 minutes
- **Total:** 15 minutes max

## 📞 When Complete
Reply to frontend team confirming:
- [ ] CORS enabled on all resources
- [ ] API deployed to prod stage
- [ ] Ready for authentication re-enabling 