/**
 * Cloudflare Worker - CORS Proxy for MVA API
 * 
 * Deploy this as a Cloudflare Worker to bypass CORS issues
 * until the backend team fixes API Gateway
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Only allow requests from your Amplify app
  const allowedOrigin = 'https://main.d21xta9fg9b6w.amplifyapp.com'
  const origin = request.headers.get('Origin')
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
        'Access-Control-Max-Age': '86400',
      }
    })
  }
  
  // Get the original API URL from the request
  const url = new URL(request.url)
  const apiPath = url.pathname.replace('/api', '') // Remove /api prefix
  const apiUrl = `https://9gtsb4mv2j.execute-api.us-east-1.amazonaws.com/prod${apiPath}${url.search}`
  
  // Create new headers, preserving the original ones
  const headers = new Headers(request.headers)
  
  // Add the API key from environment variable or hardcode temporarily
  headers.set('x-api-key', 'fpoI4Uwleh63QVGGsnAUG49W7B8k67g21Gc8glIl')
  
  // Forward the request to the actual API
  const apiResponse = await fetch(apiUrl, {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' 
      ? await request.text() 
      : undefined
  })
  
  // Create the response with CORS headers
  const response = new Response(apiResponse.body, {
    status: apiResponse.status,
    statusText: apiResponse.statusText,
    headers: apiResponse.headers
  })
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key')
  
  return response
}

/**
 * DEPLOYMENT INSTRUCTIONS:
 * 
 * 1. Create a Cloudflare account (free)
 * 2. Go to Workers & Pages
 * 3. Create a new Worker
 * 4. Paste this code
 * 5. Deploy
 * 6. Update dashboard/config.json to use the Worker URL:
 *    "API_ENDPOINT": "https://your-worker.workers.dev/api/leads"
 * 
 * This will proxy all requests through Cloudflare, adding proper CORS headers.
 */ 