/**
 * Enhanced Lead Details Modal
 * Comprehensive lead view/edit with timeline, documents, and notes
 */

class LeadDetailsModal {
    constructor() {
        this.currentLead = null;
        this.isEditMode = false;
        this.activities = [];
        this.documents = [];
        this.notes = [];
        
        this.init();
    }
    
    init() {
        this.createModal();
        this.attachEventListeners();
        console.log('📋 Lead Details Modal initialized');
    }
    
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay lead-details-modal';
        modal.id = 'lead-details-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <div class="modal-header-main">
                        <h2 class="modal-title">
                            <span id="lead-name">Lead Details</span>
                            <span class="lead-status-badge" id="lead-status-badge"></span>
                        </h2>
                        <div class="modal-actions">
                            <button class="btn btn-sm btn-secondary" id="edit-lead-btn">
                                <span class="edit-icon">✏️</span> Edit
                            </button>
                            <button class="btn btn-sm btn-primary" id="save-lead-btn" style="display: none;">
                                <span class="save-icon">💾</span> Save Changes
                            </button>
                            <button class="btn btn-sm btn-secondary" id="cancel-edit-btn" style="display: none;">
                                Cancel
                            </button>
                        </div>
                    </div>
                    <button class="modal-close" onclick="leadDetailsModal.close()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="lead-details-container">
                        <!-- Left Column: Lead Info & Timeline -->
                        <div class="lead-details-left">
                            <!-- Lead Information Section -->
                            <div class="details-section">
                                <h3 class="section-title">Contact Information</h3>
                                <div class="lead-info-grid" id="lead-info-content">
                                    <!-- Lead info will be populated here -->
                                </div>
                            </div>
                            
                            <!-- Activity Timeline -->
                            <div class="details-section">
                                <h3 class="section-title">Activity Timeline</h3>
                                <div class="timeline-container" id="activity-timeline">
                                    <div class="timeline-loading">Loading activities...</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Right Column: Documents & Notes -->
                        <div class="lead-details-right">
                            <!-- Document Attachments -->
                            <div class="details-section">
                                <div class="section-header">
                                    <h3 class="section-title">Documents</h3>
                                    <button class="btn btn-sm btn-primary" id="upload-document-btn">
                                        <span>📎</span> Upload
                                    </button>
                                </div>
                                <div class="documents-container" id="documents-list">
                                    <div class="empty-state">
                                        <span class="empty-icon">📁</span>
                                        <p>No documents uploaded yet</p>
                                    </div>
                                </div>
                                <!-- Hidden file input -->
                                <input type="file" id="document-upload-input" multiple style="display: none;" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                            </div>
                            
                            <!-- Internal Notes -->
                            <div class="details-section">
                                <div class="section-header">
                                    <h3 class="section-title">Internal Notes</h3>
                                    <button class="btn btn-sm btn-secondary" id="add-note-btn">
                                        <span>➕</span> Add Note
                                    </button>
                                </div>
                                <div class="notes-container" id="notes-list">
                                    <!-- Notes will be populated here -->
                                </div>
                                
                                <!-- Add Note Form (Hidden by default) -->
                                <div class="add-note-form" id="add-note-form" style="display: none;">
                                    <textarea id="new-note-text" placeholder="Type your note here..." rows="3"></textarea>
                                    <div class="note-form-actions">
                                        <button class="btn btn-sm btn-secondary" id="cancel-note-btn">Cancel</button>
                                        <button class="btn btn-sm btn-primary" id="save-note-btn">Save Note</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <div class="footer-left">
                        <span class="last-updated">Last updated: <span id="last-updated-time">-</span></span>
                    </div>
                    <div class="footer-actions">
                        <button class="btn btn-secondary" onclick="leadDetailsModal.close()">Close</button>
                        <button class="btn btn-primary" id="assign-lead-btn">Assign Lead</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.modal = modal;
        
        // Add styles
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .lead-details-modal .modal-content {
                width: 90%;
                max-width: 1200px;
                height: 90vh;
                display: flex;
                flex-direction: column;
            }
            
