/**
 * Admin Dashboard Data Loader
 * Connects the working APIs to the dashboard UI
 */

const API_BASE = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';

// Get auth token
function getAuthToken() {
    return localStorage.getItem('auth_token') || localStorage.getItem('idToken');
}

// Make authenticated API calls
async function apiCall(endpoint) {
    const token = getAuthToken();
    if (!token) {
        console.error('No auth token available');
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Origin': 'https://main.d21xta9fg9b6w.amplifyapp.com'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error calling ${endpoint}:`, error);
        return null;
    }
}

// Load and display vendors (publishers)
async function loadVendors() {
    console.log('📊 Loading vendors...');
    const data = await apiCall('/vendors');
    
    // Handle both array response and object response formats
    let vendors;
    if (Array.isArray(data)) {
        // Backend returns plain array (current format)
        vendors = data;
    } else if (data && data.vendors) {
        // Backend returns object with vendors property (future format)
        vendors = data.vendors;
    } else {
        console.error('No vendors data received');
        return [];
    }
    
    console.log(`✅ Loaded ${vendors.length} vendors`);
    
    // Update publisher count
    const publisherCount = document.getElementById('publisher-count');
    if (publisherCount) {
        publisherCount.textContent = `${vendors.length} publishers`;
    }
    
    // Update total publishers stat
    const totalPublishers = document.getElementById('total-publishers');
    if (totalPublishers) {
        totalPublishers.textContent = vendors.length;
    }
    
    // Count active publishers
    const activeVendors = vendors.filter(v => v.status === 'active');
    const activePublishers = document.getElementById('active-publishers');
    if (activePublishers) {
        activePublishers.textContent = activeVendors.length;
    }
    
    // Populate vendors table
    populateVendorsTable(vendors);
    
    return vendors;
}

