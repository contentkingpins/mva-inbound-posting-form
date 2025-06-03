/**
 * Lead Management System - PRODUCTION VERSION
 * Integrated with MVA CRM Backend API
 * Enhanced with agent filtering, lead claiming, and real-time data
 */

class LeadManagementSystem {
    constructor() {
        this.apiService = window.apiService || new MVACRMAPIService();
        this.availableLeads = new Map();
        this.myLeads = new Map();
        this.currentAgent = this.getCurrentAgent();
        
        console.log('🎯 Lead Management System initialized with real API');
        console.log('👤 Current agent:', this.currentAgent);
    }

    /**
     * Get current agent info from authentication
     */
    getCurrentAgent() {
        const user = this.apiService.getCurrentUser();
        return {
            id: user?.sub || user?.username || 'agent_' + Date.now(),
            name: user?.name || user?.email || 'Agent',
            email: user?.email || 'agent@example.com'
        };
    }

    /**
     * ENHANCED: Search available leads with real API
     * Supports: state, source, searchTerm filtering
     * Uses: GET /leads with filtering parameters
     */
    async searchLeads(filters = {}) {
        try {
            console.log('🔍 Searching leads with filters:', filters);
            
            // Build API filter parameters
            const apiFilters = {};
            
            // Basic search term - search across multiple fields
            if (filters.searchTerm) {
                // Note: Backend should support text search across name, email, phone
                apiFilters.search = filters.searchTerm;
            }
            
            if (filters.state) {
                apiFilters.state = filters.state;
            }
            
            if (filters.source) {
                apiFilters.source = filters.source;
            }
            
            // Only get unclaimed leads for searching
            apiFilters.status = 'new'; // Only show new/available leads
            
            // Make API call
            const response = await this.apiService.getLeads(null, apiFilters);
            
            // Handle new enhanced response format
            const leads = response.leads || response.data || response || [];
            
            console.log(`📊 Found ${leads.length} available leads`);
            
            // Update available leads cache
            this.availableLeads.clear();
            leads.forEach(lead => {
                // Enhance lead with UI properties
                const enhancedLead = this.enhanceLeadForUI(lead);
                this.availableLeads.set(lead.lead_id || lead.id, enhancedLead);
            });
            
            // Display results
            this.displaySearchResults(Array.from(this.availableLeads.values()));
            
            return Array.from(this.availableLeads.values());
            
        } catch (error) {
            console.error('❌ Search failed:', error);
            this.showError('Failed to search leads. Please try again.');
            throw error;
        }
    }

    /**
     * ENHANCED: Get leads claimed by current agent
     * Uses: GET /leads?agent_id={agentId}&status=claimed
     */
    async getMyLeads() {
        try {
            console.log('📋 Loading my claimed leads...');
            
            const response = await this.apiService.getLeads(null, {
                agent_id: this.currentAgent.id,
                // Don't filter by status to get all agent's leads regardless of status
            });
            
            const leads = response.leads || response.data || response || [];
            
            // Filter to only leads assigned to this agent
            const myLeads = leads.filter(lead => 
                lead.agentId === this.currentAgent.id || 
                lead.agent_id === this.currentAgent.id
            );
            
            console.log(`📊 Found ${myLeads.length} of my leads`);
            
            // Update my leads cache
            this.myLeads.clear();
            myLeads.forEach(lead => {
                const enhancedLead = this.enhanceLeadForUI(lead);
                this.myLeads.set(lead.lead_id || lead.id, enhancedLead);
            });
            
            return Array.from(this.myLeads.values());
            
        } catch (error) {
            console.error('❌ Failed to load my leads:', error);
            this.showError('Failed to load your leads. Please refresh.');
            throw error;
        }
    }

    /**
     * ENHANCED: Claim a lead (NEW WORKFLOW)
     * Uses: PATCH /leads/{leadId} with enhanced claiming fields
     */
    async claimLead(leadId) {
        try {
            console.log('🎯 Claiming lead:', leadId);
            
            const claimData = {
                status: 'claimed',
                agentId: this.currentAgent.id,
                agentName: this.currentAgent.name,
                claimedAt: new Date().toISOString(),
                disposition: 'claimed', // Keep existing field in sync
                notes: `Lead claimed by ${this.currentAgent.name} at ${new Date().toLocaleString()}`
            };
            
            const response = await this.apiService.updateLead(leadId, claimData);
            
            if (response.success || response.status === 'success') {
                console.log('✅ Lead claimed successfully');
                
                // Move lead from available to my leads
                const lead = this.availableLeads.get(leadId);
                if (lead) {
                    const claimedLead = { ...lead, ...claimData };
                    this.myLeads.set(leadId, claimedLead);
                    this.availableLeads.delete(leadId);
                }
                
                // Show success message
                this.showSuccess(`Lead claimed successfully! It's now in your "My Leads" section.`);
                
                // Refresh displays
                this.refreshCurrentView();
                
                return true;
            } else {
                throw new Error(response.message || 'Failed to claim lead');
            }
            
        } catch (error) {
            console.error('❌ Failed to claim lead:', error);
            this.showError('Failed to claim lead. It may have been claimed by another agent.');
            return false;
        }
    }

