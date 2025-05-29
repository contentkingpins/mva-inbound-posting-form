// Professional Agent Dashboard - Legal Lead Management

// Global state
let availableLeads = [];
let myLeads = [];
let currentUser = null;
let API_ENDPOINT = '';

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    
    // Set up auto-refresh for real-time updates
    setInterval(refreshLeads, 15000); // Refresh every 15 seconds
});

// Initialize application
async function initializeApp() {
    try {
        // Get API endpoint from config
        API_ENDPOINT = window.APP_CONFIG?.apiEndpoint || '';
        
        // Check authentication
        await checkAuth();
        
        // Load dashboard data
        await loadDashboardData();
        
        // Initialize event listeners
        initEventListeners();
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showNotification('Failed to load dashboard', 'error');
    }
}

// Authentication
async function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(userStr);
        document.getElementById('agent-name').textContent = currentUser.name || currentUser.email;
    } catch (error) {
        console.error('Invalid user data:', error);
        window.location.href = 'login.html';
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    showLoadingState();
    
    try {
        // In a real implementation, this would fetch from the API
        // For now, using mock data
        await loadLeads();
        
        renderAvailableLeads();
        renderMyLeads();
        updateStats();
        
    } catch (error) {
        console.error('Failed to load leads:', error);
        showNotification('Failed to load leads', 'error');
    } finally {
        hideLoadingState();
    }
}

// Load leads (mock for now, replace with API call)
async function loadLeads() {
    // In production, this would be:
    // const response = await fetch(`${API_ENDPOINT}/leads`, {
    //     headers: {
    //         'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    //     }
    // });
    // const data = await response.json();
    
    // Mock data for demonstration
    availableLeads = generateMockAvailableLeads();
    myLeads = generateMockMyLeads();
}