// Populate vendors table
function populateVendorsTable(vendors) {
    const tbody = document.getElementById('publishers-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    vendors.forEach(vendor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" value="${vendor.vendor_id || vendor.id}"></td>
            <td>
                <div class="publisher-info">
                    <div class="publisher-name">${vendor.name || 'Unnamed Publisher'}</div>
                    <div class="publisher-email">${vendor.email || 'No email'}</div>
                </div>
            </td>
            <td><span class="status-badge ${vendor.status}">${vendor.status || 'unknown'}</span></td>
            <td><code>${vendor.vendor_code || vendor.tracking_id || 'N/A'}</code></td>
            <td><code>${vendor.tracking_id || vendor.vendor_code || 'N/A'}</code></td>
            <td><code>${vendor.api_key ? vendor.api_key.substring(0, 12) + '...' : 'N/A'}</code></td>
            <td>${vendor.lead_count || 0}</td>
            <td>$${vendor.total_revenue || 0}</td>
            <td>${vendor.last_activity || 'Never'}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view" onclick="viewPublisher('${vendor.vendor_id || vendor.id}')">👁️</button>
                    <button class="action-btn edit" onclick="editPublisher('${vendor.vendor_id || vendor.id}')">✏️</button>
                    <button class="action-btn delete" onclick="deletePublisher('${vendor.vendor_id || vendor.id}')">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✅ Populated table with ${vendors.length} vendors`);
}

// Load and display admin stats
async function loadAdminStats() {
    console.log('📈 Loading admin stats...');
    const data = await apiCall('/admin/stats');
    
    if (data) {
        console.log('✅ Loaded admin stats:', data);
        
        // Update revenue stats
        if (data.revenue) {
            const revenueElement = document.getElementById('total-revenue-stat');
            if (revenueElement) {
                revenueElement.textContent = `$${(data.revenue.total || 0).toLocaleString()}`;
            }
        }
        
        // Update agent stats
        if (data.agents) {
            const agentsElement = document.getElementById('total-agents-stat');
            if (agentsElement) {
                agentsElement.textContent = data.agents.total || 0;
            }
        }
        
        // Update conversion rate
        if (data.conversion) {
            const conversionElement = document.getElementById('conversion-rate-stat');
            if (conversionElement) {
                conversionElement.textContent = `${data.conversion.rate || 0}%`;
            }
        }
        
        return data;
    } else {
        console.error('No admin stats data received');
        return null;
    }
}

// Load and display leads
async function loadLeads() {
    console.log('📋 Loading leads...');
    const data = await apiCall('/leads');
    
    if (data && data.data) {
        const leads = data.data;
        console.log(`✅ Loaded ${leads.length} leads`);
        
        // Update leads count
        const leadsCountElement = document.getElementById('total-leads-stat');
        if (leadsCountElement) {
            leadsCountElement.textContent = leads.length;
        }
        
        // Update leads in all leads section
        const allLeadsCount = document.getElementById('all-leads-count');
        if (allLeadsCount) {
            allLeadsCount.textContent = `${leads.length} leads`;
        }
        
        // Calculate stats
        const highValueLeads = leads.filter(lead => {
            const medicalBills = parseFloat(lead.medical_bills) || 0;
            return medicalBills >= 100000; // $100k+
        });
        
        const highValueElement = document.getElementById('high-value-leads');
        if (highValueElement) {
            highValueElement.textContent = highValueLeads.length;
        }
        
        // Populate leads table if visible
        const leadsSection = document.getElementById('all-leads-section');
        if (leadsSection && leadsSection.style.display !== 'none') {
            populateLeadsTable(leads);
        }
        
        return leads;
    } else {
        console.error('No leads data received');
        return [];
    }
}

// Populate leads table
function populateLeadsTable(leads) {
    const tbody = document.getElementById('all-leads-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    leads.forEach(lead => {
        const row = document.createElement('tr');
        const medicalBills = parseFloat(lead.medical_bills) || 0;
        const formattedBills = medicalBills > 0 ? `$${medicalBills.toLocaleString()}` : 'N/A';
        
        row.innerHTML = `
            <td><input type="checkbox" value="${lead.id || lead.lead_id}"></td>
            <td>
                <div class="lead-info">
                    <div class="lead-name">${lead.first_name || ''} ${lead.last_name || ''}</div>
                    <div class="lead-contact">${lead.email || ''} • ${lead.phone || ''}</div>
                </div>
            </td>
            <td>${lead.publisher_name || 'Unknown'}</td>
            <td>${formattedBills}</td>
            <td>${lead.primary_injury || 'Not specified'}</td>
            <td><span class="status-badge ${lead.status || 'new'}">${lead.status || 'new'}</span></td>
            <td>${lead.state || 'N/A'}</td>
            <td>${lead.incident_date || 'N/A'}</td>
            <td>${lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view" onclick="viewLead('${lead.id || lead.lead_id}')">👁️</button>
                    <button class="action-btn edit" onclick="editLead('${lead.id || lead.lead_id}')">✏️</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✅ Populated leads table with ${leads.length} leads`);
}

// Load analytics data and update charts
async function loadAnalytics() {
    console.log('📊 Loading analytics...');
    const data = await apiCall('/admin/analytics');
    
    if (data) {
        console.log('✅ Loaded analytics:', data);
        // Analytics chart code would go here
        return data;
    } else {
        console.error('No analytics data received');
        return null;
    }
}

// Initialize dashboard data loading
async function initializeDashboard() {
    console.log('🚀 Initializing admin dashboard with real data...');
    
    try {
        // Load all data in parallel
        const [vendors, stats, leads, analytics] = await Promise.all([
            loadVendors(),
            loadAdminStats(), 
            loadLeads(),
            loadAnalytics()
        ]);
        
        console.log('✅ Dashboard data loaded successfully');
        
        // Show success message
        if (window.showToast) {
            window.showToast('Dashboard data loaded successfully!', 'success');
        }
        
        return { vendors, stats, leads, analytics };
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        
        if (window.showToast) {
            window.showToast('Error loading dashboard data', 'error');
        }
    }
}

// Auto-refresh data every 5 minutes
function startAutoRefresh() {
    setInterval(() => {
        console.log('🔄 Auto-refreshing dashboard data...');
        initializeDashboard();
    }, 5 * 60 * 1000); // 5 minutes
}

// Export functions for global use
window.adminDashboard = {
    initializeDashboard,
    loadVendors,
    loadAdminStats,
    loadLeads,
    loadAnalytics,
    startAutoRefresh
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            initializeDashboard();
            startAutoRefresh();
        }, 1000); // Small delay to ensure page is fully loaded
    });
} else {
    setTimeout(() => {
        initializeDashboard();
        startAutoRefresh();
    }, 1000);
}

console.log('✅ Admin Dashboard Fix loaded - will connect working APIs to UI'); 