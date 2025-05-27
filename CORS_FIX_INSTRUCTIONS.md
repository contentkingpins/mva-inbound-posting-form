# CRITICAL: API Gateway CORS Configuration Fix

## The Problem
- Frontend app at `https://main.d21xta9fg9b6w.amplifyapp.com` 
- API at `https://9gtsb4mv2j.execute-api.us-east-1.amazonaws.com/prod/leads`
- **ANY custom header (Authorization, x-api-key) triggers CORS preflight**
- API Gateway is NOT configured to handle OPTIONS requests

## The Solution (Backend Team Must Implement)

### 1. Enable CORS in API Gateway Console

For EACH resource (`/leads`, `/auth/*`, etc.):

1. Log into AWS Console → API Gateway
2. Select your API
3. For each resource:
   - Click on the resource
   - Actions → Enable CORS
   - Configure:
     ```
     Access-Control-Allow-Origin: https://main.d21xta9fg9b6w.amplifyapp.com
     Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
     Access-Control-Allow-Methods: GET,POST,PATCH,DELETE,OPTIONS
     ```
   - Save

### 2. Deploy API Changes
- Actions → Deploy API
- Select 'prod' stage
- Deploy

### 3. Verify OPTIONS Handling
Test with curl:
```bash
curl -X OPTIONS https://9gtsb4mv2j.execute-api.us-east-1.amazonaws.com/prod/leads \
  -H "Origin: https://main.d21xta9fg9b6w.amplifyapp.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: x-api-key"
```

Should return:
```
HTTP/2 200
access-control-allow-origin: https://main.d21xta9fg9b6w.amplifyapp.com
access-control-allow-headers: Content-Type,X-Api-Key,Authorization
access-control-allow-methods: GET,POST,OPTIONS
```

## Alternative: Serverless Framework Fix

If using serverless.yml:

```yaml
functions:
  api:
    handler: index.handler
    events:
      - http:
          path: /leads
          method: ANY
          cors:
            origin: 'https://main.d21xta9fg9b6w.amplifyapp.com'
            headers:
              - Content-Type
              - X-Api-Key
              - Authorization
            allowCredentials: false
```

Then deploy: `serverless deploy`

## Testing
Once deployed, the frontend will automatically start working with authentication headers.

## Timeline
**This is blocking ALL authenticated operations.** Please implement ASAP. 