// Render Available Leads
function renderAvailableLeads() {
    const grid = document.getElementById('available-leads-grid');
    
    if (availableLeads.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                <p>No available leads at this time</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = availableLeads.map(lead => `
        <div class="lead-card" onclick="openLeadModal('${lead.lead_id}', false)">
            <div class="lead-header">
                <h4 class="lead-name">${escapeHtml(lead.first_name)} ${escapeHtml(lead.last_name)}</h4>
                <span class="status-badge status-new">NEW</span>
            </div>
            
            <div class="lead-info">
                <div class="lead-detail">
                    <span>✉</span>
                    <span>${escapeHtml(lead.email)}</span>
                </div>
                <div class="lead-detail">
                    <span>☎</span>
                    <span>${formatPhone(lead.phone_home)}</span>
                </div>
                <div class="lead-detail">
                    <span>📍</span>
                    <span>${escapeHtml(lead.city)}, ${escapeHtml(lead.state)}</span>
                </div>
                <div class="lead-detail">
                    <span>⚖</span>
                    <span>${escapeHtml(lead.incident_type || 'Not specified')}</span>
                </div>
            </div>
            
            <div class="lead-actions">
                <button class="btn" onclick="claimLead('${lead.lead_id}', event)">
                    Claim Lead
                </button>
                <button class="btn btn-secondary" onclick="openLeadModal('${lead.lead_id}', false, event)">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

// Render My Leads
function renderMyLeads() {
    const grid = document.getElementById('my-leads-grid');
    const filterValue = document.getElementById('filter-status').value;
    
    let filteredLeads = myLeads;
    if (filterValue !== 'all') {
        filteredLeads = myLeads.filter(lead => 
            lead.disposition.toLowerCase().replace(/\s+/g, '-') === filterValue
        );
    }
    
    if (filteredLeads.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                <p>${filterValue === 'all' ? 'No active leads yet' : 'No leads with this status'}</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredLeads.map(lead => `
        <div class="lead-card" onclick="openLeadModal('${lead.lead_id}', true)">
            <div class="lead-header">
                <h4 class="lead-name">${escapeHtml(lead.first_name)} ${escapeHtml(lead.last_name)}</h4>
                <span class="status-badge status-${getStatusClass(lead.disposition)}">${lead.disposition}</span>
            </div>
            
            <div class="lead-info">
                <div class="lead-detail">
                    <span>✉</span>
                    <span>${escapeHtml(lead.email)}</span>
                </div>
                <div class="lead-detail">
                    <span>☎</span>
                    <span>${formatPhone(lead.phone_home)}</span>
                </div>
                <div class="lead-detail">
                    <span>📅</span>
                    <span>Claimed: ${formatDate(lead.claimedAt)}</span>
                </div>
                <div class="lead-detail">
                    <span>⚖</span>
                    <span>${escapeHtml(lead.incident_type || 'Not specified')}</span>
                </div>
            </div>
            
            <div class="lead-actions">
                <button class="btn" onclick="openLeadModal('${lead.lead_id}', true, event)">
                    Manage Lead
                </button>
                ${lead.disposition !== 'Retained for Firm' ? `
                    <button class="btn btn-secondary" onclick="sendRetainer('${lead.lead_id}', event)">
                        Send Retainer
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Update Stats
function updateStats() {
    const availableCount = availableLeads.length;
    const activeCount = myLeads.length;
    const retainedCount = myLeads.filter(l => l.disposition === 'Retained for Firm').length;
    const conversionRate = activeCount > 0 ? Math.round((retainedCount / activeCount) * 100) : 0;
    
    document.getElementById('available-count').textContent = availableCount;
    document.getElementById('active-count').textContent = activeCount;
    document.getElementById('retained-count').textContent = retainedCount;
    document.getElementById('conversion-rate').textContent = conversionRate + '%';
    
    // Update badge
    updateMyLeadsCount();
}

// Open Lead Modal
function openLeadModal(leadId, isMyLead, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const lead = isMyLead 
        ? myLeads.find(l => l.lead_id === leadId)
        : availableLeads.find(l => l.lead_id === leadId);
        
    if (!lead) return;
    
    const modal = document.getElementById('lead-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('lead-details');
    const actionBtn = document.getElementById('modal-action-btn');
    
    modalTitle.textContent = isMyLead ? 'Manage Lead' : 'Lead Details';
    
    // Build modal content
    modalContent.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" value="${escapeHtml(lead.first_name)} ${escapeHtml(lead.last_name)}" readonly>
            </div>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" value="${escapeHtml(lead.email)}" readonly>
            </div>
            <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="tel" class="form-input" value="${formatPhone(lead.phone_home)}" readonly>
            </div>
            <div class="form-group">
                <label class="form-label">Location</label>
                <input type="text" class="form-input" value="${escapeHtml(lead.city)}, ${escapeHtml(lead.state)} ${escapeHtml(lead.zip_code)}" readonly>
            </div>
        </div>
        
        ${isMyLead ? `
            <div class="form-group">
                <label class="form-label">Disposition</label>
                <select class="form-select" id="modal-disposition">
                    <option value="New" ${lead.disposition === 'New' ? 'selected' : ''}>New</option>
                    <option value="Contacted" ${lead.disposition === 'Contacted' ? 'selected' : ''}>Contacted</option>
                    <option value="Qualified" ${lead.disposition === 'Qualified' ? 'selected' : ''}>Qualified</option>
                    <option value="Retained for Firm" ${lead.disposition === 'Retained for Firm' ? 'selected' : ''}>Retained for Firm</option>
                    <option value="Docs Sent" ${lead.disposition === 'Docs Sent' ? 'selected' : ''}>Docs Sent</option>
                    <option value="Awaiting Proof of Claim" ${lead.disposition === 'Awaiting Proof of Claim' ? 'selected' : ''}>Awaiting Proof of Claim</option>
                    <option value="Not Interested" ${lead.disposition === 'Not Interested' ? 'selected' : ''}>Not Interested</option>
                    <option value="Not Qualified Lead" ${lead.disposition === 'Not Qualified Lead' ? 'selected' : ''}>Not Qualified Lead</option>
                </select>
            </div>
        ` : ''}
        
        <div class="qualification-section">
            <h4 class="section-subtitle">Qualification Information</h4>
            
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Incident Type</label>
                    <select class="form-select" id="modal-incident-type" ${!isMyLead ? 'disabled' : ''}>
                        <option value="">Select Type</option>
                        <option value="PFAS" ${lead.incident_type === 'PFAS' ? 'selected' : ''}>PFAS</option>
                        <option value="VGA" ${lead.incident_type === 'VGA' ? 'selected' : ''}>VGA</option>
                        <option value="MVA" ${lead.incident_type === 'MVA' ? 'selected' : ''}>MVA</option>
                        <option value="CMVA" ${lead.incident_type === 'CMVA' ? 'selected' : ''}>CMVA</option>
                        <option value="PI" ${lead.incident_type === 'PI' ? 'selected' : ''}>PI</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Accident Location</label>
                    <input type="text" class="form-input" id="modal-accident-location" 
                           value="${escapeHtml(lead.accident_location || '')}" ${!isMyLead ? 'readonly' : ''}>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Was the caller at fault?</label>
                <div class="radio-group">
                    <label class="radio-label">
                        <input type="radio" name="modal-at-fault" value="yes" 
                               ${lead.caller_at_fault === 'yes' ? 'checked' : ''} ${!isMyLead ? 'disabled' : ''}>
                        Yes
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="modal-at-fault" value="no" 
                               ${lead.caller_at_fault === 'no' ? 'checked' : ''} ${!isMyLead ? 'disabled' : ''}>
                        No
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Does the caller already have an attorney?</label>
                <div class="radio-group">
                    <label class="radio-label">
                        <input type="radio" name="modal-has-attorney" value="yes" 
                               ${lead.has_attorney === 'yes' ? 'checked' : ''} ${!isMyLead ? 'disabled' : ''}>
                        Yes
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="modal-has-attorney" value="no" 
                               ${lead.has_attorney === 'no' ? 'checked' : ''} ${!isMyLead ? 'disabled' : ''}>
                        No
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Was the caller injured?</label>
                <div class="radio-group">
                    <label class="radio-label">
                        <input type="radio" name="modal-injured" value="yes" 
                               ${lead.was_injured === 'yes' ? 'checked' : ''} ${!isMyLead ? 'disabled' : ''}>
                        Yes
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="modal-injured" value="no" 
                               ${lead.was_injured === 'no' ? 'checked' : ''} ${!isMyLead ? 'disabled' : ''}>
                        No
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Did they see a medical professional within 30 days?</label>
                <div class="radio-group">
                    <label class="radio-label">
                        <input type="radio" name="modal-medical-30-days" value="yes" 
                               ${lead.medical_within_30_days === 'yes' ? 'checked' : ''} ${!isMyLead ? 'disabled' : ''}>
                        Yes
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="modal-medical-30-days" value="no" 
                               ${lead.medical_within_30_days === 'no' ? 'checked' : ''} ${!isMyLead ? 'disabled' : ''}>
                        No
                    </label>
                </div>
            </div>
        </div>
        
        ${isMyLead ? `
            <div class="form-group">
                <label class="form-label">Notes</label>
                <textarea class="form-textarea" id="modal-notes" rows="4">${escapeHtml(lead.notes || '')}</textarea>
            </div>
        ` : ''}
        
        ${lead.docusign_info ? `
            <div class="qualification-section">
                <h4 class="section-subtitle">Retainer Status</h4>
                <div class="form-group">
                    <p><strong>Status:</strong> ${lead.docusign_info.status}</p>
                    ${lead.docusign_info.sentAt ? `<p><strong>Sent:</strong> ${formatDate(lead.docusign_info.sentAt)}</p>` : ''}
                    ${lead.docusign_info.completedAt ? `<p><strong>Completed:</strong> ${formatDate(lead.docusign_info.completedAt)}</p>` : ''}
                </div>
            </div>
        ` : ''}
    `;
    
    // Set up action button
    if (isMyLead) {
        actionBtn.style.display = 'block';
        actionBtn.textContent = 'Save Changes';
        actionBtn.onclick = () => saveLeadChanges(leadId);
    } else if (!isMyLead) {
        actionBtn.style.display = 'block';
        actionBtn.textContent = 'Claim Lead';
        actionBtn.onclick = () => {
            claimLead(leadId);
            closeLeadModal();
        };
    } else {
        actionBtn.style.display = 'none';
    }
    
    modal.style.display = 'flex';
}

// Close Lead Modal
function closeLeadModal() {
    document.getElementById('lead-modal').style.display = 'none';
}

// Save Lead Changes
async function saveLeadChanges(leadId) {
    const lead = myLeads.find(l => l.lead_id === leadId);
    if (!lead) return;
    
    // Get updated values
    const disposition = document.getElementById('modal-disposition').value;
    const incidentType = document.getElementById('modal-incident-type').value;
    const accidentLocation = document.getElementById('modal-accident-location').value;
    const notes = document.getElementById('modal-notes').value;
    
    // Get radio values
    const atFault = document.querySelector('input[name="modal-at-fault"]:checked')?.value;
    const hasAttorney = document.querySelector('input[name="modal-has-attorney"]:checked')?.value;
    const wasInjured = document.querySelector('input[name="modal-injured"]:checked')?.value;
    const medical30Days = document.querySelector('input[name="modal-medical-30-days"]:checked')?.value;
    
    // Update lead object
    lead.disposition = disposition;
    lead.incident_type = incidentType;
    lead.accident_location = accidentLocation;
    lead.notes = notes;
    lead.caller_at_fault = atFault;
    lead.has_attorney = hasAttorney;
    lead.was_injured = wasInjured;
    lead.medical_within_30_days = medical30Days;
    
    // In production, this would make an API call
    // await updateLeadAPI(leadId, updatedData);
    
    closeLeadModal();
    renderMyLeads();
    updateStats();
    showNotification('Lead updated successfully', 'success');
}

// Claim Lead
async function claimLead(leadId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const lead = availableLeads.find(l => l.lead_id === leadId);
    if (!lead) return;
    
    // In production, this would make an API call
    // await claimLeadAPI(leadId);
    
    // Move lead from available to my leads
    availableLeads = availableLeads.filter(l => l.lead_id !== leadId);
    myLeads.unshift({
        ...lead,
        disposition: 'New',
        claimedAt: new Date().toISOString(),
        claimedBy: currentUser.email
    });
    
    renderAvailableLeads();
    renderMyLeads();
    updateStats();
    showNotification(`Lead "${lead.first_name} ${lead.last_name}" claimed successfully!`, 'success');
}

// Send Retainer
async function sendRetainer(leadId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const lead = myLeads.find(l => l.lead_id === leadId);
    if (!lead) return;
    
    // In production, this would open a retainer sending modal
    // For now, just show a notification
    showNotification(`Retainer sending functionality coming soon for ${lead.first_name} ${lead.last_name}`, 'info');
}

// Refresh Leads
async function refreshLeads() {
    showNotification('Refreshing leads...', 'info');
    await loadDashboardData();
}

// Event Listeners
function initEventListeners() {
    // Search functionality
    document.getElementById('search-leads').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterAvailableLeads(searchTerm);
    });
    
    // Status filter
    document.getElementById('filter-status').addEventListener('change', () => {
        renderMyLeads();
    });
    
    // Close modal on overlay click
    document.getElementById('lead-modal').addEventListener('click', (e) => {
        if (e.target.id === 'lead-modal') {
            closeLeadModal();
        }
    });
}

// Filter Available Leads
function filterAvailableLeads(searchTerm) {
    const filtered = availableLeads.filter(lead => {
        const searchString = `${lead.first_name} ${lead.last_name} ${lead.email} ${lead.phone_home} ${lead.city} ${lead.state}`.toLowerCase();
        return searchString.includes(searchTerm);
    });
    
    const grid = document.getElementById('available-leads-grid');
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                <p>No leads found matching "${searchTerm}"</p>
            </div>
        `;
        return;
    }
    
    // Re-render with filtered results
    const tempLeads = availableLeads;
    availableLeads = filtered;
    renderAvailableLeads();
    availableLeads = tempLeads;
}

// Utility Functions
function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStatusClass(disposition) {
    const statusMap = {
        'New': 'new',
        'Contacted': 'contacted',
        'Qualified': 'qualified',
        'Retained for Firm': 'retained',
        'Docs Sent': 'qualified',
        'Awaiting Proof of Claim': 'contacted',
        'Not Interested': 'lost',
        'Not Qualified Lead': 'lost'
    };
    return statusMap[disposition] || 'new';
}

// Notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: var(--glass-white);
        backdrop-filter: blur(12px);
        border: 1px solid var(--glass-border);
        border-radius: 8px;
        padding: 1rem 1.5rem;
        color: var(--text-primary);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    // Add type-specific styling
    if (type === 'success') {
        notification.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        notification.style.background = 'rgba(16, 185, 129, 0.1)';
    } else if (type === 'error') {
        notification.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        notification.style.background = 'rgba(239, 68, 68, 0.1)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Loading States
function showLoadingState() {
    document.querySelectorAll('.leads-grid').forEach(grid => {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 2rem;">
                <div class="loading-skeleton" style="width: 100%; height: 120px; margin-bottom: 1rem;"></div>
                <div class="loading-skeleton" style="width: 100%; height: 120px; margin-bottom: 1rem;"></div>
                <div class="loading-skeleton" style="width: 100%; height: 120px;"></div>
            </div>
        `;
    });
}