    /**
     * ENHANCED: Update lead status
     * Uses: PATCH /leads/{leadId} with status and notes
     */
    async updateLeadStatus(leadId, newStatus, notes = '') {
        try {
            console.log('🔄 Updating lead status:', leadId, newStatus);
            
            const updateData = {
                status: newStatus,
                disposition: newStatus, // Keep in sync
                notes: notes || `Status updated to ${newStatus} at ${new Date().toLocaleString()}`
            };
            
            const response = await this.apiService.updateLead(leadId, updateData);
            
            if (response.success || response.status === 'success') {
                console.log('✅ Status updated successfully');
                
                // Update local cache
                const lead = this.myLeads.get(leadId);
                if (lead) {
                    lead.status = newStatus;
                    lead.disposition = newStatus;
                    if (notes) lead.notes = notes;
                }
                
                this.showSuccess(`Lead status updated to "${newStatus}"`);
                return true;
            } else {
                throw new Error(response.message || 'Failed to update status');
            }
            
        } catch (error) {
            console.error('❌ Failed to update status:', error);
            this.showError('Failed to update lead status. Please try again.');
            return false;
        }
    }

    /**
     * Add note to lead
     */
    async addLeadNote(leadId, note) {
        try {
            console.log('📝 Adding note to lead:', leadId);
            
            const updateData = {
                notes: `${note} - Added by ${this.currentAgent.name} at ${new Date().toLocaleString()}`
            };
            
            const response = await this.apiService.updateLead(leadId, updateData);
            
            if (response.success || response.status === 'success') {
                console.log('✅ Note added successfully');
                
                // Update local cache
                const lead = this.myLeads.get(leadId) || this.availableLeads.get(leadId);
                if (lead) {
                    lead.notes = updateData.notes;
                }
                
                this.showSuccess('Note added successfully');
                return true;
            } else {
                throw new Error(response.message || 'Failed to add note');
            }
            
        } catch (error) {
            console.error('❌ Failed to add note:', error);
            this.showError('Failed to add note. Please try again.');
            return false;
        }
    }

    /**
     * View detailed lead information
     */
    async viewLeadDetails(leadId) {
        try {
            console.log('👁️ Viewing lead details:', leadId);
            
            // Try to get fresh data from API
            const response = await this.apiService.getLead(leadId);
            const lead = response.lead || response.data || response;
            
            if (lead) {
                this.showLeadDetailsModal(this.enhanceLeadForUI(lead));
            } else {
                throw new Error('Lead not found');
            }
            
        } catch (error) {
            console.error('❌ Failed to load lead details:', error);
            
            // Fallback to cached data
            const cachedLead = this.myLeads.get(leadId) || this.availableLeads.get(leadId);
            if (cachedLead) {
                this.showLeadDetailsModal(cachedLead);
            } else {
                this.showError('Failed to load lead details.');
            }
        }
    }

    /**
     * ENHANCED: Transform API lead data for UI display
     */
    enhanceLeadForUI(apiLead) {
        // Map API fields to UI fields
        const lead = {
            id: apiLead.lead_id || apiLead.id,
            firstName: apiLead.first_name || apiLead.firstName || 'Unknown',
            lastName: apiLead.last_name || apiLead.lastName || '',
            email: apiLead.email || '',
            phone: apiLead.phone_home || apiLead.lp_caller_id || apiLead.phone || '',
            city: apiLead.city || '',
            state: apiLead.state || '',
            address: apiLead.address || '',
            zipCode: apiLead.zip_code || apiLead.zipCode || '',
            
            // Status and agent info
            status: apiLead.status || 'new',
            disposition: apiLead.disposition || apiLead.status || 'new',
            agentId: apiLead.agentId || apiLead.agent_id,
            agentName: apiLead.agentName || apiLead.agent_name,
            claimedAt: apiLead.claimedAt || apiLead.claimed_at,
            
            // Metadata
            vendorCode: apiLead.vendor_code || apiLead.vendorCode,
            source: this.mapSourceForUI(apiLead.vendor_code),
            createdAt: apiLead.created_at || apiLead.createdAt || apiLead.timestamp,
            notes: apiLead.notes || '',
            
            // UI enhancements (NO REVENUE FOR AGENTS)
            qualityScore: this.calculateQualityScore(apiLead),
            tier: this.calculateTier(apiLead),
            urgency: this.calculateUrgency(apiLead)
        };
        
        return lead;
    }

