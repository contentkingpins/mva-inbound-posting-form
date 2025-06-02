// Main router handler for API Gateway requests
const getUsernameByEmail = require('./get-username-by-email');
const forgotPassword = require('./forgot-password');
const confirmForgotPassword = require('./confirm-forgot-password');
const leadController = require('./leadController');
const adminController = require('./adminController');
const assignmentController = require('./assignmentController');
const bulkController = require('./bulkController');
// PHASE 2: Search & Export Controllers
const searchController = require('./searchController');
const exportController = require('./exportController');
// PHASE 3: Document Management Controller
const documentController = require('./documentController');
const documentSearch = require('./documentSearch');

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
    
    // PHASE 1: Assignment Routes
    else if (path.includes('/leads/{id}/assign') || path.includes('/leads/') && event.pathParameters?.id && path.includes('assign')) {
      console.log('Routing to lead assignment handler');
      if (httpMethod === 'POST') {
        return await assignmentController.assignLead(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for assignment endpoint" })
        };
      }
    }
    else if (path.includes('/leads/{id}/reassign') || path.includes('/leads/') && event.pathParameters?.id && path.includes('reassign')) {
      console.log('Routing to lead reassignment handler');
      if (httpMethod === 'PUT') {
        return await assignmentController.reassignLead(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for reassignment endpoint" })
        };
      }
    }
    
    // PHASE 1: Agent Management Routes
    else if (path.includes('/agents/{agentId}/capacity') || path.includes('/agents/') && event.pathParameters?.agentId && path.includes('capacity')) {
      console.log('Routing to agent capacity handler');
      if (httpMethod === 'PUT') {
        return await assignmentController.updateAgentCapacity(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for agent capacity endpoint" })
        };
      }
    }
    else if (path.includes('/agents') || path.startsWith('/agents')) {
      console.log('Routing to agents handler');
      if (httpMethod === 'GET') {
        return await assignmentController.getAgents(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for agents endpoint" })
        };
      }
    }
    
    // PHASE 1: Bulk Operations Routes
    else if (path.includes('/leads/bulk-update') || path.includes('bulk-update')) {
      console.log('Routing to bulk update handler');
      if (httpMethod === 'POST') {
        return await bulkController.bulkUpdate(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for bulk update endpoint" })
        };
      }
    }
    else if (path.includes('/leads/bulk-assign') || path.includes('bulk-assign')) {
      console.log('Routing to bulk assign handler');
      if (httpMethod === 'POST') {
        return await bulkController.bulkAssign(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for bulk assign endpoint" })
        };
      }
    }
    
    // PHASE 2: Search Routes
    else if (path.includes('/leads/search/saved/{id}') || path.includes('/leads/search/saved/') && event.pathParameters?.id) {
      console.log('Routing to delete saved search handler');
      if (httpMethod === 'DELETE') {
        return await searchController.deleteSavedSearch(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for saved search deletion endpoint" })
        };
      }
    }
    else if (path.includes('/leads/search/saved') || path.includes('search/saved')) {
      console.log('Routing to saved search handler');
      if (httpMethod === 'POST') {
        return await searchController.saveSearch(event);
      } else if (httpMethod === 'GET') {
        return await searchController.getSavedSearches(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for saved search endpoint" })
        };
      }
    }
    else if (path.includes('/leads/filters') || path.includes('leads/filters')) {
      console.log('Routing to filter options handler');
      if (httpMethod === 'GET') {
        return await searchController.getFilterOptions(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for filter options endpoint" })
        };
      }
    }
    else if (path.includes('/leads/search') || path.includes('leads/search')) {
      console.log('Routing to advanced search handler');
      if (httpMethod === 'POST') {
        return await searchController.advancedSearch(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for search endpoint" })
        };
      }
    }
    
    // PHASE 2: Export Routes
    else if (path.includes('/leads/export/{jobId}/download') || path.includes('/leads/export/') && event.pathParameters?.jobId && path.includes('download')) {
      console.log('Routing to export download handler');
      if (httpMethod === 'GET') {
        return await exportController.downloadExport(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for export download endpoint" })
        };
      }
    }
    else if (path.includes('/leads/export/{jobId}') || path.includes('/leads/export/') && event.pathParameters?.jobId) {
      console.log('Routing to export job handler');
      if (httpMethod === 'GET') {
        return await exportController.getExportStatus(event);
      } else if (httpMethod === 'DELETE') {
        return await exportController.cancelExport(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for export job endpoint" })
        };
      }
    }
    else if (path.includes('/leads/export/history') || path.includes('export/history')) {
      console.log('Routing to export history handler');
      if (httpMethod === 'GET') {
        return await exportController.getExportHistory(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for export history endpoint" })
        };
      }
    }
    else if (path.includes('/leads/export') || path.includes('leads/export')) {
      console.log('Routing to export initiation handler');
      if (httpMethod === 'POST') {
        return await exportController.initiateExport(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for export endpoint" })
        };
      }
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
    
    // PHASE 3: Document Search & Analytics Routes
    else if (path.includes('/documents/search') || path.includes('documents/search')) {
      console.log('Routing to document search handler');
      if (httpMethod === 'POST') {
        return await documentSearch.searchDocuments(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for document search endpoint" })
        };
      }
    }
    else if (path.includes('/documents/analytics') || path.includes('documents/analytics')) {
      console.log('Routing to document analytics handler');
      if (httpMethod === 'GET') {
        return await documentSearch.getDocumentAnalytics(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for document analytics endpoint" })
        };
      }
    }
    else if (path.includes('/documents/recent') || path.includes('documents/recent')) {
      console.log('Routing to recent documents handler');
      if (httpMethod === 'GET') {
        return await documentSearch.getRecentDocuments(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for recent documents endpoint" })
        };
      }
    }
    else if (path.includes('/documents/{documentId}/share') || path.includes('/documents/') && event.pathParameters?.documentId && path.includes('share')) {
      console.log('Routing to document share handler');
      if (httpMethod === 'POST') {
        return await documentSearch.shareDocument(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for document share endpoint" })
        };
      }
    }
    
    // PHASE 3: Document Management Routes
    else if (path.includes('/documents/{documentId}/download') || path.includes('/documents/') && event.pathParameters?.documentId && path.includes('download')) {
      console.log('Routing to document download handler');
      if (httpMethod === 'GET') {
        return await documentController.downloadDocument(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for document download endpoint" })
        };
      }
    }
    else if (path.includes('/documents/{documentId}') || path.includes('/documents/') && event.pathParameters?.documentId) {
      console.log('Routing to document metadata handler');
      if (httpMethod === 'GET') {
        return await documentController.getDocumentMetadata(event);
      } else if (httpMethod === 'DELETE') {
        return await documentController.deleteDocument(event);
      } else if (httpMethod === 'PUT') {
        return await documentSearch.updateDocumentMetadata(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for document endpoint" })
        };
      }
    }
    else if (path.includes('/leads/{leadId}/documents') || path.includes('/leads/') && event.pathParameters?.leadId && path.includes('documents')) {
      console.log('Routing to lead documents handler');
      if (httpMethod === 'POST') {
        return await documentController.uploadDocument(event);
      } else if (httpMethod === 'GET') {
        return await documentController.getLeadDocuments(event);
      } else {
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: "Method not allowed for lead documents endpoint" })
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
            'POST /leads/{id}/assign',
            'PUT /leads/{id}/reassign',
            'POST /leads/bulk-update',
            'POST /leads/bulk-assign',
            'GET /agents',
            'PUT /agents/{agentId}/capacity',
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