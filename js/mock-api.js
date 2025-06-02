/**
 * Mock API Service for Frontend Development
 * Simulates backend endpoints while they're being developed
 */

class MockAPI {
    constructor() {
        this.mockDelay = 300; // Simulate network delay
        this.leads = this.generateMockLeads(50);
        this.agents = this.generateMockAgents(10);
        this.setupInterceptors();
    }

    // Intercept fetch calls to mock endpoints
    setupInterceptors() {
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            const mockResponse = await this.handleMockRequest(url, options);
            if (mockResponse) {
                return mockResponse;
            }
            return originalFetch(url, options);
        };
    }

    async handleMockRequest(url, options) {
        const method = options.method || 'GET';
        const body = options.body ? JSON.parse(options.body) : null;

        // Lead Assignment Endpoints
        if (url.includes('/api/leads/') && url.includes('/assign') && method === 'POST') {
            return this.mockAssignLead(url, body);
        }
        if (url.includes('/api/leads/bulk-assign') && method === 'POST') {
            return this.mockBulkAssign(body);
        }

        // Bulk Operations
        if (url.includes('/api/leads/bulk-update') && method === 'POST') {
            return this.mockBulkUpdate(body);
        }
        if (url.includes('/api/leads/bulk-export') && method === 'POST') {
            return this.mockBulkExport(body);
        }

        // Advanced Search
        if (url.includes('/api/leads/advanced-search') && method === 'POST') {
            return this.mockAdvancedSearch(body);
        }

        // File Upload
        if (url.includes('/documents') && method === 'POST') {
            return this.mockFileUpload(url, options);
        }

        // Notification endpoints
        if (url === '/api/notifications/latest') {
            if (method === 'GET') {
                return this.mockNotificationsLatest();
            }
        }
        if (url === '/api/notifications/mark-read') {
            if (method === 'POST') {
                return this.mockMarkNotificationsRead(body);
            }
        }

        return null; // Let original fetch handle it
    }

    // Mock Implementations
    async mockAssignLead(url, body) {
        await this.delay();
        const leadId = url.match(/leads\/([^\/]+)\/assign/)[1];
        
        return this.createResponse({
            success: true,
            leadId: leadId,
            assignedTo: body.agentId,
            assignedAt: new Date().toISOString(),
            message: 'Lead assigned successfully'
        });
    }

    async mockBulkAssign(body) {
        await this.delay();
        
        return this.createResponse({
            success: true,
            assigned: body.leadIds.length,
            results: body.leadIds.map(id => ({
                leadId: id,
                status: 'assigned',
                assignedTo: body.agentId
            }))
        });
    }

    async mockBulkUpdate(body) {
        await this.delay();
        
        return this.createResponse({
            success: true,
            updated: body.leadIds.length,
            results: body.leadIds.map(id => ({
                leadId: id,
                status: 'updated',
                updates: body.updates
            }))
        });
    }

    async mockBulkExport(body) {
        await this.delay();
        
        // Simulate file generation
        const exportId = `export_${Date.now()}`;
        
        return this.createResponse({
            success: true,
            exportId: exportId,
            status: 'processing',
            estimatedTime: 5000,
            downloadUrl: `/api/exports/${exportId}/download`
        });
    }

    async mockAdvancedSearch(body) {
        await this.delay();
        
        // Filter mock leads based on criteria
        let filteredLeads = [...this.leads];
        
        if (body.filters.status) {
            filteredLeads = filteredLeads.filter(lead => 
                body.filters.status.includes(lead.status)
            );
        }
        
        if (body.filters.dateRange) {
            const start = new Date(body.filters.dateRange.start);
            const end = new Date(body.filters.dateRange.end);
            filteredLeads = filteredLeads.filter(lead => {
                const leadDate = new Date(lead.createdAt);
                return leadDate >= start && leadDate <= end;
            });
        }
        
        // Pagination
        const page = body.pagination?.page || 1;
        const limit = body.pagination?.limit || 20;
        const startIndex = (page - 1) * limit;
        const paginatedLeads = filteredLeads.slice(startIndex, startIndex + limit);
        
        return this.createResponse({
            success: true,
            data: paginatedLeads,
            pagination: {
                page: page,
                limit: limit,
                total: filteredLeads.length,
                pages: Math.ceil(filteredLeads.length / limit)
            }
        });
    }

    async mockFileUpload(url, options) {
        await this.delay(1000); // Longer delay for file upload
        
        const leadId = url.match(/leads\/([^\/]+)\/documents/)?.[1];
        
        return this.createResponse({
            success: true,
            documentId: `doc_${Date.now()}`,
            leadId: leadId,
            filename: 'document.pdf',
            size: 1024576,
            uploadedAt: new Date().toISOString(),
            url: `https://example.com/documents/doc_${Date.now()}.pdf`
        });
    }

    async mockNotificationsLatest() {
        return {
            notifications: [
                {
                    id: 'notif_1',
                    type: 'lead_assigned',
                    title: 'New Lead Assigned',
                    message: 'A high-priority lead has been assigned to you',
                    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                    read: false,
                    priority: 'high',
                    data: { leadId: 'lead_123' }
                },
                {
                    id: 'notif_2',
                    type: 'system_update',
                    title: 'System Update',
                    message: 'New features have been added to the dashboard',
                    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                    read: true,
                    priority: 'low'
                }
            ],
            unreadCount: 1,
            timestamp: new Date().toISOString()
        };
    }

    async mockMarkNotificationsRead(body) {
        console.log('Marking notifications as read:', body);
        return { success: true, updated: body.notificationIds?.length || 0 };
    }

    // Helper Methods
    generateMockLeads(count) {
        const leads = [];
        const statuses = ['new', 'contacted', 'qualified', 'retained', 'closed'];
        const sources = ['web', 'phone', 'api', 'referral'];
        
        for (let i = 0; i < count; i++) {
            leads.push({
                id: `lead_${1000 + i}`,
                firstName: `First${i}`,
                lastName: `Last${i}`,
                email: `lead${i}@example.com`,
                phone: `555-${String(i).padStart(4, '0')}`,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                source: sources[Math.floor(Math.random() * sources.length)],
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                assignedTo: Math.random() > 0.3 ? `agent_${Math.floor(Math.random() * 10)}` : null
            });
        }
        
        return leads;
    }

    generateMockAgents(count) {
        const agents = [];
        
        for (let i = 0; i < count; i++) {
            agents.push({
                id: `agent_${i}`,
                name: `Agent ${i}`,
                email: `agent${i}@example.com`,
                role: i === 0 ? 'admin' : 'agent',
                status: Math.random() > 0.2 ? 'active' : 'inactive',
                capacity: Math.floor(Math.random() * 50),
                maxCapacity: 100
            });
        }
        
        return agents;
    }

    createResponse(data, status = 200) {
        return new Response(JSON.stringify(data), {
            status: status,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    delay(ms = this.mockDelay) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // WebSocket Mock
    createMockWebSocket() {
        return {
            send: (data) => console.log('Mock WebSocket send:', data),
            close: () => console.log('Mock WebSocket closed'),
            addEventListener: (event, handler) => {
                if (event === 'message') {
                    // Simulate random events
                    setInterval(() => {
                        const events = ['lead.created', 'lead.updated', 'lead.assigned'];
                        const mockEvent = {
                            data: JSON.stringify({
                                type: events[Math.floor(Math.random() * events.length)],
                                payload: {
                                    leadId: `lead_${Math.floor(Math.random() * 1000)}`,
                                    timestamp: new Date().toISOString()
                                }
                            })
                        };
                        handler(mockEvent);
                    }, 5000);
                }
            }
        };
    }
}

// Initialize mock API in development mode
if (window.APP_CONFIG?.environment === 'development' || window.location.hostname === 'localhost') {
    window.mockAPI = new MockAPI();
    console.log('🎭 Mock API initialized for development');
}

export default MockAPI; 