    /**
     * Map vendor codes to user-friendly sources
     */
    mapSourceForUI(vendorCode) {
        const sourceMap = {
            'VENDOR1': 'Website',
            'VENDOR2': 'Google Ads',
            'VENDOR3': 'Facebook',
            'VENDOR4': 'Referral',
            'LEGAL_LEADS': 'Legal Network',
            'MEDIA_BUY': 'Media Campaigns'
        };
        
        return sourceMap[vendorCode] || vendorCode || 'Unknown';
    }

    /**
     * Calculate lead quality score for UI
     */
    calculateQualityScore(lead) {
        let score = 50; // Base score
        
        // Complete contact info
        if (lead.email) score += 15;
        if (lead.phone_home || lead.lp_caller_id) score += 15;
        if (lead.address) score += 10;
        
        // Demographics
        if (lead.date_of_birth) score += 10;
        
        // Recent lead
        const leadAge = Date.now() - new Date(lead.created_at || lead.timestamp).getTime();
        const hoursOld = leadAge / (1000 * 60 * 60);
        if (hoursOld < 24) score += 10;
        else if (hoursOld < 72) score += 5;
        
        return Math.min(score, 100);
    }

    /**
     * Calculate tier (premium/standard/basic) based on quality
     */
    calculateTier(lead) {
        const score = this.calculateQualityScore(lead);
        if (score >= 80) return 'premium';
        if (score >= 60) return 'standard';
        return 'basic';
    }

    /**
     * Estimate lead value for UI motivation (ADMIN ONLY)
     * Note: Revenue information restricted to admin interface
     */
    estimateValue(lead) {
        // Return null for agent interface - no revenue display
        return null;
    }

    /**
     * Calculate urgency indicator
     */
    calculateUrgency(lead) {
        const leadAge = Date.now() - new Date(lead.created_at || lead.timestamp).getTime();
        const hoursOld = leadAge / (1000 * 60 * 60);
        
        if (hoursOld < 1) return 'hot';
        if (hoursOld < 24) return 'warm';
        return 'normal';
    }

    /**
     * UI HELPER METHODS
     */
    
    displaySearchResults(leads) {
        const container = document.getElementById('search-results');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (leads.length === 0) {
            container.innerHTML = '<div class="no-results">No leads found matching your criteria.</div>';
            return;
        }
        
        leads.forEach(lead => {
            const leadCard = this.createLeadCard(lead);
            container.appendChild(leadCard);
        });
    }

    createLeadCard(lead) {
        const card = document.createElement('div');
        card.className = `lead-card ${lead.tier}`;
        card.dataset.leadId = lead.id;
        
        card.innerHTML = `
            <div class="lead-header">
                <h4>${lead.firstName} ${lead.lastName}</h4>
                <div class="lead-badges">
                    <span class="quality-badge ${lead.tier}">${lead.qualityScore}/100</span>
                    <span class="urgency-badge ${lead.urgency}">${lead.urgency}</span>
                </div>
            </div>
            <div class="lead-details">
                <div class="detail-row">
                    <span>📍 ${lead.city}, ${lead.state}</span>
                    <span>📧 ${lead.email}</span>
                </div>
                <div class="detail-row">
                    <span>📞 ${lead.phone}</span>
                </div>
                <div class="detail-row">
                    <span>📌 ${lead.source}</span>
                    <span>📅 ${new Date(lead.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="lead-actions">
                <button class="btn btn-primary" onclick="leadManagement.claimLead('${lead.id}')">
                    🎯 Claim This Lead
                </button>
                <button class="btn btn-secondary" onclick="leadManagement.viewLeadDetails('${lead.id}')">
                    👁️ View Details
                </button>
            </div>
        `;
        
        return card;
    }

    updateLeadDisplay(leadId, status) {
        const card = document.querySelector(`[data-lead-id="${leadId}"]`);
        if (card) {
            if (status === 'claimed') {
                card.classList.add('claimed');
                const claimBtn = card.querySelector('.btn-primary');
                if (claimBtn) {
                    claimBtn.textContent = '✅ Claimed';
                    claimBtn.disabled = true;
                }
            }
        }
    }

    showSuccess(message) {
        console.log('✅', message);
        // Could integrate with notification system
    }

    showError(message) {
        console.error('❌', message);
        // Could integrate with notification system
    }

    viewLeadDetails(leadId) {
        console.log('👁️ Viewing lead details:', leadId);
        // Would open lead details modal
    }

