# Email to Backend Team - CORS Configuration Requirements

**Subject: API Gateway CORS Configuration Needed for CRM Production Deployment**

Dear Backend Team,

We need your assistance with API Gateway configuration to enable our CRM frontend to communicate securely with the Lambda functions. Currently, we're experiencing CORS (Cross-Origin Resource Sharing) errors that prevent the frontend from making authenticated requests.

## Current Issue:
The frontend at `https://main.d21xta9fg9b6w.amplifyapp.com` cannot call the API at `https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod` due to CORS policy blocking.

## What Needs to Be Fixed:

### 1. **Enable CORS in API Gateway** (Not just Lambda)
While the Lambda function returns proper CORS headers, API Gateway needs to be configured to handle preflight (OPTIONS) requests.

**Steps Required:**
1. Log into AWS Console → API Gateway
2. Find API ID: `9qtb4my1ij`
3. For EACH resource (`/leads`, `/auth/*`, `/export`, `/vendors`, etc.):
   - Select the resource
   - Click **Actions** → **Enable CORS**
   - Configure with these settings:

```
Access-Control-Allow-Origin: https://main.d21xta9fg9b6w.amplifyapp.com
Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
Access-Control-Allow-Methods: GET,POST,OPTIONS,PUT,PATCH,DELETE
Access-Control-Allow-Credentials: true
```

4. **IMPORTANT:** Click **Deploy API** → Select `prod` stage

### 2. **Security Concern - GET /leads Authentication**
Currently, the Lambda allows unauthenticated GET requests to `/leads`. This is a security risk for production.

**Recommended Change in `index.js`:**
```javascript
// Current (line ~220)
if (method === 'GET') {
    const protectedGETPaths = [
        '/leads/sensitive',
        '/admin'
    ];
    return protectedGETPaths.some(protectedPath => path.startsWith(protectedPath));
}

// Should be:
if (method === 'GET') {
    const protectedGETPaths = [
        '/leads',        // ADD THIS
        '/leads/sensitive',
        '/admin'
    ];
    return protectedGETPaths.some(protectedPath => path.startsWith(protectedPath));
}
```

### 3. **Alternative: Support Multiple Origins** (If needed)
If you need to support localhost for development AND production:

```javascript
const allowedOrigins = [
    'https://main.d21xta9fg9b6w.amplifyapp.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

const origin = event.headers.origin || event.headers.Origin;
const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
};
```

## Testing the Fix:
After making these changes, we can verify by:
1. Opening browser DevTools → Network tab
2. Looking for successful OPTIONS requests
3. Confirming GET/POST requests include proper Authorization headers

## Current Workaround (Temporary):
We've temporarily disabled authentication headers to allow testing, but this is **NOT suitable for production** as it exposes all lead data publicly.

## Timeline:
- We need this fixed before production launch
- Currently testing without proper authentication (security risk)
- Please prioritize this for production readiness

## Questions We Need Answered:
1. Is there an API key we should be using instead of JWT tokens?
2. Are there any rate limiting or IP whitelist requirements?
3. Do you prefer JWT Bearer tokens or API keys for authentication?

Please let us know if you need any additional information or have questions about these requirements.

Best regards,
[Your Name]

---

**CC:** Project Manager, DevOps Team
**Priority:** High - Blocking Production Deployment 