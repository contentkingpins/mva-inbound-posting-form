# 🚀 PHASE 1 IMPLEMENTATION GUIDE - IMMEDIATE START

## 📋 **PHASE 1 SCOPE (2 WEEKS)**

**Goal:** Deliver basic lead assignment and bulk operations functionality to show immediate progress while setting realistic expectations for the larger system.

## 🗄️ **DATABASE SCHEMA CHANGES (Day 1)**

### **DynamoDB Table Updates**

Since we're using DynamoDB, we need to handle schema changes differently than SQL. Here are the required updates:

#### **1. Leads Table Updates**
```javascript
// New fields to add to lead items:
{
  assigned_agent: "john.doe@company.com",     // Agent email/ID
  assigned_at: "2024-01-15T10:30:00Z",       // Assignment timestamp
  priority: "high",                          // normal, high, urgent
  tags: ["hot-lead", "follow-up"],           // Array of tags
  last_activity: "2024-01-15T15:45:00Z",     // Last agent interaction
  notes_count: 3                             // Count of notes/activities
}
```

#### **2. Users Table Updates**
```javascript
// New fields for agent capacity tracking:
{
  capacity: 15,           // Current lead count assigned
  max_capacity: 25,       // Maximum leads they can handle
  availability: "active", // active, busy, away, offline
  last_seen: "2024-01-15T16:00:00Z",
  performance_score: 85   // Performance rating (0-100)
}
```

#### **3. Global Secondary Index (GSI) Requirements**
```javascript
// Add GSI for agent queries
{
  IndexName: "AgentAssignmentIndex",
  PartitionKey: "assigned_agent",
  SortKey: "assigned_at",
  ProjectionType: "ALL"
}

// Add GSI for priority filtering
{
  IndexName: "PriorityIndex", 
  PartitionKey: "priority",
  SortKey: "timestamp",
  ProjectionType: "ALL"
}
```

## 🔌 **API ENDPOINTS - PHASE 1**

### **1. Lead Assignment Endpoints**

#### **POST /api/leads/{leadId}/assign**
```javascript
// Assign a single lead to an agent
{
  method: "POST",
  path: "/api/leads/{leadId}/assign",
  body: {
    agent_email: "john.doe@company.com",
    priority: "high",
    notes: "High value lead - follow up ASAP"
  },
  response: {
    success: true,
    lead: {
      lead_id: "lead_123",
      assigned_agent: "john.doe@company.com",
      assigned_at: "2024-01-15T10:30:00Z",
      priority: "high"
    },
    agent_capacity: {
      current: 16,
      max: 25,
      percentage: 64
    }
  }
}
```

#### **PUT /api/leads/{leadId}/reassign**
```javascript
// Reassign lead to different agent
{
  method: "PUT", 
  path: "/api/leads/{leadId}/reassign",
  body: {
    new_agent: "jane.smith@company.com",
    reason: "Load balancing",
    notes: "Reassigned due to capacity"
  },
  response: {
    success: true,
    previous_agent: "john.doe@company.com",
    new_agent: "jane.smith@company.com",
    reassigned_at: "2024-01-15T11:00:00Z"
  }
}
```

### **2. Agent Management Endpoints**

#### **GET /api/agents**
```javascript
// Get all agents with capacity info
{
  method: "GET",
  path: "/api/agents",
  query: {
    include_capacity: true,
    status: "active" // optional filter
  },
  response: {
    agents: [
      {
        agent_id: "john.doe@company.com",
        name: "John Doe",
        capacity: {
          current: 15,
          max: 25,
          percentage: 60,
          available_slots: 10
        },
        status: "active",
        last_seen: "2024-01-15T16:00:00Z",
        performance_score: 85
      }
    ],
    summary: {
      total_agents: 8,
      active_agents: 6,
      total_capacity: 200,
      used_capacity: 120,
      utilization_percentage: 60
    }
  }
}
```

#### **PUT /api/agents/{agentId}/capacity**
```javascript
// Update agent capacity settings
{
  method: "PUT",
  path: "/api/agents/{agentId}/capacity", 
  body: {
    max_capacity: 30,
    availability: "active"
  },
  response: {
    success: true,
    agent: {
      agent_id: "john.doe@company.com",
      max_capacity: 30,
      current_capacity: 15,
      availability: "active"
    }
  }
}
```

### **3. Bulk Operations Endpoints**

