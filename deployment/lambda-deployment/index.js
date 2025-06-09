// Main router handler for API Gateway requests
const getUsernameByEmail = require('./get-username-by-email');
const forgotPassword = require('./forgot-password');
const confirmForgotPassword = require('./confirm-forgot-password');
const leadController = require('./leadController');
const adminController = require('./adminController');

// CORS headers for consistency
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://main.d21xta9fg9b6w.amplifyapp.com",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-api-key",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  console.log('Router received event:', JSON.stringify(event, null, 2));
  
  // Extract the resource path from the event
  const path = event.resource || event.path || '';
  const httpMethod = event.httpMethod || '';
  
  console.log('Routing request - Path:', path, 'Method:', httpMethod);
  
  try {
    // Handle CORS preflight requests for all routes
    if (httpMethod === 'OPTIONS') {
      console.log('Handling OPTIONS request');
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: ''
      };
    }
    
    // Route based on the API Gateway resource path
    
    // Authentication Routes
    if (path.includes('/get-username') || path.includes('get-username')) {
      console.log('Routing to get-username-by-email handler');
      return await getUsernameByEmail.handler(event);
    } 
    else if (path.includes('/forgot-password') || path.includes('forgot-password')) {
      console.log('Routing to forgot-password handler');
      return await forgotPassword.handler(event);
    } 
    else if (path.includes('/confirm') || path.includes('confirm')) {
      console.log('Routing to confirm-forgot-password handler');
      return await confirmForgotPassword.handler(event);
    }
    
    // Lead Routes
    else if (path.includes('/leads/{id}') || path.includes('/leads/') && event.pathParameters?.id) {
      console.log('Routing to lead by ID handler');
      if (httpMethod === 'PATCH' || httpMethod === 'PUT') {
        return await leadController.updateLead(event);
      } else if (httpMethod === 'DELETE') {
        return await leadController.deleteLead(event);
      }
      // GET /leads/{id} - could be added later for individual lead retrieval
      else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for this endpoint" })
        };
      }
    }
    else if (path.includes('/leads') || path.startsWith('/leads')) {
      console.log('Routing to leads handler');
      if (httpMethod === 'GET') {
        return await leadController.getLeads(event);
      } else if (httpMethod === 'POST') {
        return await leadController.createLead(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for leads endpoint" })
        };
      }
    }
    
    // Admin Routes
    else if (path.includes('/admin/stats') || path.includes('admin/stats')) {
      console.log('Routing to admin stats handler');
      if (httpMethod === 'GET') {
        return await adminController.getStats(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for admin stats endpoint" })
        };
      }
    }
    else if (path.includes('/admin/analytics') || path.includes('admin/analytics')) {
      console.log('Routing to admin analytics handler');
      if (httpMethod === 'GET') {
        return await adminController.getAnalytics(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for admin analytics endpoint" })
        };
      }
    }
    
    // Default 404 handler
    else {
      console.log('No matching route found for path:', path);
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: "Endpoint not found", 
          path: path, 
          method: httpMethod,
          availableEndpoints: [
            'GET /leads',
            'POST /leads', 
            'PATCH /leads/{id}',
            'DELETE /leads/{id}',
            'GET /admin/stats',
            'GET /admin/analytics',
            'POST /auth/get-username',
            'POST /auth/forgot-password',
            'POST /auth/confirm'
          ]
        })
      };
    }
  } catch (error) {
    console.error('Router error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: "Internal server error", 
        message: error.message 
      })
    };
  }
}; 