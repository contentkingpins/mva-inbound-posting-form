// Configuration
const API_ENDPOINT = 'https://nv01uveape.execute-api.us-east-1.amazonaws.com/prod/leads';
const REFRESH_INTERVAL = 10000; // 10 seconds

// DOM Elements
const vendorFilter = document.getElementById('vendor-filter');
const refreshBtn = document.getElementById('refresh-btn');
const autoRefreshCb = document.getElementById('auto-refresh');
const leadsTable = document.getElementById('leads-table');
const leadsBody = document.getElementById('leads-body');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const noDataEl = document.getElementById('no-data');

// State
let leads = [];
let vendorCodes = new Set();
let refreshTimer = null;
let expandedLeadId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchLeads();
    
    // Event Listeners
    refreshBtn.addEventListener('click', fetchLeads);
    vendorFilter.addEventListener('change', filterLeads);
    autoRefreshCb.addEventListener('change', toggleAutoRefresh);
});

// Toggle auto-refresh functionality
function toggleAutoRefresh() {
    if (autoRefreshCb.checked) {
        refreshTimer = setInterval(fetchLeads, REFRESH_INTERVAL);
    } else {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }
}

// Fetch leads from API
async function fetchLeads() {
    showLoading(true);
    hideError();
    
    try {
        // Get the selected vendor code
        const vendorCode = vendorFilter.value;
        
        // Build the URL with query params if needed
        let url = API_ENDPOINT;
        if (vendorCode) {
            url += `?vendor_code=${vendorCode}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors'  // Explicitly state CORS mode for Amplify hosting
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        leads = await response.json();
        
        // Update vendor dropdown options
        updateVendorOptions();
        
        // Render the data
        renderLeads();
        
    } catch (error) {
        console.error('Error fetching leads:', error);
        showError('Failed to fetch leads. Please check your API endpoint and try again.');
    } finally {
        showLoading(false);
    }
}

// Update vendor filter options
function updateVendorOptions() {
    // Extract unique vendor codes
    const newVendorCodes = new Set();
    leads.forEach(lead => {
        if (lead.vendor_code) {
            newVendorCodes.add(lead.vendor_code);
        }
    });
    
    // Skip if no changes to vendor codes
    if (arraysEqual(Array.from(vendorCodes), Array.from(newVendorCodes))) {
        return;
    }
    
    // Update state
    vendorCodes = newVendorCodes;
    
    // Save current selection
    const currentSelection = vendorFilter.value;
    
    // Clear existing options except the first one
    while (vendorFilter.options.length > 1) {
        vendorFilter.remove(1);
    }
    
    // Add vendor options
    Array.from(vendorCodes).sort().forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = code;
        vendorFilter.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (currentSelection && vendorCodes.has(currentSelection)) {
        vendorFilter.value = currentSelection;
    }
}

// Filter leads based on vendor selection
function filterLeads() {
    fetchLeads();
}

// Render leads table
function renderLeads() {
    // Clear existing rows
    leadsBody.innerHTML = '';
    
    if (leads.length === 0) {
        leadsTable.style.display = 'none';
        noDataEl.style.display = 'block';
        return;
    }
    
    leadsTable.style.display = 'table';
    noDataEl.style.display = 'none';
    
    // Add rows for each lead
    leads.forEach(lead => {
        // Create main row
        const row = document.createElement('tr');
        row.className = 'lead-row';
        row.dataset.leadId = lead.lead_id;
        
        if (lead.lead_id === expandedLeadId) {
            row.classList.add('expanded');
        }
        
        // Add cells for each column
        row.innerHTML = `
            <td>${escapeHtml(lead.first_name || '')}</td>
            <td>${escapeHtml(lead.last_name || '')}</td>
            <td>${escapeHtml(lead.phone_home || '')}</td>
            <td>${escapeHtml(lead.email || '')}</td>
            <td>${escapeHtml(getLocationDisplay(lead) || '')}</td>
            <td>${escapeHtml(lead.vendor_code || '')}</td>
            <td>${formatDate(lead.timestamp)}</td>
        `;
        
        // Add click handler
        row.addEventListener('click', () => toggleLeadDetails(lead));
        
        leadsBody.appendChild(row);
        
        // If this lead is expanded, add the detail row
        if (lead.lead_id === expandedLeadId) {
            addDetailRow(lead);
        }
    });
}

// Add detail row for a lead
function addDetailRow(lead) {
    const detailRow = document.createElement('tr');
    detailRow.className = 'detail-row';
    detailRow.id = `detail-${lead.lead_id}`;
    
    const detailCell = document.createElement('td');
    detailCell.colSpan = 7;
    
    const detailContent = document.createElement('div');
    detailContent.className = 'detail-content';
    
    // Add all lead details
    const fields = [
        { label: 'Lead ID', value: lead.lead_id },
        { label: 'First Name', value: lead.first_name },
        { label: 'Last Name', value: lead.last_name },
        { label: 'Phone Home', value: lead.phone_home },
        { label: 'LP Caller ID', value: lead.lp_caller_id },
        { label: 'Email', value: lead.email },
        { label: 'Zip Code', value: lead.zip_code || 'N/A' },
        { label: 'State', value: lead.state || 'N/A' },
        { label: 'Vendor Code', value: lead.vendor_code },
        { label: 'Timestamp', value: formatDate(lead.timestamp, true) }
    ];
    
    fields.forEach(field => {
        const detailItem = document.createElement('div');
        detailItem.className = 'detail-item';
        
        detailItem.innerHTML = `
            <div class="detail-label">${field.label}</div>
            <div class="detail-value">${escapeHtml(field.value)}</div>
        `;
        
        detailContent.appendChild(detailItem);
    });
    
    detailCell.appendChild(detailContent);
    detailRow.appendChild(detailCell);
    
    // Find the row after which to insert the detail row
    const leadRow = document.querySelector(`tr[data-lead-id="${lead.lead_id}"]`);
    if (leadRow) {
        leadRow.parentNode.insertBefore(detailRow, leadRow.nextSibling);
    }
}

// Toggle lead details expansion
function toggleLeadDetails(lead) {
    const leadId = lead.lead_id;
    const detailRow = document.getElementById(`detail-${leadId}`);
    const leadRow = document.querySelector(`tr[data-lead-id="${leadId}"]`);
    
    if (detailRow) {
        // Detail row exists, remove it
        detailRow.remove();
        leadRow.classList.remove('expanded');
        expandedLeadId = null;
    } else {
        // Remove any existing expanded row
        const existingDetailRow = document.querySelector('.detail-row');
        if (existingDetailRow) {
            existingDetailRow.remove();
            document.querySelector('tr.expanded').classList.remove('expanded');
        }
        
        // Add the new detail row
        leadRow.classList.add('expanded');
        expandedLeadId = leadId;
        addDetailRow(lead);
    }
}

// Show error notification
function showError(message, isDuplicate = false) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Add special styling for duplicate errors
    if (isDuplicate) {
        errorEl.classList.add('duplicate-error');
    } else {
        errorEl.classList.remove('duplicate-error');
    }
}

// Hide error
function hideError() {
    errorEl.style.display = 'none';
    errorEl.classList.remove('duplicate-error');
}

// Handle lead submission response
function handleLeadSubmissionResponse(response, data) {
    if (response.ok) {
        return response.json().then(result => {
            return { success: true, data: result };
        });
    } else {
        // Check for duplicate lead (409 Conflict)
        if (response.status === 409) {
            return response.json().then(error => {
                return { 
                    success: false, 
                    isDuplicate: true, 
                    message: error.message || 'Duplicate lead detected'
                };
            });
        }
        
        // Handle other errors
        return response.json().then(error => {
            return { 
                success: false, 
                message: error.message || `HTTP error ${response.status}`
            };
        }).catch(() => {
            return { 
                success: false, 
                message: `HTTP error ${response.status}`
            };
        });
    }
}

// Submit lead (example for any lead submission form you might add to the dashboard)
async function submitLead(leadData) {
    showLoading(true);
    hideError();
    
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-api-key': leadData.api_key // Include API key if required
            },
            body: JSON.stringify(leadData),
            mode: 'cors'
        });
        
        const result = await handleLeadSubmissionResponse(response, leadData);
        
        if (result.success) {
            // Successfully submitted
            alert("Lead successfully submitted!");
            // Reset form or take other success actions
            return true;
        } else {
            // Handle error
            if (result.isDuplicate) {
                showError(result.message, true);
            } else {
                showError(result.message);
            }
            return false;
        }
    } catch (error) {
        console.error('Error submitting lead:', error);
        showError('Network error while submitting lead. Please try again.');
        return false;
    } finally {
        showLoading(false);
    }
}

// Helper functions
function showLoading(show) {
    loadingEl.style.display = show ? 'block' : 'none';
}

function getLocationDisplay(lead) {
    if (lead.zip_code && lead.state) {
        return `${lead.state}, ${lead.zip_code}`;
    } else if (lead.state) {
        return lead.state;
    } else if (lead.zip_code) {
        return lead.zip_code;
    }
    return 'N/A';
}

function formatDate(dateString, includeTime = false) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        
        if (isNaN(date)) {
            return dateString;
        }
        
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.second = '2-digit';
        }
        
        return date.toLocaleDateString(undefined, options);
    } catch (e) {
        return dateString;
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
} 