    showLeadDetailsModal(lead) {
        const modal = document.getElementById('lead-details-modal');
        const modalTitle = document.getElementById('lead-modal-title');
        const modalBody = document.getElementById('lead-modal-body');
        const modalFooter = document.getElementById('lead-modal-footer');
        
        if (!modal) {
            console.warn('Lead details modal not found');
            return;
        }
        
        // Set modal title
        modalTitle.textContent = `${lead.firstName} ${lead.lastName} - Lead Details`;
        
        // Set modal body content
        modalBody.innerHTML = `
            <div class="lead-detail-grid">
                <div class="detail-section">
                    <h4>Contact Information</h4>
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${lead.firstName} ${lead.lastName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${lead.email || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${lead.phone || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Address:</span>
                        <span class="detail-value">${lead.address || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">City:</span>
                        <span class="detail-value">${lead.city}, ${lead.state} ${lead.zipCode}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Lead Information</h4>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value status-${lead.status}">${lead.status}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Source:</span>
                        <span class="detail-value">${lead.source}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Quality Score:</span>
                        <span class="detail-value">
                            <span class="quality-badge ${lead.tier}">${lead.qualityScore}/100</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${new Date(lead.createdAt).toLocaleDateString()}</span>
                    </div>
                    ${lead.agentName ? `
                        <div class="detail-item">
                            <span class="detail-label">Agent:</span>
                            <span class="detail-value">${lead.agentName}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Claimed:</span>
                            <span class="detail-value">${new Date(lead.claimedAt).toLocaleDateString()}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${lead.notes ? `
                    <div class="detail-section full-width">
                        <h4>Notes</h4>
                        <div class="notes-content">
                            ${lead.notes}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Set modal footer with action buttons
        modalFooter.innerHTML = `
            <div class="modal-actions">
                ${lead.status === 'new' || !lead.agentId ? `
                    <button class="btn btn-primary" onclick="leadManagement.claimLead('${lead.id}'); closeLeadModal();">
                        🎯 Claim Lead
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="leadManagement.addLeadNote('${lead.id}')">
                    📝 Add Note
                </button>
                <button class="btn btn-info" onclick="window.open('tel:${lead.phone}')">
                    📞 Call
                </button>
                <button class="btn btn-info" onclick="window.open('mailto:${lead.email}')">
                    ✉️ Email
                </button>
                <button class="btn btn-secondary" onclick="closeLeadModal()">
                    Close
                </button>
            </div>
        `;
        
        // Show modal
        modal.classList.add('active');
    }

    refreshCurrentView() {
        // Determine which view is currently active and refresh it
        const activeSection = document.querySelector('.content-section:not([style*="display: none"])');
        
        if (!activeSection) return;
        
        const sectionId = activeSection.id;
        
        switch (sectionId) {
            case 'search-section':
                // Refresh search results
                console.log('🔄 Refreshing search results...');
                const searchForm = document.getElementById('lead-search-form');
                if (searchForm) {
                    const formData = new FormData(searchForm);
                    const filters = Object.fromEntries(formData.entries());
                    this.searchLeads(filters);
                }
                break;
                
            case 'my-leads-section':
                // Refresh my leads
                console.log('🔄 Refreshing my leads...');
                this.getMyLeads().then(leads => {
                    const container = document.getElementById('my-leads-list');
                    if (container && window.displayMyLeads) {
                        window.displayMyLeads(leads);
                    }
                });
                break;
                
            default:
                console.log('🔄 No specific refresh needed for current view');
        }
        
        // Update counts in the header
        this.updateHeaderCounts();
    }

    async updateHeaderCounts() {
        try {
            // Update available leads count
            const availableCount = this.availableLeads.size;
            const availableCountEl = document.getElementById('available-count');
            if (availableCountEl) {
                availableCountEl.textContent = availableCount + ' available';
            }
            
            // Update my leads count
            const myLeadsCount = this.myLeads.size;
            const myLeadsCountEl = document.getElementById('my-leads-count');
            const claimedCountEl = document.getElementById('claimed-count');
            
            if (myLeadsCountEl) {
                myLeadsCountEl.textContent = myLeadsCount;
            }
            if (claimedCountEl) {
                claimedCountEl.textContent = myLeadsCount + ' claimed';
            }
            
            // Calculate today's claims
            const today = new Date().toDateString();
            const todaysClaims = Array.from(this.myLeads.values()).filter(lead => 
                lead.claimedAt && new Date(lead.claimedAt).toDateString() === today
            ).length;
            
            const todaysClaimsEl = document.getElementById('todays-claims');
            if (todaysClaimsEl) {
                todaysClaimsEl.textContent = todaysClaims;
            }
            
        } catch (error) {
            console.error('❌ Failed to update header counts:', error);
        }
    }
}

// Initialize API service if not already available
if (!window.apiService) {
    window.apiService = new MVACRMAPIService();
    console.log('🔧 API Service initialized for Lead Management');
}

// Global instance
window.leadManagement = new LeadManagementSystem();

console.log('🎯 Lead Management System loaded and ready!'); 