function hideLoadingState() {
    // Loading state will be replaced by actual content
}

// Logout
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Mock Data Generators
function generateMockAvailableLeads() {
    return [
        {
            lead_id: 'lead-001',
            first_name: 'John',
            last_name: 'Smith',
            email: 'john.smith@email.com',
            phone_home: '5551234567',
            city: 'Miami',
            state: 'FL',
            zip_code: '33101',
            incident_type: 'MVA',
            accident_location: 'I-95 and SW 8th St',
            caller_at_fault: 'no',
            has_attorney: 'no',
            was_injured: 'yes',
            medical_within_30_days: 'yes',
            notes: 'Rear-ended at traffic light',
            created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
            lead_id: 'lead-002',
            first_name: 'Sarah',
            last_name: 'Johnson',
            email: 'sarah.j@email.com',
            phone_home: '5559876543',
            city: 'Orlando',
            state: 'FL',
            zip_code: '32801',
            incident_type: 'CMVA',
            accident_location: 'Turnpike Mile Marker 254',
            caller_at_fault: 'no',
            has_attorney: 'no',
            was_injured: 'yes',
            medical_within_30_days: 'yes',
            notes: 'Hit by commercial truck',
            created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
            lead_id: 'lead-003',
            first_name: 'Michael',
            last_name: 'Davis',
            email: 'mdavis@email.com',
            phone_home: '5555551212',
            city: 'Tampa',
            state: 'FL',
            zip_code: '33602',
            incident_type: 'PI',
            accident_location: 'Walmart on Dale Mabry',
            caller_at_fault: 'no',
            has_attorney: 'no',
            was_injured: 'yes',
            medical_within_30_days: 'yes',
            notes: 'Slip and fall in store',
            created_at: new Date(Date.now() - 10800000).toISOString()
        }
    ];
}

