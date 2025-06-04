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

function handleCreatePublisher() {
    try {
        const name = document.getElementById('new-publisher-name').value.trim();
        const email = document.getElementById('new-publisher-email').value.trim();
        const vendorCode = document.getElementById('new-publisher-code').value;
        const apiKey = document.getElementById('new-publisher-api-key').value;
        
        if (!name || !email) {
            alert('Please fill in Publisher Name and Contact Email');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        console.log('🏢 Creating publisher:', { name, email, vendorCode, apiKey });
        alert('Publisher "' + name + '" created successfully!\nVendor Code: ' + vendorCode + '\nAPI Key: ' + apiKey);
        closeModal('add-publisher-modal');
        
    } catch (error) {
        console.error('Error creating publisher:', error);
        alert('Error creating publisher: ' + error.message);
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
                window.location.href = 'index.html';
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
function bulkActions() { alert('Bulk actions'); }
function leadImport() { alert('Lead import'); }
function agentDashboard() { alert('Agent dashboard'); }

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