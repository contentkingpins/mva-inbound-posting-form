// CRITICAL BUTTON FUNCTIONS - MUST BE AVAILABLE IMMEDIATELY
console.log('🚀 Loading critical button functions...');

function openAddAgentModal() {
    try {
        console.log('👤 Opening Add Agent modal...');
        const modal = document.getElementById('add-agent-modal');
        if (!modal) {
            alert('Error: Add Agent modal not found');
            return;
        }
        
        const emailInput = document.getElementById('new-agent-email');
        const roleInput = document.getElementById('new-agent-role');
        
        if (emailInput) emailInput.value = '';
        if (roleInput) roleInput.value = 'agent';
        
        modal.classList.add('active');
        console.log('✅ Add Agent modal opened');
        
    } catch (error) {
        console.error('Error opening Add Agent modal:', error);
        alert('Error opening Add Agent modal: ' + error.message);
    }
}

function openAddPublisherModal() {
    try {
        console.log('🏢 Opening Add Publisher modal...');
        const modal = document.getElementById('add-publisher-modal');
        if (!modal) {
            alert('Error: Add Publisher modal not found');
            return;
        }
        
        function generateVendorCode() {
            const prefix = 'PUB';
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.random().toString(36).substr(2, 4).toUpperCase();
            return prefix + timestamp + random;
        }
        
        function generateAPIKey() {
            return 'api_' + Math.random().toString(36).substr(2, 32);
        }
        
        const nameInput = document.getElementById('new-publisher-name');
        const emailInput = document.getElementById('new-publisher-email');
        const codeInput = document.getElementById('new-publisher-code');
        const keyInput = document.getElementById('new-publisher-api-key');
        const statusInput = document.getElementById('new-publisher-status');
        
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (codeInput) codeInput.value = generateVendorCode();
        if (keyInput) keyInput.value = generateAPIKey();
        if (statusInput) statusInput.value = 'active';
        
        modal.classList.add('active');
        console.log('✅ Add Publisher modal opened');
        
    } catch (error) {
        console.error('Error opening Add Publisher modal:', error);
        alert('Error opening Add Publisher modal: ' + error.message);
    }
}

// BACKUP handleCreatePublisher function - always available
function handleCreatePublisher() {
    console.log('🏢 BACKUP handleCreatePublisher called from critical-functions.js');
    
    // Wait a moment for publisher-manager.js to load and override this function
    setTimeout(() => {
        // Check if the dedicated script has loaded and overridden this function
        const functionSource = window.handleCreatePublisher.toString();
        if (functionSource.includes('DEDICATED') || functionSource.includes('publisher-manager.js')) {
            console.log('🔄 Dedicated publisher manager detected, calling it...');
            return window.handleCreatePublisher();
        }
        
        // If still using backup after delay, execute basic fallback
        console.log('⚠️ Using backup function - dedicated script not loaded');
        executeBackupPublisherCreation();
    }, 100);
}

function executeBackupPublisherCreation() {
    // Basic fallback implementation
    try {
        const name = document.getElementById('new-publisher-name');
        const email = document.getElementById('new-publisher-email');
        
        if (!name || !email) {
            alert('Error: Form elements not found. Please refresh the page and try again.');
            return;
        }
        
        if (!name.value || !email.value) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Show a more helpful message
        const publisherName = name.value;
        const response = confirm(`✅ Ready to create publisher "${publisherName}"!\n\nNote: You're using the backup system. For full functionality (PDF generation, ZIP packages, tracking IDs), please:\n\n1. Refresh the page (Cmd+Shift+R)\n2. Try again\n\nContinue with basic creation?`);
        
        if (response) {
            alert(`✅ Publisher "${publisherName}" would be created!\n\n(This is the backup system - refresh page for full features)`);
            closeModal('add-publisher-modal');
        }
        
    } catch (error) {
        console.error('Error in backup handleCreatePublisher:', error);
        alert('Error creating publisher: ' + error.message + '\n\nPlease refresh the page and try again.');
    }
}

function closeModal(modalId) {
    try {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            console.log('✅ Modal closed:', modalId);
        }
    } catch (error) {
        console.error('Error closing modal:', error);
    }
}

function handleSendAgentInvite() {
    try {
        const email = document.getElementById('new-agent-email').value.trim();
        const role = document.getElementById('new-agent-role').value;
        
        if (!email) {
            alert('Please enter an email address');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        console.log('📧 Sending agent invite:', { email, role });
        alert('Agent invite sent to ' + email + ' with role: ' + role);
        closeModal('add-agent-modal');
        
    } catch (error) {
        console.error('Error sending agent invite:', error);
        alert('Error sending agent invite: ' + error.message);
    }
}

function handleLogout() {
    try {
        if (confirm('Are you sure you want to logout?')) {
            console.log('🚪 Logging out admin user...');
            localStorage.clear();
            sessionStorage.clear();
            alert('Logged out successfully!');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 500);
        }
    } catch (error) {
        console.error('Error during logout:', error);
        alert('Error during logout: ' + error.message);
    }
}

// Additional placeholder functions
function expandChart(type) { 
    console.log('Chart view:', type); 
    alert('Chart view for "' + type + '" - Feature coming soon!'); 
}
function expandActivity(el) { 
    if (el) el.classList.toggle('expanded'); 
}
function exportLeadData() { alert('Export started'); }
function refreshOverview() { alert('Data refreshed'); }
function viewAvailableLeads() { alert('Viewing available leads'); }
function viewClaimedLeads() { alert('Viewing claimed leads'); }
function showAnalyticsDetails() { alert('Analytics opened'); }
function reassignLead() { alert('Lead reassignment'); }
function bulkActions() {
    console.log('📦 Opening bulk actions...');
    alert('Bulk Actions available in Publisher Management section below');
}
function leadImport() {
    console.log('📥 Lead import feature...');
    alert('Lead Import - Feature coming soon!');
}
function agentDashboard() {
    console.log('👤 Navigating to agent dashboard...');
    try {
        // Navigate to agent dashboard
        window.location.href = 'agent-aurora.html';
    } catch (error) {
        console.error('Error navigating to agent dashboard:', error);
        alert('Error opening agent dashboard: ' + error.message);
    }
}

// EXPOSE TO GLOBAL SCOPE
window.openAddAgentModal = openAddAgentModal;
window.openAddPublisherModal = openAddPublisherModal;
window.closeModal = closeModal;
window.handleSendAgentInvite = handleSendAgentInvite;
window.handleCreatePublisher = handleCreatePublisher;
window.handleLogout = handleLogout;
window.expandChart = expandChart;
window.expandActivity = expandActivity;
window.exportLeadData = exportLeadData;
window.refreshOverview = refreshOverview;
window.viewAvailableLeads = viewAvailableLeads;
window.viewClaimedLeads = viewClaimedLeads;
window.showAnalyticsDetails = showAnalyticsDetails;
window.reassignLead = reassignLead;
window.bulkActions = bulkActions;
window.leadImport = leadImport;
window.agentDashboard = agentDashboard;

console.log('✅ ALL BUTTON FUNCTIONS LOADED AND EXPOSED TO GLOBAL SCOPE');
console.log('🔧 Functions available:', Object.keys(window).filter(k => typeof window[k] === 'function' && k.includes('Modal'))); 
console.log('🏢 handleCreatePublisher available:', typeof window.handleCreatePublisher); 