function generateMockMyLeads() {
    return [
        {
            lead_id: 'my-lead-001',
            first_name: 'Emily',
            last_name: 'Wilson',
            email: 'emily.w@email.com',
            phone_home: '5553334444',
            city: 'Fort Lauderdale',
            state: 'FL',
            zip_code: '33301',
            incident_type: 'MVA',
            accident_location: 'I-595 and University Dr',
            caller_at_fault: 'no',
            has_attorney: 'no',
            was_injured: 'yes',
            medical_within_30_days: 'yes',
            disposition: 'Contacted',
            notes: 'Spoke with client, very interested in representation',
            claimedAt: new Date(Date.now() - 86400000).toISOString(),
            claimedBy: currentUser?.email || 'agent@example.com'
        },
        {
            lead_id: 'my-lead-002',
            first_name: 'Robert',
            last_name: 'Brown',
            email: 'rbrown@email.com',
            phone_home: '5557778888',
            city: 'Jacksonville',
            state: 'FL',
            zip_code: '32202',
            incident_type: 'PFAS',
            accident_location: 'Naval Air Station Jacksonville',
            caller_at_fault: 'no',
            has_attorney: 'no',
            was_injured: 'yes',
            medical_within_30_days: 'yes',
            disposition: 'Retained for Firm',
            notes: 'Client signed retainer, gathering medical records',
            claimedAt: new Date(Date.now() - 172800000).toISOString(),
            claimedBy: currentUser?.email || 'agent@example.com',
            docusign_info: {
                status: 'completed',
                sentAt: new Date(Date.now() - 86400000).toISOString(),
                completedAt: new Date(Date.now() - 43200000).toISOString()
            }
        }
    ];
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Switch between tabs
function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
    
    // Refresh content if needed
    if (tabId === 'live-dashboard') {
        refreshLeads();
    } else if (tabId === 'my-leads') {
        refreshMyLeads();
    }
}

// Refresh My Leads
async function refreshMyLeads() {
    showNotification('Refreshing my leads...', 'info');
    try {
        await loadMyLeads();
        updateStats();
        showNotification('My leads updated', 'success');
    } catch (error) {
        console.error('Failed to refresh my leads:', error);
        showNotification('Failed to refresh my leads', 'error');
    }
}

// Update My Leads Count Badge
function updateMyLeadsCount() {
    const badge = document.getElementById('my-leads-count');
    if (badge) {
        badge.textContent = myLeads.length;
        badge.style.display = myLeads.length > 0 ? 'inline' : 'none';
    }
}

// Extend the existing updateStats function
function updateStats() {
    const availableCount = availableLeads.length;
    const activeCount = myLeads.length;
    const retainedCount = myLeads.filter(l => l.disposition === 'Retained for Firm').length;
    const conversionRate = activeCount > 0 ? Math.round((retainedCount / activeCount) * 100) : 0;
    
    document.getElementById('available-count').textContent = availableCount;
    document.getElementById('active-count').textContent = activeCount;
    document.getElementById('retained-count').textContent = retainedCount;
    document.getElementById('conversion-rate').textContent = conversionRate + '%';
    
    // Update badge
    updateMyLeadsCount();
} 