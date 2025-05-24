# 🚨 CORS Fix Instructions for API Gateway

## The Problem:
Your Lambda function has CORS headers, but API Gateway isn't configured to handle preflight requests.

## Quick Fix in AWS Console:

### 1. **Go to API Gateway:**
- AWS Console → API Gateway
- Find your API: `9qtb4my1ij` (or similar)

### 2. **Enable CORS on Each Resource:**
For each endpoint (`/leads`, `/auth/*`, etc.):
- Click on the resource
- Actions → Enable CORS
- Configure:
  ```
  Access-Control-Allow-Origin: https://main.d21xta9fg9b6w.amplifyapp.com
  Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
  Access-Control-Allow-Methods: GET,POST,OPTIONS,PUT,PATCH,DELETE
  ```

### 3. **Deploy API:**
- Actions → Deploy API
- Stage: prod

## Alternative: Allow All Origins (Less Secure):
```
Access-Control-Allow-Origin: *
```

## Or Add Your Domain to Lambda (Already Done):
The Lambda already has CORS headers, but API Gateway is blocking the preflight.

## Temporary Workaround:
Remove the Authorization header from the fetch request (NOT RECOMMENDED for production):

```javascript
// In dashboard/app.js, line ~981
headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // 'Authorization': `Bearer ${token}` // Temporarily comment out
}
```

## Proper Solution:
1. Fix CORS in API Gateway (recommended)
2. Or use AWS SDK to configure API Gateway programmatically
3. Or add your Amplify domain to allowed origins

## Test After Fix:
1. Clear browser cache
2. Open DevTools Network tab
3. Look for successful OPTIONS request
4. Then the GET request should work

---

**Note:** The app will work once CORS is fixed in API Gateway. All other issues have been resolved. 