#### **POST /api/leads/bulk-update**
```javascript
// Update multiple leads at once
{
  method: "POST",
  path: "/api/leads/bulk-update",
  body: {
    lead_ids: ["lead_123", "lead_456", "lead_789"],
    updates: {
      disposition: "Qualified",
      priority: "high",
      tags: ["qualified", "hot-lead"]
    },
    notes: "Bulk qualified after review"
  },
  response: {
    success: true,
    updated_count: 3,
    failed_count: 0,
    results: [
      {
        lead_id: "lead_123",
        status: "updated",
        timestamp: "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

#### **POST /api/leads/bulk-assign**
```javascript
// Assign multiple leads to agents
{
  method: "POST",
  path: "/api/leads/bulk-assign",
  body: {
    lead_ids: ["lead_123", "lead_456", "lead_789"],
    assignment_strategy: "round_robin", // or "capacity_based", "manual"
    agents: ["john.doe@company.com", "jane.smith@company.com"], // optional for manual
    priority: "normal"
  },
  response: {
    success: true,
    assignments: [
      {
        lead_id: "lead_123",
        assigned_to: "john.doe@company.com",
        assigned_at: "2024-01-15T10:30:00Z"
      }
    ],
    summary: {
      total_leads: 3,
      successfully_assigned: 3,
      failed_assignments: 0
    }
  }
}
```

## 🛠️ **IMPLEMENTATION STEPS**

### **Day 1: Database Preparation**
1. **Update DynamoDB Schema:**
   - Add new fields to existing lead items
   - Create GSI indexes for performance
   - Update user items with capacity fields

2. **Test Data Migration:**
   - Add default values for existing leads
   - Set initial capacity for existing agents

### **Day 2-3: Core Assignment Logic**
1. **Lead Assignment Service:**
   ```javascript
   class LeadAssignmentService {
     async assignLead(leadId, agentEmail, options = {}) {
       // Validate agent capacity
       // Update lead with assignment
       // Log assignment activity
       // Return updated lead and capacity
     }
     
     async checkAgentCapacity(agentEmail) {
       // Get current assignment count
       // Compare with max capacity
       // Return availability status
     }
   }
   ```

2. **Capacity Management:**
   ```javascript
   class CapacityManager {
     async getAgentCapacity(agentEmail) {
       // Query assigned leads count
       // Get agent max capacity
       // Calculate utilization
     }
     
     async findAvailableAgents(count = 1) {
       // Query agents under capacity
       // Sort by availability and performance
       // Return recommended agents
     }
   }
   ```

### **Day 4-5: Bulk Operations**
1. **Bulk Update Service:**
   ```javascript
   class BulkOperationsService {
     async bulkUpdateLeads(leadIds, updates) {
       // Validate all lead IDs
       // Apply updates in batches
       // Handle errors gracefully
       // Return success/failure report
     }
     
     async bulkAssignLeads(leadIds, strategy, agents = []) {
       // Implement assignment strategies
       // Check capacity constraints
       // Assign leads optimally
     }
   }
   ```

### **Day 6-7: API Integration**
1. **Add new routes to Lambda function**
2. **Implement authentication/authorization**
3. **Add proper error handling**
4. **Test all endpoints**

### **Day 8-10: Testing & Deployment**
1. **Unit tests for assignment logic**
2. **Integration tests with frontend**
3. **Load testing for bulk operations**
4. **Deploy to staging and production**

## 🔧 **LAMBDA FUNCTION UPDATES**

Add these new handlers to your existing `index.js`:

```javascript
// Add to main switch statement
case '/api/leads/{leadId}/assign':
  if (event.httpMethod === 'POST') {
    return await handleAssignLead(event, context);
  }
  break;

case '/api/leads/{leadId}/reassign':
  if (event.httpMethod === 'PUT') {
    return await handleReassignLead(event, context);
  }
  break;

case '/api/agents':
  if (event.httpMethod === 'GET') {
    return await handleGetAgents(event, context);
  }
  break;

case '/api/leads/bulk-update':
  if (event.httpMethod === 'POST') {
    return await handleBulkUpdate(event, context);
  }
  break;

case '/api/leads/bulk-assign':
  if (event.httpMethod === 'POST') {
    return await handleBulkAssign(event, context);
  }
  break;
```

## 📊 **SUCCESS METRICS FOR PHASE 1**

### **Week 1 Targets:**
- ✅ Database schema updated with new fields
- ✅ Basic lead assignment working (single leads)
- ✅ Agent capacity tracking functional
- ✅ Simple bulk updates operational

### **Week 2 Targets:**
- ✅ Bulk assignment with capacity validation
- ✅ Agent management dashboard working
- ✅ All endpoints tested and deployed
- ✅ Frontend integration verified

## 🚀 **IMMEDIATE NEXT STEPS**

1. **Send the email** to frontend team (use `FINAL_RESPONSE_TO_FRONTEND.md`)
2. **Schedule the 30-minute call** with frontend team
3. **Begin database schema updates** (today)
4. **Start implementing assignment endpoints** (tomorrow)

This Phase 1 approach gives you **working functionality in 2 weeks** while properly managing expectations for the full 8-10 week system implementation. 