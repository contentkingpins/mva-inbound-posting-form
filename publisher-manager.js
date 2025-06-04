// PUBLISHER MANAGER - Dedicated script for publisher functionality
console.log('🏢 Loading Publisher Manager...');

// Publisher data and functions
let selectedPublishers = new Set();
let allPublishers = [];

// Generate unique tracking ID for publisher traffic
function generateTrackingId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let trackingId = 'TRK_';
    for (let i = 0; i < 8; i++) {
        trackingId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return trackingId;
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

function addActivityFeedItem(message, type = 'info') {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;
    
    const activity = document.createElement('div');
    activity.className = 'activity-item';
    activity.innerHTML = `
        <div class="activity-icon ${type}">
            ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
        </div>
        <div class="activity-content">
            <div class="activity-message">${message}</div>
            <div class="activity-time">${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    
    feed.insertBefore(activity, feed.firstChild);
    
    // Keep only last 20 items
    const items = feed.querySelectorAll('.activity-item');
    if (items.length > 20) {
        items[items.length - 1].remove();
    }
}

// MAIN PUBLISHER CREATION FUNCTION
window.handleCreatePublisher = function() {
    console.log('🏢 DEDICATED handleCreatePublisher called from publisher-manager.js');
    
    try {
        // Get form elements
        const nameEl = document.getElementById('new-publisher-name');
        const emailEl = document.getElementById('new-publisher-email');
        const vendorCodeEl = document.getElementById('new-publisher-code');
        const apiKeyEl = document.getElementById('new-publisher-api-key');
        const statusEl = document.getElementById('new-publisher-status');
        
        console.log('📋 Form elements found:', {
            name: !!nameEl,
            email: !!emailEl,
            vendorCode: !!vendorCodeEl,
            apiKey: !!apiKeyEl,
            status: !!statusEl
        });
        
        if (!nameEl || !emailEl || !vendorCodeEl || !apiKeyEl || !statusEl) {
            alert('Error: Form elements not found. Please refresh the page.');
            return;
        }
        
        const name = nameEl.value.trim();
        const email = emailEl.value.trim();
        const vendorCode = vendorCodeEl.value.trim();
        const apiKey = apiKeyEl.value.trim();
        const status = statusEl.value;
        
        console.log('📝 Form values:', { name, email, vendorCode, apiKey, status });
        
        if (!name || !email) {
            alert('Please fill in Publisher Name and Contact Email');
            return;
        }
        
        // Generate tracking ID
        const trackingId = generateTrackingId();
        console.log('📊 Generated tracking ID:', trackingId);
        
        // Create publisher object
        const newPublisher = {
            id: 'pub_' + Date.now(),
            name: name,
            email: email,
            vendorCode: vendorCode,
            apiKey: apiKey,
            trackingId: trackingId,
            status: status || 'active',
            leads: 0,
            revenue: 0,
            lastActivity: new Date().toISOString()
        };
        
        // Add to array
        allPublishers.push(newPublisher);
        console.log('📊 Publisher added to array. Total publishers:', allPublishers.length);
        
        // Update displays
        updatePublisherCount();
        renderPublishersTable();
        updatePublisherStats();
        
        // Add activity feed item
        addActivityFeedItem(`🏢 Publisher "${name}" created successfully with tracking ID ${trackingId}`, 'success');
        
        // Create basic documentation download
        downloadPublisherCredentials(newPublisher);
        
        // Close modal
        if (window.closeModal) {
            closeModal('add-publisher-modal');
        } else {
            const modal = document.getElementById('add-publisher-modal');
            if (modal) modal.classList.remove('active');
        }
        
        alert(`✅ Publisher "${name}" created successfully!\n\nTracking ID: ${trackingId}\nVendor Code: ${vendorCode}\n\nCredentials file downloaded.`);
        
    } catch (error) {
        console.error('❌ Error creating publisher:', error);
        alert('Error creating publisher: ' + error.message);
    }
};

function downloadPublisherCredentials(publisher) {
    const credentials = `CLAIM CONNECTORS PUBLISHER CREDENTIALS
=====================================

Publisher Name: ${publisher.name}
Contact Email: ${publisher.email}
Vendor Code: ${publisher.vendorCode}
Tracking ID: ${publisher.trackingId}
API Key: ${publisher.apiKey}
Status: ${publisher.status}
Created: ${new Date().toLocaleString()}

API ENDPOINT: https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads

INTEGRATION INSTRUCTIONS:
1. Use the Vendor Code and API Key for authentication
2. Include the Tracking ID in all API requests
3. POST lead data to the API endpoint above

SAMPLE HEADERS:
Content-Type: application/json
X-API-Key: ${publisher.apiKey}
X-Vendor-Code: ${publisher.vendorCode}
X-Tracking-ID: ${publisher.trackingId}

SAMPLE PAYLOAD:
{
  "first_name": "John",
  "last_name": "Smith",
  "email": "john.smith@email.com",
  "phone_home": "(555) 123-4567",
  "state": "CA",
  "incident_type": "auto_accident",
  "vendor_code": "${publisher.vendorCode}",
  "tracking_id": "${publisher.trackingId}"
}

SUPPORT:
Email: publishers@claimconnectors.com
Phone: (555) CLAIM-01
`;

    // Download as text file
    const blob = new Blob([credentials], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${publisher.name.replace(/[^a-zA-Z0-9]/g, '_')}_Publisher_Credentials.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📄 Publisher credentials downloaded');
}

function renderPublishersTable() {
    const tbody = document.getElementById('publishers-table-body');
    if (!tbody) {
        console.warn('Publishers table body not found');
        return;
    }

    tbody.innerHTML = allPublishers.map(publisher => `
        <tr>
            <td><input type="checkbox" value="${publisher.id}"></td>
            <td>
                <div class="publisher-info">
                    <div class="publisher-name">${publisher.name}</div>
                    <div class="publisher-email">${publisher.email}</div>
                </div>
            </td>
            <td><span class="status-badge ${publisher.status}">${publisher.status.toUpperCase()}</span></td>
            <td><span class="vendor-code">${publisher.vendorCode}</span></td>
            <td><span class="vendor-code">${publisher.trackingId}</span></td>
            <td><div class="api-key-display">${publisher.apiKey.substring(0, 8)}...</div></td>
            <td>${publisher.leads}</td>
            <td>$${publisher.revenue}</td>
            <td>Just now</td>
            <td>
                <button class="action-btn-sm view" onclick="viewPublisher('${publisher.id}')">👁️</button>
                <button class="action-btn-sm edit" onclick="editPublisher('${publisher.id}')">✏️</button>
            </td>
        </tr>
    `).join('');
    
    console.log('📊 Publishers table updated with', allPublishers.length, 'publishers');
}

function updatePublisherCount() {
    const countEl = document.getElementById('publisher-count');
    if (countEl) {
        countEl.textContent = `${allPublishers.length} publishers`;
    }
}

function updatePublisherStats() {
    const activePublishers = allPublishers.filter(p => p.status === 'active').length;
    const totalLeads = allPublishers.reduce((sum, p) => sum + p.leads, 0);
    const totalRevenue = allPublishers.reduce((sum, p) => sum + p.revenue, 0);

    const totalEl = document.getElementById('total-publishers');
    const activeEl = document.getElementById('active-publishers');
    const leadsEl = document.getElementById('total-publisher-leads');
    const revenueEl = document.getElementById('total-publisher-revenue');

    if (totalEl) totalEl.textContent = allPublishers.length;
    if (activeEl) activeEl.textContent = activePublishers;
    if (leadsEl) leadsEl.textContent = totalLeads.toLocaleString();
    if (revenueEl) revenueEl.textContent = '$' + totalRevenue.toLocaleString();
}

// Simple action functions
window.viewPublisher = function(id) {
    const publisher = allPublishers.find(p => p.id === id);
    if (publisher) {
        alert(`Publisher Details:\n\nName: ${publisher.name}\nEmail: ${publisher.email}\nTracking ID: ${publisher.trackingId}\nStatus: ${publisher.status}`);
    }
};

window.editPublisher = function(id) {
    const publisher = allPublishers.find(p => p.id === id);
    if (publisher) {
        const newName = prompt('Edit Publisher Name:', publisher.name);
        if (newName && newName !== publisher.name) {
            publisher.name = newName;
            renderPublishersTable();
            addActivityFeedItem(`📝 Publisher updated to "${newName}"`, 'info');
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        console.log('🏢 Publisher Manager initialized');
        renderPublishersTable();
        updatePublisherStats();
        updatePublisherCount();
        
        // Confirm function is available
        console.log('✅ handleCreatePublisher available:', typeof window.handleCreatePublisher);
    }, 500);
});

console.log('🏢 Publisher Manager loaded successfully'); 