            .modal-header-main {
                flex: 1;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .modal-title {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .lead-status-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .modal-actions {
                display: flex;
                gap: 10px;
            }
            
            .lead-details-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                height: 100%;
                overflow: hidden;
            }
            
            .lead-details-left,
            .lead-details-right {
                overflow-y: auto;
                padding-right: 10px;
            }
            
            .details-section {
                background: var(--bg-primary, #0f172a);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
            }
            
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .section-title {
                margin: 0 0 15px 0;
                font-size: 18px;
                color: var(--text-primary, #f1f5f9);
            }
            
            .lead-info-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }
            
            .info-field {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .info-label {
                font-size: 12px;
                color: var(--text-secondary, #94a3b8);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .info-value {
                font-size: 14px;
                color: var(--text-primary, #f1f5f9);
            }
            
            .info-value input,
            .info-value select {
                width: 100%;
                padding: 8px;
                background: var(--bg-secondary, #1e293b);
                border: 1px solid var(--border-color, #334155);
                border-radius: 6px;
                color: var(--text-primary, #f1f5f9);
            }
            
            /* Timeline Styles */
            .timeline-container {
                position: relative;
                padding-left: 30px;
            }
            
            .timeline-container::before {
                content: '';
                position: absolute;
                left: 10px;
                top: 0;
                bottom: 0;
                width: 2px;
                background: var(--border-color, #334155);
            }
            
            .timeline-item {
                position: relative;
                padding-bottom: 20px;
            }
            
            .timeline-item::before {
                content: '';
                position: absolute;
                left: -24px;
                top: 6px;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: var(--primary, #4299e1);
                border: 2px solid var(--bg-primary, #0f172a);
            }
            
            .timeline-time {
                font-size: 12px;
                color: var(--text-secondary, #94a3b8);
                margin-bottom: 5px;
            }
            
            .timeline-content {
                background: var(--bg-secondary, #1e293b);
                padding: 12px;
                border-radius: 8px;
                font-size: 14px;
            }
            
            .timeline-user {
                font-weight: 600;
                color: var(--primary, #4299e1);
            }
            
            /* Documents Styles */
            .documents-container {
                display: grid;
                gap: 10px;
            }
            
            .document-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px;
                background: var(--bg-secondary, #1e293b);
                border-radius: 8px;
                transition: all 0.2s ease;
            }
            
            .document-item:hover {
                background: var(--border-color, #334155);
            }
            
            .document-info {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .document-icon {
                font-size: 24px;
            }
            
            .document-details {
                display: flex;
                flex-direction: column;
            }
            
            .document-name {
                font-size: 14px;
                font-weight: 500;
                color: var(--text-primary, #f1f5f9);
            }
            
            .document-meta {
                font-size: 12px;
                color: var(--text-secondary, #94a3b8);
            }
            
            .document-actions {
                display: flex;
                gap: 10px;
            }
            
            /* Notes Styles */
            .notes-container {
                display: grid;
                gap: 10px;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .note-item {
                background: var(--bg-secondary, #1e293b);
                padding: 12px;
                border-radius: 8px;
                border-left: 3px solid var(--primary, #4299e1);
            }
            
            .note-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            
            .note-author {
                font-size: 12px;
                font-weight: 600;
                color: var(--primary, #4299e1);
            }
            
            .note-time {
                font-size: 12px;
                color: var(--text-secondary, #94a3b8);
            }
            
            .note-content {
                font-size: 14px;
                color: var(--text-primary, #f1f5f9);
                line-height: 1.5;
            }
            
            .add-note-form {
                margin-top: 15px;
            }
            
            .add-note-form textarea {
                width: 100%;
                padding: 10px;
                background: var(--bg-secondary, #1e293b);
                border: 1px solid var(--border-color, #334155);
                border-radius: 6px;
                color: var(--text-primary, #f1f5f9);
                resize: vertical;
            }
            
            .note-form-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 10px;
            }
            
            .empty-state {
                text-align: center;
                padding: 40px;
                color: var(--text-secondary, #94a3b8);
            }
            
            .empty-icon {
                font-size: 48px;
                opacity: 0.5;
                display: block;
                margin-bottom: 10px;
            }
            
            @media (max-width: 768px) {
                .lead-details-container {
                    grid-template-columns: 1fr;
                }
                
                .lead-info-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    attachEventListeners() {
        // Edit mode toggle
        document.getElementById('edit-lead-btn').addEventListener('click', () => this.toggleEditMode(true));
        document.getElementById('save-lead-btn').addEventListener('click', () => this.saveLeadChanges());
        document.getElementById('cancel-edit-btn').addEventListener('click', () => this.toggleEditMode(false));
        
        // Document upload
        document.getElementById('upload-document-btn').addEventListener('click', () => {
            document.getElementById('document-upload-input').click();
        });
        
        document.getElementById('document-upload-input').addEventListener('change', (e) => {
            this.handleDocumentUpload(e.target.files);
        });
        
        // Notes
        document.getElementById('add-note-btn').addEventListener('click', () => {
            document.getElementById('add-note-form').style.display = 'block';
            document.getElementById('new-note-text').focus();
        });
        
        document.getElementById('cancel-note-btn').addEventListener('click', () => {
            document.getElementById('add-note-form').style.display = 'none';
            document.getElementById('new-note-text').value = '';
        });
        
        document.getElementById('save-note-btn').addEventListener('click', () => {
            this.saveNote();
        });
        
        // Assign lead
        document.getElementById('assign-lead-btn').addEventListener('click', () => {
            if (window.leadAssignment && this.currentLead) {
                window.leadAssignment.selectedLeads.clear();
                window.leadAssignment.selectedLeads.add(this.currentLead.id);
                window.leadAssignment.openAssignmentModal();
                this.close();
            }
        });
    }
    
    async open(leadId) {
        this.modal.style.display = 'block';
        
        // Load lead data
        await this.loadLeadData(leadId);
        
        // Load related data
        await Promise.all([
            this.loadActivityTimeline(leadId),
            this.loadDocuments(leadId),
            this.loadNotes(leadId)
        ]);
    }
    
    async loadLeadData(leadId) {
        try {
            // In real implementation, fetch from API
            // For now, use mock data
            this.currentLead = {
                id: leadId,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '(555) 123-4567',
                status: 'qualified',
                source: 'web',
                assignedTo: 'agent_123',
                createdAt: '2024-05-15T10:30:00Z',
                lastUpdated: '2024-05-30T14:00:00Z',
                score: 85,
                value: 5000,
                location: 'Los Angeles, CA',
                company: 'ABC Corp'
            };
            
            this.displayLeadInfo();
        } catch (error) {
            console.error('Failed to load lead data:', error);
        }
    }
    
    displayLeadInfo() {
        const lead = this.currentLead;
        
        // Update header
        document.getElementById('lead-name').textContent = `${lead.firstName} ${lead.lastName}`;
        
        const statusBadge = document.getElementById('lead-status-badge');
        statusBadge.textContent = lead.status;
        statusBadge.className = `lead-status-badge status-${lead.status}`;
        
        // Update last updated time
        document.getElementById('last-updated-time').textContent = new Date(lead.lastUpdated).toLocaleString();
        
        // Build info grid
        const infoContent = document.getElementById('lead-info-content');
        infoContent.innerHTML = `
            <div class="info-field">
                <span class="info-label">Email</span>
                <span class="info-value" data-field="email">${lead.email}</span>
            </div>
            <div class="info-field">
                <span class="info-label">Phone</span>
                <span class="info-value" data-field="phone">${lead.phone}</span>
            </div>
            <div class="info-field">
                <span class="info-label">Company</span>
                <span class="info-value" data-field="company">${lead.company || '-'}</span>
            </div>
            <div class="info-field">
                <span class="info-label">Location</span>
                <span class="info-value" data-field="location">${lead.location || '-'}</span>
            </div>
            <div class="info-field">
                <span class="info-label">Lead Score</span>
                <span class="info-value">
                    <span class="score-badge">${lead.score}/100</span>
                </span>
            </div>
            <div class="info-field">
                <span class="info-label">Lead Value</span>
                <span class="info-value" data-field="value">$${lead.value?.toLocaleString() || '0'}</span>
            </div>
            <div class="info-field">
                <span class="info-label">Source</span>
                <span class="info-value" data-field="source">${lead.source}</span>
            </div>
            <div class="info-field">
                <span class="info-label">Status</span>
                <span class="info-value" data-field="status">${lead.status}</span>
            </div>
        `;
    }
    
    async loadActivityTimeline(leadId) {
        // Mock activity data
        this.activities = [
            {
                id: 1,
                type: 'status_change',
                user: 'Sarah Johnson',
                timestamp: '2024-05-30T14:00:00Z',
                description: 'Changed status to Qualified'
            },
            {
                id: 2,
                type: 'note_added',
                user: 'Mike Smith',
                timestamp: '2024-05-29T10:30:00Z',
                description: 'Added a note about client requirements'
            },
            {
                id: 3,
                type: 'email_sent',
                user: 'System',
                timestamp: '2024-05-28T15:45:00Z',
                description: 'Automated follow-up email sent'
            },
            {
                id: 4,
                type: 'created',
                user: 'System',
                timestamp: '2024-05-15T10:30:00Z',
                description: 'Lead created from web form'
            }
        ];
        
        this.displayActivityTimeline();
    }
    
    displayActivityTimeline() {
        const timeline = document.getElementById('activity-timeline');
        
        if (this.activities.length === 0) {
            timeline.innerHTML = '<div class="empty-state">No activities yet</div>';
            return;
        }
        
        timeline.innerHTML = this.activities.map(activity => `
            <div class="timeline-item">
                <div class="timeline-time">${this.formatRelativeTime(activity.timestamp)}</div>
                <div class="timeline-content">
                    <span class="timeline-user">${activity.user}</span>
                    ${activity.description}
                </div>
            </div>
        `).join('');
    }
    
    async loadDocuments(leadId) {
        // Mock document data
        this.documents = [
            {
                id: 1,
                name: 'Contract_Draft.pdf',
                size: 245000,
                type: 'pdf',
                uploadedBy: 'John Agent',
                uploadedAt: '2024-05-28T09:00:00Z'
            },
            {
                id: 2,
                name: 'ID_Verification.jpg',
                size: 1200000,
                type: 'image',
                uploadedBy: 'Sarah Admin',
                uploadedAt: '2024-05-25T14:30:00Z'
            }
        ];
        
        this.displayDocuments();
    }
    
    displayDocuments() {
        const container = document.getElementById('documents-list');
        
        if (this.documents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📁</span>
                    <p>No documents uploaded yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.documents.map(doc => {
            const icon = this.getDocumentIcon(doc.type);
            const size = this.formatFileSize(doc.size);
            
            return `
                <div class="document-item">
                    <div class="document-info">
                        <span class="document-icon">${icon}</span>
                        <div class="document-details">
                            <span class="document-name">${doc.name}</span>
                            <span class="document-meta">${size} • Uploaded by ${doc.uploadedBy}</span>
                        </div>
                    </div>
                    <div class="document-actions">
                        <button class="btn btn-sm btn-secondary" onclick="leadDetailsModal.downloadDocument(${doc.id})">
                            ⬇️ Download
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="leadDetailsModal.deleteDocument(${doc.id})">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async loadNotes(leadId) {
        // Mock notes data
        this.notes = [
            {
                id: 1,
                author: 'Sarah Johnson',
                timestamp: '2024-05-29T16:00:00Z',
                content: 'Client is very interested in our premium package. Follow up next week with pricing details.'
            },
            {
                id: 2,
                author: 'Mike Smith',
                timestamp: '2024-05-27T11:30:00Z',
                content: 'Verified contact information. Phone number is correct, prefer email communication.'
            }
        ];
        
        this.displayNotes();
    }
    
    displayNotes() {
        const container = document.getElementById('notes-list');
        
        if (this.notes.length === 0) {
            container.innerHTML = '<div class="empty-state">No notes yet</div>';
            return;
        }
        
        container.innerHTML = this.notes.map(note => `
            <div class="note-item">
                <div class="note-header">
                    <span class="note-author">${note.author}</span>
                    <span class="note-time">${this.formatRelativeTime(note.timestamp)}</span>
                </div>
                <div class="note-content">${note.content}</div>
            </div>
        `).join('');
    }
    
    toggleEditMode(enabled) {
        this.isEditMode = enabled;
        
        // Toggle buttons
        document.getElementById('edit-lead-btn').style.display = enabled ? 'none' : 'block';
        document.getElementById('save-lead-btn').style.display = enabled ? 'block' : 'none';
        document.getElementById('cancel-edit-btn').style.display = enabled ? 'block' : 'none';
        
        // Make fields editable
        const editableFields = ['email', 'phone', 'company', 'location', 'value', 'source', 'status'];
        
        editableFields.forEach(field => {
            const element = document.querySelector(`[data-field="${field}"]`);
            if (!element) return;
            
            if (enabled) {
                const value = element.textContent;
                
                if (field === 'status') {
                    element.innerHTML = `
                        <select data-original="${value}">
                            <option value="new" ${value === 'new' ? 'selected' : ''}>New</option>
                            <option value="contacted" ${value === 'contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="qualified" ${value === 'qualified' ? 'selected' : ''}>Qualified</option>
                            <option value="retained" ${value === 'retained' ? 'selected' : ''}>Retained</option>
                            <option value="closed" ${value === 'closed' ? 'selected' : ''}>Closed</option>
                        </select>
                    `;
                } else {
                    const inputType = field === 'email' ? 'email' : field === 'value' ? 'number' : 'text';
                    element.innerHTML = `<input type="${inputType}" value="${value}" data-original="${value}">`;
                }
            } else {
                // Restore original values
                const input = element.querySelector('input, select');
                if (input) {
                    element.textContent = input.dataset.original;
                }
            }
        });
    }
    
    async saveLeadChanges() {
        const updates = {};
        const editableFields = ['email', 'phone', 'company', 'location', 'value', 'source', 'status'];
        
        editableFields.forEach(field => {
            const element = document.querySelector(`[data-field="${field}"]`);
            const input = element?.querySelector('input, select');
            
            if (input && input.value !== input.dataset.original) {
                updates[field] = field === 'value' ? parseFloat(input.value) : input.value;
            }
        });
        
        if (Object.keys(updates).length === 0) {
            this.toggleEditMode(false);
            return;
        }
        
        try {
            // Save changes via API
            console.log('Saving lead updates:', updates);
            
            // Update local data
            Object.assign(this.currentLead, updates);
            
            // Refresh display
            this.displayLeadInfo();
            this.toggleEditMode(false);
            
            // Add activity
            this.activities.unshift({
                id: Date.now(),
                type: 'updated',
                user: 'Current User',
                timestamp: new Date().toISOString(),
                description: `Updated ${Object.keys(updates).join(', ')}`
            });
            this.displayActivityTimeline();
            
            this.showToast('Lead updated successfully', 'success');
        } catch (error) {
            console.error('Failed to save changes:', error);
            this.showToast('Failed to save changes', 'error');
        }
    }
    
    async handleDocumentUpload(files) {
        for (const file of files) {
            try {
                // In real implementation, upload to S3
                console.log('Uploading file:', file.name);
                
                // Add to documents list
                this.documents.unshift({
                    id: Date.now(),
                    name: file.name,
                    size: file.size,
                    type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'document',
                    uploadedBy: 'Current User',
                    uploadedAt: new Date().toISOString()
                });
                
                this.displayDocuments();
                
                // Add activity
                this.activities.unshift({
                    id: Date.now(),
                    type: 'document_uploaded',
                    user: 'Current User',
                    timestamp: new Date().toISOString(),
                    description: `Uploaded ${file.name}`
                });
                this.displayActivityTimeline();
                
            } catch (error) {
                console.error('Failed to upload file:', error);
                this.showToast(`Failed to upload ${file.name}`, 'error');
            }
        }
        
        // Reset input
        document.getElementById('document-upload-input').value = '';
    }
    
    async downloadDocument(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (!doc) return;
        
        // In real implementation, get presigned URL from API
        console.log('Downloading document:', doc.name);
        this.showToast(`Downloading ${doc.name}...`, 'info');
    }
    
    async deleteDocument(docId) {
        if (!confirm('Are you sure you want to delete this document?')) return;
        
        try {
            // In real implementation, delete via API
            this.documents = this.documents.filter(d => d.id !== docId);
            this.displayDocuments();
            
            this.showToast('Document deleted', 'success');
        } catch (error) {
            console.error('Failed to delete document:', error);
            this.showToast('Failed to delete document', 'error');
        }
    }
    
    async saveNote() {
        const noteText = document.getElementById('new-note-text').value.trim();
        if (!noteText) return;
        
        try {
            // In real implementation, save via API
            const newNote = {
                id: Date.now(),
                author: 'Current User',
                timestamp: new Date().toISOString(),
                content: noteText
            };
            
            this.notes.unshift(newNote);
            this.displayNotes();
            
            // Add activity
            this.activities.unshift({
                id: Date.now(),
                type: 'note_added',
                user: 'Current User',
                timestamp: new Date().toISOString(),
                description: 'Added a note'
            });
            this.displayActivityTimeline();
            
            // Reset form
            document.getElementById('add-note-form').style.display = 'none';
            document.getElementById('new-note-text').value = '';
            
            this.showToast('Note added successfully', 'success');
        } catch (error) {
            console.error('Failed to save note:', error);
            this.showToast('Failed to save note', 'error');
        }
    }
    
    close() {
        this.modal.style.display = 'none';
        this.currentLead = null;
        this.isEditMode = false;
        
        // Reset form states
        this.toggleEditMode(false);
        document.getElementById('add-note-form').style.display = 'none';
        document.getElementById('new-note-text').value = '';
    }
    
    // Utility functions
    formatRelativeTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    }
    
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    getDocumentIcon(type) {
        const icons = {
            pdf: '📄',
            image: '🖼️',
            document: '📋',
            spreadsheet: '📊',
            default: '📎'
        };
        return icons[type] || icons.default;
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toast-container') || document.body;
        container.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize lead details modal
window.leadDetailsModal = new LeadDetailsModal();

// Export for modules
export default LeadDetailsModal; 