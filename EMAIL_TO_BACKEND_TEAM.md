# Email to Backend Team - CORS Fix Required for Production

---

**Subject:** CORS Configuration Required in API Gateway for Production Deployment

**To:** Backend Development Team  
**From:** Frontend Team  
**Priority:** High - Required for Production Launch  

---

## Summary

The CRM frontend is complete and working in testing mode, but requires a CORS configuration in **API Gateway** (not Lambda) to support JWT Bearer token authentication for production deployment.

## Current Status
- ✅ Lambda CORS headers are configured correctly
- ✅ Frontend authentication system working
- ❌ API Gateway blocking CORS preflight requests
- ⚠️ Currently using insecure workaround for testing

## The Issue

When the frontend sends authenticated requests with `Authorization: Bearer <token>` headers, the browser triggers a CORS preflight OPTIONS request. API Gateway is blocking these preflight requests, even though the Lambda has proper CORS headers.

**Error Message:**
```
Access to fetch at 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads' 
from origin 'https://main.d21xta9fg9b6w.amplifyapp.com' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check
```

## Required Fix

### Location: AWS API Gateway Console
- **Service:** API Gateway  
- **API ID:** `9qtb4my1ij`
- **Stage:** `prod`

### Required Actions:

#### 1. Enable CORS on ALL Resources
For **each endpoint** (`/leads`, `/auth`, `/stats`, `/export`, `/vendors`, etc.):

1. Navigate to API Gateway → `9qtb4my1ij` → Resources
2. Select each resource (e.g., `/leads`)
3. Click **Actions** → **Enable CORS**
4. Configure settings:

```
Access-Control-Allow-Origin: https://main.d21xta9fg9b6w.amplifyapp.com
Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key
Access-Control-Allow-Methods: GET,POST,OPTIONS,PUT,PATCH,DELETE
Access-Control-Max-Age: 86400
```

#### 2. Deploy API
After enabling CORS on all resources:
1. Click **Actions** → **Deploy API**
2. Select **Deployment Stage:** `prod`
3. Click **Deploy**

#### 3. Alternative Quick Fix (Less Secure)
If you prefer to allow all origins temporarily:
```
Access-Control-Allow-Origin: *
```

## Technical Details

### Why This is Needed
- JWT Bearer tokens trigger CORS preflight requests (OPTIONS)
- API Gateway handles preflight separately from Lambda
- Lambda CORS headers only apply to actual requests, not preflight

### Current Workaround (Testing Only)
We've temporarily disabled authentication headers to bypass CORS:
```javascript
// TEMPORARY - NOT FOR PRODUCTION
headers: {
    // 'Authorization': `Bearer ${token}` // Commented out
}
```

**⚠️ This workaround exposes all lead data without authentication - NOT suitable for production!**

## Production Requirements

### Security Endpoints That Need Authentication:
- `GET /leads` - View leads data
- `PATCH /leads/{id}` - Update lead information  
- `POST /leads/{id}/send-retainer` - Send DocuSign agreements
- `GET /export` - Export lead data
- `GET /stats` - Analytics data
- `POST /leads` - Create new leads (if enabled)

### Headers the Frontend Sends:
```javascript
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

## Verification Steps

After making the changes, we can verify by:
1. Checking browser DevTools Network tab for successful OPTIONS requests
2. Confirming authenticated requests work without CORS errors
3. Testing all CRUD operations on leads

## Timeline

**Needed By:** Before production deployment  
**Estimated Fix Time:** 5-10 minutes  
**Testing Time:** 5 minutes  

## Alternative Solutions (if CORS fix is not possible)

1. **API Proxy through Amplify** (Frontend team can implement)
2. **Switch to API Key authentication** (Requires vendor management setup)
3. **Custom domain with same origin** (Infrastructure change)

## Contact Information

Please reply to confirm:
- [ ] CORS has been enabled on all API Gateway resources
- [ ] API has been deployed to `prod` stage  
- [ ] Ready for frontend team to re-enable authentication

**Questions?** Contact frontend team for immediate clarification.

---

**Note:** This is a standard CORS configuration required for any web application using JWT authentication with API Gateway. No changes to Lambda code are needed. 