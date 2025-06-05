// PUBLISHER MANAGER - Dedicated script for publisher functionality
console.log('🏢 Loading Publisher Manager...');

// Add immediate debugging
try {
    console.log('🔧 Publisher Manager: Starting execution...');
    
    // Publisher data and functions
    let selectedPublishers = new Set();
    let allPublishers = [];
    
    // Load publishers from localStorage on startup
    function loadPublishers() {
        try {
            const stored = localStorage.getItem('claim_connectors_publishers');
            if (stored) {
                allPublishers = JSON.parse(stored);
                console.log('📂 Loaded', allPublishers.length, 'publishers from localStorage');
            } else {
                console.log('📂 No stored publishers found, creating sample publishers');
                createSamplePublishers();
            }
        } catch (error) {
            console.error('❌ Error loading publishers from localStorage:', error);
            createSamplePublishers();
        }
    }

    // Create sample publishers that match the vendor codes in leads
    function createSamplePublishers() {
        const samplePublishers = [
            {
                id: 'pub_premium_legal',
                name: 'Premium Legal Leads LLC',
                email: 'contact@premiumlegalleads.com',
                vendorCode: 'PUB123456789',
                apiKey: 'api_premium_' + Math.random().toString(36).substr(2, 24),
                trackingId: 'TRK_PREMIUM01',
                status: 'active',
                leads: 0,
                highValueLeads: 0,
                revenue: 0,
                lastActivity: new Date().toISOString()
            },
            {
                id: 'pub_traffic_pros',
                name: 'Traffic Accident Pros',
                email: 'support@trafficaccidentpros.com',
                vendorCode: 'PUB987654321',
                apiKey: 'api_traffic_' + Math.random().toString(36).substr(2, 24),
                trackingId: 'TRK_TRAFFIC02',
                status: 'active',
                leads: 0,
                highValueLeads: 0,
                revenue: 0,
                lastActivity: new Date().toISOString()
            },
            {
                id: 'pub_accident_network',
                name: 'Accident Report Network',
                email: 'publishers@accidentreport.net',
                vendorCode: 'PUB555444333',
                apiKey: 'api_accident_' + Math.random().toString(36).substr(2, 24),
                trackingId: 'TRK_NETWORK03',
                status: 'active',
                leads: 0,
                highValueLeads: 0,
                revenue: 0,
                lastActivity: new Date().toISOString()
            }
        ];

        allPublishers = samplePublishers;
        savePublishers();
        console.log('📂 Created', allPublishers.length, 'sample publishers with matching vendor codes');
    }
    
    // Save publishers to localStorage
    function savePublishers() {
        try {
            localStorage.setItem('claim_connectors_publishers', JSON.stringify(allPublishers));
            console.log('💾 Saved', allPublishers.length, 'publishers to localStorage');
        } catch (error) {
            console.error('❌ Error saving publishers to localStorage:', error);
        }
    }
    
    console.log('🔧 Publisher Manager: Variables initialized');
    
    // Load existing publishers immediately
    loadPublishers();

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
    
    console.log('🔧 Publisher Manager: Helper functions defined');

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
    console.log('🔧 Publisher Manager: About to define handleCreatePublisher...');
    
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
            
            // Save to localStorage
            savePublishers();
            
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
    
    console.log('🔧 Publisher Manager: handleCreatePublisher function assigned to window');
    console.log('🔧 Function type:', typeof window.handleCreatePublisher);
    console.log('🔧 Function source preview:', window.handleCreatePublisher.toString().substring(0, 100) + '...');

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

SAMPLE PAYLOAD (Enhanced MVA Fields):
{
  "first_name": "John",
  "last_name": "Smith",
  "email": "john.smith@email.com",
  "phone_home": "(555) 123-4567",
  "state": "CA",
  "zip": "90210",
  "vendor_code": "${publisher.vendorCode}",
  "tracking_id": "${publisher.trackingId}",
  "leadip": "192.168.1.100",
  "source_url": "https://example.com/accident-form",
  "xselect4": "campaign_name",
  "posturl": "example.com",
  "consent": "1",
  "trustedform": "https://cert.trustedform.com/abc123def456",
  "additional_details": "Rear-ended at red light, neck and back pain",
  "estimated_medical_bills": "$25,000 - $50,000",
  "what_is_the_primary_injury": "Whiplash and back strain",
  "did_the_injured_person_receive_treatment": "Treated at a hospital",
  "are_you_currently_represented_by_a_lawyer_for_this_case": "No",
  "was_a_police_report_filed": "Yes",
  "_what_best_describes_the_type_of_accident_you_were_in": "Motor Vehicle Accident",
  "city_where_the_injury_occurred": "Los Angeles",
  "when_did_the_accident_happen": "Within the last year",
  "who_was_hurt_in_the_accident": "I was hurt",
  "lead_source": "paid",
  "provider_ip": "199.250.204.228"
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

        // Update publisher lead counts with real data
        updatePublisherLeadCounts();

        tbody.innerHTML = allPublishers.map(publisher => `
            <tr>
                <td><input type="checkbox" value="${publisher.id}" onchange="togglePublisherSelection('${publisher.id}', this.checked)"></td>
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
                <td>
                    <strong>${publisher.leads}</strong>
                    ${publisher.leads > 0 ? `<br><small class="text-muted">${publisher.highValueLeads || 0} high-value</small>` : ''}
                </td>
                <td>$${publisher.revenue.toLocaleString()}</td>
                <td>Just now</td>
                <td>
                    <button class="action-btn-sm view" onclick="viewPublisher('${publisher.id}')">👁️</button>
                    <button class="action-btn-sm edit" onclick="editPublisher('${publisher.id}')">✏️</button>
                    ${publisher.leads > 0 ? 
                        `<button class="action-btn-sm leads" onclick="viewPublisherLeads('${publisher.vendorCode}', '${publisher.name}')" title="View leads from this publisher">📋 Leads</button>` : 
                        `<button class="action-btn-sm leads disabled" title="No leads from this publisher yet">📋 No Leads</button>`
                    }
                    <button class="action-btn-sm pdf" onclick="downloadPublisherCredentials(${JSON.stringify(publisher).replace(/"/g, '&quot;')})" title="Download credentials">📄</button>
                    <button class="action-btn-sm delete" onclick="deletePublisher('${publisher.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        console.log('📊 Publishers table updated with', allPublishers.length, 'publishers');
        updateBulkActionsVisibility();
    }

    // Update publisher lead counts based on actual lead data
    function updatePublisherLeadCounts() {
        try {
            // Get leads from agent dashboard if available
            let allLeads = [];
            
            // Try to get leads from agent dashboard
            if (window.mockAvailableLeads) {
                allLeads = [...window.mockAvailableLeads];
            }
            if (window.mockMyLeads) {
                allLeads = allLeads.concat(window.mockMyLeads);
            }
            
            // Reset lead counts
            allPublishers.forEach(publisher => {
                publisher.leads = 0;
                publisher.highValueLeads = 0;
                publisher.revenue = 0;
            });
            
            // Count leads for each publisher
            allLeads.forEach(lead => {
                if (lead.vendor_code) {
                    const publisher = allPublishers.find(p => p.vendorCode === lead.vendor_code);
                    if (publisher) {
                        publisher.leads++;
                        
                        // Check if high-value lead
                        const isHighValue = lead.estimated_medical_bills && 
                                           (lead.estimated_medical_bills.includes('100,000') || 
                                            lead.estimated_medical_bills.includes('100000') ||
                                            lead.estimated_medical_bills.includes('More than'));
                        
                        if (isHighValue) {
                            publisher.highValueLeads++;
                            publisher.revenue += 2500; // High-value lead revenue
                        } else {
                            publisher.revenue += 500; // Standard lead revenue
                        }
                    }
                }
            });
            
            console.log('📊 Updated publisher lead counts from', allLeads.length, 'total leads');
            
        } catch (error) {
            console.error('Error updating publisher lead counts:', error);
        }
    }

    // View leads from a specific publisher
    window.viewPublisherLeads = function(vendorCode, publisherName) {
        try {
            console.log('📋 Viewing leads for publisher:', publisherName, 'with vendor code:', vendorCode);
            
            // Get all leads for this publisher
            let publisherLeads = [];
            
            if (window.mockAvailableLeads) {
                publisherLeads = publisherLeads.concat(
                    window.mockAvailableLeads.filter(lead => lead.vendor_code === vendorCode)
                );
            }
            if (window.mockMyLeads) {
                publisherLeads = publisherLeads.concat(
                    window.mockMyLeads.filter(lead => lead.vendor_code === vendorCode)
                );
            }
            
            if (publisherLeads.length === 0) {
                alert(`📋 No leads found for ${publisherName}\n\nVendor Code: ${vendorCode}\n\nThis publisher hasn't submitted any leads yet.`);
                return;
            }
            
            // Create detailed lead report
            const highValueCount = publisherLeads.filter(lead => 
                lead.estimated_medical_bills && 
                (lead.estimated_medical_bills.includes('100,000') || 
                 lead.estimated_medical_bills.includes('100000') ||
                 lead.estimated_medical_bills.includes('More than'))
            ).length;
            
            const totalRevenue = publisherLeads.reduce((sum, lead) => {
                const isHighValue = lead.estimated_medical_bills && 
                                   (lead.estimated_medical_bills.includes('100,000') || 
                                    lead.estimated_medical_bills.includes('100000') ||
                                    lead.estimated_medical_bills.includes('More than'));
                return sum + (isHighValue ? 2500 : 500);
            }, 0);
            
            const leadsList = publisherLeads.map(lead => 
                `• ${lead.name} - ${lead.type} (${lead.state}) - ${lead.estimated_medical_bills || 'Standard value'}`
            ).join('\n');
            
            const report = `📋 PUBLISHER LEADS REPORT
================================

Publisher: ${publisherName}
Vendor Code: ${vendorCode}

📊 STATISTICS:
• Total Leads: ${publisherLeads.length}
• High-Value Leads: ${highValueCount}
• Standard Leads: ${publisherLeads.length - highValueCount}
• Total Revenue: $${totalRevenue.toLocaleString()}

🏥 LEAD DETAILS:
${leadsList}

💡 ANALYSIS:
• High-Value Rate: ${Math.round((highValueCount / publisherLeads.length) * 100)}%
• Average Revenue per Lead: $${Math.round(totalRevenue / publisherLeads.length).toLocaleString()}
• Primary States: ${[...new Set(publisherLeads.map(l => l.state))].join(', ')}

Would you like to open the Agent Dashboard to view these leads in detail?`;
            
            if (confirm(report)) {
                // Open agent dashboard with publisher filter
                const agentUrl = `agent-aurora.html?publisher=${encodeURIComponent(vendorCode)}&name=${encodeURIComponent(publisherName)}`;
                window.open(agentUrl, '_blank');
            }
            
        } catch (error) {
            console.error('Error viewing publisher leads:', error);
            alert('Error loading publisher leads. Please try again.');
        }
    };

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
                savePublishers();
                renderPublishersTable();
                addActivityFeedItem(`📝 Publisher updated to "${newName}"`, 'info');
            }
        }
    };

    // Bulk Actions Management
    function togglePublisherSelection(id, checked) {
        if (checked) {
            selectedPublishers.add(id);
        } else {
            selectedPublishers.delete(id);
        }
        updateBulkActionsVisibility();
    }

    function updateBulkActionsVisibility() {
        const bulkBar = document.getElementById('bulk-publishers-actions');
        const count = document.getElementById('selected-publishers-count');
        
        if (bulkBar && count) {
            bulkBar.style.display = selectedPublishers.size > 0 ? 'flex' : 'none';
            count.textContent = selectedPublishers.size;
        }
    }

    // Real Bulk Actions Implementation
    window.bulkActivatePublishers = function() {
        const selectedIds = Array.from(selectedPublishers);
        if (selectedIds.length === 0) {
            alert('Please select publishers to activate');
            return;
        }
        
        if (confirm(`Activate ${selectedIds.length} selected publishers?`)) {
            selectedIds.forEach(id => {
                const publisher = allPublishers.find(p => p.id === id);
                if (publisher) {
                    publisher.status = 'active';
                }
            });
            
            savePublishers();
            renderPublishersTable();
            updatePublisherStats();
            selectedPublishers.clear();
            updateBulkActionsVisibility();
            addActivityFeedItem(`🟢 ${selectedIds.length} publishers activated`, 'success');
        }
    };

    window.bulkDeactivatePublishers = function() {
        const selectedIds = Array.from(selectedPublishers);
        if (selectedIds.length === 0) {
            alert('Please select publishers to deactivate');
            return;
        }
        
        if (confirm(`Deactivate ${selectedIds.length} selected publishers?`)) {
            selectedIds.forEach(id => {
                const publisher = allPublishers.find(p => p.id === id);
                if (publisher) {
                    publisher.status = 'inactive';
                }
            });
            
            savePublishers();
            renderPublishersTable();
            updatePublisherStats();
            selectedPublishers.clear();
            updateBulkActionsVisibility();
            addActivityFeedItem(`🔴 ${selectedIds.length} publishers deactivated`, 'warning');
        }
    };

    window.bulkDeletePublishers = function() {
        const selectedIds = Array.from(selectedPublishers);
        if (selectedIds.length === 0) {
            alert('Please select publishers to delete');
            return;
        }
        
        if (confirm(`⚠️ DELETE ${selectedIds.length} selected publishers?\n\nThis action cannot be undone!`)) {
            // Remove selected publishers from array
            allPublishers = allPublishers.filter(p => !selectedIds.includes(p.id));
            
            savePublishers();
            renderPublishersTable();
            updatePublisherStats();
            updatePublisherCount();
            selectedPublishers.clear();
            updateBulkActionsVisibility();
            addActivityFeedItem(`🗑️ ${selectedIds.length} publishers deleted`, 'warning');
        }
    };

    window.bulkDownloadCredentials = function() {
        const selectedIds = Array.from(selectedPublishers);
        if (selectedIds.length === 0) {
            alert('Please select publishers to download credentials');
            return;
        }
        
        // Download credentials for each selected publisher with delay
        selectedIds.forEach((id, index) => {
            const publisher = allPublishers.find(p => p.id === id);
            if (publisher) {
                setTimeout(() => {
                    downloadPublisherCredentials(publisher);
                }, index * 500); // 500ms delay between downloads
            }
        });
        
        addActivityFeedItem(`📄 ${selectedIds.length} credential files downloaded`, 'success');
    };

    // Select All functionality
    window.toggleSelectAllPublishers = function() {
        const selectAllCheckbox = document.getElementById('select-all-publishers');
        const allCheckboxes = document.querySelectorAll('#publishers-table-body input[type="checkbox"]');
        
        if (selectAllCheckbox && selectAllCheckbox.checked) {
            // Select all
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
                selectedPublishers.add(checkbox.value);
            });
        } else {
            // Deselect all
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                selectedPublishers.delete(checkbox.value);
            });
        }
        
        updateBulkActionsVisibility();
    };

    // Delete individual publisher
    window.deletePublisher = function(id) {
        const publisher = allPublishers.find(p => p.id === id);
        if (publisher && confirm(`Delete publisher "${publisher.name}"?\n\nThis action cannot be undone!`)) {
            allPublishers = allPublishers.filter(p => p.id !== id);
            savePublishers();
            renderPublishersTable();
            updatePublisherStats();
            updatePublisherCount();
            addActivityFeedItem(`🗑️ Publisher "${publisher.name}" deleted`, 'warning');
        }
    };

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            console.log('🏢 Publisher Manager initializing...');
            
            // First load existing publishers from localStorage
            loadPublishers();
            
            // Then update the displays
            renderPublishersTable();
            updatePublisherStats();
            updatePublisherCount();
            
            console.log('🏢 Publisher Manager initialized with', allPublishers.length, 'publishers');
            
            // Confirm function is available
            console.log('✅ handleCreatePublisher available:', typeof window.handleCreatePublisher);
            console.log('✅ Function is DEDICATED version:', window.handleCreatePublisher.toString().includes('DEDICATED'));
        }, 500);
    });

    // === ALL LEADS MANAGEMENT FUNCTIONALITY ===
    
    let selectedLeads = new Set();
    let allLeadsData = [];
    let filteredLeadsData = [];

    // Get all leads from agent dashboard data
    function getAllLeadsData() {
        try {
            let allLeads = [];
            
            // Get leads from agent dashboard if available
            if (window.mockAvailableLeads) {
                allLeads = allLeads.concat(window.mockAvailableLeads.map(lead => ({
                    ...lead,
                    leadStatus: 'available',
                    receivedDate: new Date().toISOString().split('T')[0]
                })));
            }
            if (window.mockMyLeads) {
                allLeads = allLeads.concat(window.mockMyLeads.map(lead => ({
                    ...lead,
                    leadStatus: lead.status || 'claimed',
                    receivedDate: lead.claimedDate || new Date().toISOString().split('T')[0]
                })));
            }
            
            return allLeads;
            
        } catch (error) {
            console.error('Error getting all leads data:', error);
            return [];
        }
    }

    // Show all leads management section
    window.viewAllLeads = function() {
        try {
            console.log('📋 Opening All Leads Management...');
            
            // Hide other sections
            const publisherSection = document.querySelector('.publisher-management');
            if (publisherSection) publisherSection.style.display = 'none';
            
            // Show all leads section
            const allLeadsSection = document.getElementById('all-leads-section');
            if (allLeadsSection) {
                allLeadsSection.style.display = 'block';
                
                // Scroll to section
                allLeadsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Load and render leads
                loadAllLeadsData();
                renderAllLeadsTable();
                updateAllLeadsStats();
                setupLeadFilters();
                
                console.log('✅ All Leads Management opened');
            }
            
        } catch (error) {
            console.error('Error opening all leads management:', error);
            alert('Error opening leads management. Please try again.');
        }
    };

    // Hide all leads management section
    window.hideAllLeads = function() {
        try {
            // Hide all leads section
            const allLeadsSection = document.getElementById('all-leads-section');
            if (allLeadsSection) allLeadsSection.style.display = 'none';
            
            // Show publisher section
            const publisherSection = document.querySelector('.publisher-management');
            if (publisherSection) publisherSection.style.display = 'block';
            
            console.log('📋 All Leads Management closed');
            
        } catch (error) {
            console.error('Error hiding all leads management:', error);
        }
    };

    // Load all leads data
    function loadAllLeadsData() {
        try {
            allLeadsData = getAllLeadsData();
            filteredLeadsData = [...allLeadsData];
            
            console.log('📊 Loaded', allLeadsData.length, 'total leads for admin view');
            
        } catch (error) {
            console.error('Error loading all leads data:', error);
        }
    }

    // Render all leads table
    function renderAllLeadsTable() {
        try {
            const tbody = document.getElementById('all-leads-table-body');
            if (!tbody) return;

            if (filteredLeadsData.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                            <div>
                                <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                                <div>No leads found</div>
                                <div style="font-size: 0.875rem; margin-top: 0.5rem;">Try adjusting your filters or refresh the data</div>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = filteredLeadsData.map(lead => {
                const isHighValue = lead.estimated_medical_bills && 
                                   (lead.estimated_medical_bills.includes('100,000') || 
                                    lead.estimated_medical_bills.includes('100000') ||
                                    lead.estimated_medical_bills.includes('More than'));
                
                const statusBadgeClass = {
                    'available': 'success',
                    'claimed': 'warning', 
                    'contacted': 'info',
                    'retained': 'success'
                }[lead.leadStatus] || 'secondary';

                return `
                    <tr>
                        <td><input type="checkbox" value="${lead.id}" onchange="toggleLeadSelection('${lead.id}', this.checked)"></td>
                        <td>
                            <div class="publisher-info">
                                <div class="publisher-name">${lead.name}</div>
                                <div class="publisher-email">${lead.email}</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                                    📞 ${lead.phone} • 📧 ${lead.email}
                                </div>
                            </div>
                        </td>
                        <td>
                            <div style="font-size: 0.875rem;">
                                <div style="font-weight: 600;">${lead.publisher_name || 'Unknown Publisher'}</div>
                                <div class="vendor-code" style="margin-top: 0.25rem;">${lead.vendor_code || 'N/A'}</div>
                            </div>
                        </td>
                        <td>
                            <div style="font-weight: ${isHighValue ? 'bold' : 'normal'}; color: ${isHighValue ? '#22c55e' : 'inherit'};">
                                ${lead.estimated_medical_bills || 'Not specified'}
                            </div>
                            ${isHighValue ? '<div style="font-size: 0.75rem; color: #22c55e;">💰 High-Value</div>' : ''}
                        </td>
                        <td>${lead.what_is_the_primary_injury || 'Not specified'}</td>
                        <td><span class="status-badge ${statusBadgeClass}">${lead.leadStatus.toUpperCase()}</span></td>
                        <td><strong>${lead.state}</strong></td>
                        <td>${lead.incidentDate || 'Not provided'}</td>
                        <td>${lead.receivedDate || 'Unknown'}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn-sm view" onclick="viewLeadDetailsAdmin('${lead.id}')" title="View lead details">👁️</button>
                                <button class="action-btn-sm edit" onclick="assignLeadToAgent('${lead.id}')" title="Assign to agent">👤</button>
                                <button class="action-btn-sm api" onclick="viewLeadSource('${lead.id}')" title="View source info">🌐</button>
                                <button class="action-btn-sm delete" onclick="deleteLeadAdmin('${lead.id}')" title="Delete lead">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            console.log('📊 Rendered', filteredLeadsData.length, 'leads in admin table');
            
        } catch (error) {
            console.error('Error rendering all leads table:', error);
        }
    }

    // Update all leads statistics
    function updateAllLeadsStats() {
        try {
            const totalLeads = allLeadsData.length;
            const highValueLeads = allLeadsData.filter(lead => 
                lead.estimated_medical_bills && 
                (lead.estimated_medical_bills.includes('100,000') || 
                 lead.estimated_medical_bills.includes('100000') ||
                 lead.estimated_medical_bills.includes('More than'))
            ).length;
            const availableLeads = allLeadsData.filter(lead => lead.leadStatus === 'available').length;
            const claimedLeads = allLeadsData.filter(lead => lead.leadStatus !== 'available').length;

            // Update UI elements
            const elements = {
                'all-leads-count': `${totalLeads} leads`,
                'total-all-leads': totalLeads,
                'high-value-leads': highValueLeads,
                'available-leads-count': availableLeads,
                'claimed-leads-count': claimedLeads
            };

            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });

            console.log('📊 Updated all leads stats:', elements);
            
        } catch (error) {
            console.error('Error updating all leads stats:', error);
        }
    }

    // Setup lead filtering
    function setupLeadFilters() {
        try {
            const filterElements = ['lead-search', 'lead-publisher-filter', 'lead-status-filter', 'lead-value-filter', 'lead-sort'];
            
            filterElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', applyLeadFilters);
                    element.addEventListener('input', applyLeadFilters);
                }
            });
            
            console.log('🔧 Lead filters setup complete');
            
        } catch (error) {
            console.error('Error setting up lead filters:', error);
        }
    }

    // Apply lead filters
    function applyLeadFilters() {
        try {
            let filtered = [...allLeadsData];
            
            // Search filter
            const searchTerm = document.getElementById('lead-search')?.value.toLowerCase() || '';
            if (searchTerm) {
                filtered = filtered.filter(lead => {
                    const searchText = [
                        lead.name, lead.email, lead.phone, lead.description,
                        lead.publisher_name, lead.vendor_code, lead.state
                    ].join(' ').toLowerCase();
                    return searchText.includes(searchTerm);
                });
            }

            // Publisher filter
            const publisherFilter = document.getElementById('lead-publisher-filter')?.value || '';
            if (publisherFilter) {
                filtered = filtered.filter(lead => lead.vendor_code === publisherFilter);
            }

            // Status filter
            const statusFilter = document.getElementById('lead-status-filter')?.value || '';
            if (statusFilter) {
                filtered = filtered.filter(lead => lead.leadStatus === statusFilter);
            }

            // Value filter
            const valueFilter = document.getElementById('lead-value-filter')?.value || '';
            if (valueFilter) {
                filtered = filtered.filter(lead => {
                    const bills = lead.estimated_medical_bills || '';
                    switch (valueFilter) {
                        case 'high':
                            return bills.includes('100,000') || bills.includes('100000') || bills.includes('More than');
                        case 'medium':
                            return (bills.includes('10,000') || bills.includes('50,000')) && 
                                   !bills.includes('100,000') && !bills.includes('More than');
                        case 'low':
                            return bills.includes('5,000') || bills.includes('under') || bills.includes('less');
                        default:
                            return true;
                    }
                });
            }

            // Sort
            const sortBy = document.getElementById('lead-sort')?.value || 'newest';
            filtered.sort((a, b) => {
                switch (sortBy) {
                    case 'oldest':
                        return new Date(a.receivedDate) - new Date(b.receivedDate);
                    case 'value':
                        const aValue = a.estimated_medical_bills || '';
                        const bValue = b.estimated_medical_bills || '';
                        const aHigh = aValue.includes('100,000') || aValue.includes('More than');
                        const bHigh = bValue.includes('100,000') || bValue.includes('More than');
                        return bHigh - aHigh;
                    case 'publisher':
                        return (a.publisher_name || '').localeCompare(b.publisher_name || '');
                    case 'state':
                        return (a.state || '').localeCompare(b.state || '');
                    default: // newest
                        return new Date(b.receivedDate) - new Date(a.receivedDate);
                }
            });

            filteredLeadsData = filtered;
            renderAllLeadsTable();
            
            console.log(`🔍 Applied filters: ${filtered.length}/${allLeadsData.length} leads shown`);
            
        } catch (error) {
            console.error('Error applying lead filters:', error);
        }
    }

    // Lead selection management
    function toggleLeadSelection(leadId, checked) {
        if (checked) {
            selectedLeads.add(leadId);
        } else {
            selectedLeads.delete(leadId);
        }
        updateLeadBulkActionsVisibility();
    }

    window.toggleSelectAllLeads = function() {
        const selectAllCheckbox = document.getElementById('select-all-leads');
        const allCheckboxes = document.querySelectorAll('#all-leads-table-body input[type="checkbox"]');
        
        if (selectAllCheckbox && selectAllCheckbox.checked) {
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
                selectedLeads.add(checkbox.value);
            });
        } else {
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                selectedLeads.delete(checkbox.value);
            });
        }
        
        updateLeadBulkActionsVisibility();
    };

    function updateLeadBulkActionsVisibility() {
        const bulkBar = document.getElementById('bulk-leads-actions');
        const count = document.getElementById('selected-leads-count');
        
        if (bulkBar && count) {
            bulkBar.style.display = selectedLeads.size > 0 ? 'flex' : 'none';
            count.textContent = selectedLeads.size;
        }
    }

    // Lead action functions
    window.viewLeadDetailsAdmin = function(leadId) {
        const lead = allLeadsData.find(l => l.id === leadId);
        if (lead) {
            const details = `
📋 LEAD DETAILS - ADMIN VIEW
===============================

👤 CONTACT INFORMATION:
• Name: ${lead.name}
• Email: ${lead.email}
• Phone: ${lead.phone}
• State: ${lead.state}

🏢 PUBLISHER INFORMATION:
• Publisher: ${lead.publisher_name || 'Unknown'}
• Vendor Code: ${lead.vendor_code || 'N/A'}
• Source: ${lead.xselect4 || 'Not specified'}

🏥 CASE INFORMATION:
• Type: ${lead.type}
• Incident Date: ${lead.incidentDate || 'Not provided'}
• Medical Bills: ${lead.estimated_medical_bills || 'Not specified'}
• Primary Injury: ${lead.what_is_the_primary_injury || 'Not specified'}
• Treatment: ${lead.did_the_injured_person_receive_treatment || 'Not specified'}

⚖️ LEGAL STATUS:
• Has Lawyer: ${lead.are_you_currently_represented_by_a_lawyer_for_this_case || 'Not specified'}
• Police Report: ${lead.was_a_police_report_filed || 'Not specified'}

📊 SYSTEM INFORMATION:
• Status: ${lead.leadStatus}
• Received: ${lead.receivedDate}
• Lead ID: ${lead.id}

🔗 COMPLIANCE:
• TrustedForm: ${lead.trustedform_url ? '✅ Verified' : '❌ Not verified'}
• Consent: ${lead.consent === '1' ? '✅ Provided' : '❌ Not provided'}

📝 DESCRIPTION:
${lead.description || lead.additional_details || 'No additional details provided'}

Would you like to assign this lead to an agent or take other actions?
            `;
            
            if (confirm(details)) {
                assignLeadToAgent(leadId);
            }
        }
    };

    window.assignLeadToAgent = function(leadId) {
        const agentName = prompt('Enter agent name or email to assign this lead:');
        if (agentName && agentName.trim()) {
            alert(`✅ Lead assigned to ${agentName}\n\nThe agent will be notified and can access the lead in their dashboard.`);
            
            // Update lead status
            const lead = allLeadsData.find(l => l.id === leadId);
            if (lead) {
                lead.leadStatus = 'assigned';
                lead.assignedAgent = agentName.trim();
                renderAllLeadsTable();
                updateAllLeadsStats();
            }
        }
    };

    window.viewLeadSource = function(leadId) {
        const lead = allLeadsData.find(l => l.id === leadId);
        if (lead) {
            const sourceInfo = `
🌐 LEAD SOURCE INFORMATION
===========================

📊 Source Details:
• Campaign: ${lead.xselect4 || 'Not specified'}
• Source URL: ${lead.source_url || 'Not provided'}
• Referrer: ${lead.truncated_url || 'Not captured'}
• Lead IP: ${lead.leadip || 'Not captured'}

🏢 Publisher Details:
• Publisher: ${lead.publisher_name || 'Unknown'}
• Vendor Code: ${lead.vendor_code || 'N/A'}
• Tracking ID: ${lead.trackingId || 'Not assigned'}

✅ Compliance Verification:
• TrustedForm URL: ${lead.trustedform_url || 'Not provided'}
• Consent Status: ${lead.consent === '1' ? 'Verified' : 'Not verified'}
• Form ID: ${lead.form_id || 'Not captured'}

📅 Timing Information:
• Received: ${lead.receivedDate}
• Insert Time: ${lead.inserttime || 'Not recorded'}
• Processing: ${lead.processed === 't' ? 'Processed' : 'Pending'}
            `;
            
            alert(sourceInfo);
        }
    };

    window.deleteLeadAdmin = function(leadId) {
        const lead = allLeadsData.find(l => l.id === leadId);
        if (lead && confirm(`⚠️ DELETE LEAD?\n\nThis will permanently delete:\n• ${lead.name}\n• ${lead.email}\n• ${lead.phone}\n\nThis action cannot be undone!`)) {
            // Remove from data arrays
            allLeadsData = allLeadsData.filter(l => l.id !== leadId);
            filteredLeadsData = filteredLeadsData.filter(l => l.id !== leadId);
            
            // Remove from agent data if available
            if (window.mockAvailableLeads) {
                window.mockAvailableLeads = window.mockAvailableLeads.filter(l => l.id !== leadId);
            }
            if (window.mockMyLeads) {
                window.mockMyLeads = window.mockMyLeads.filter(l => l.id !== leadId);
            }
            
            renderAllLeadsTable();
            updateAllLeadsStats();
            
            // Update publisher counts
            updatePublisherLeadCounts();
            renderPublishersTable();
            updatePublisherStats();
            
            alert(`🗑️ Lead deleted: ${lead.name}`);
        }
    };

    // Bulk actions for leads
    window.bulkAssignLeads = function() {
        const selectedIds = Array.from(selectedLeads);
        if (selectedIds.length === 0) {
            alert('Please select leads to assign');
            return;
        }
        
        const agentName = prompt(`Enter agent name to assign ${selectedIds.length} selected leads:`);
        if (agentName && agentName.trim()) {
            selectedIds.forEach(id => {
                const lead = allLeadsData.find(l => l.id === id);
                if (lead) {
                    lead.leadStatus = 'assigned';
                    lead.assignedAgent = agentName.trim();
                }
            });
            
            selectedLeads.clear();
            updateLeadBulkActionsVisibility();
            renderAllLeadsTable();
            updateAllLeadsStats();
            
            alert(`✅ ${selectedIds.length} leads assigned to ${agentName}`);
        }
    };

    window.bulkExportLeads = function() {
        const selectedIds = Array.from(selectedLeads);
        if (selectedIds.length === 0) {
            alert('Please select leads to export');
            return;
        }
        
        const selectedLeadsData = allLeadsData.filter(l => selectedIds.includes(l.id));
        exportLeadsToCSV(selectedLeadsData, 'selected_leads');
        
        alert(`📊 Exported ${selectedIds.length} selected leads to CSV`);
    };

    window.bulkMarkContacted = function() {
        const selectedIds = Array.from(selectedLeads);
        if (selectedIds.length === 0) {
            alert('Please select leads to mark as contacted');
            return;
        }
        
        selectedIds.forEach(id => {
            const lead = allLeadsData.find(l => l.id === id);
            if (lead) {
                lead.leadStatus = 'contacted';
                lead.lastContact = new Date().toISOString().split('T')[0];
            }
        });
        
        selectedLeads.clear();
        updateLeadBulkActionsVisibility();
        renderAllLeadsTable();
        updateAllLeadsStats();
        
        alert(`📞 ${selectedIds.length} leads marked as contacted`);
    };

    window.bulkDeleteLeads = function() {
        const selectedIds = Array.from(selectedLeads);
        if (selectedIds.length === 0) {
            alert('Please select leads to delete');
            return;
        }
        
        if (confirm(`⚠️ DELETE ${selectedIds.length} LEADS?\n\nThis action cannot be undone!`)) {
            // Remove from all data arrays
            allLeadsData = allLeadsData.filter(l => !selectedIds.includes(l.id));
            filteredLeadsData = filteredLeadsData.filter(l => !selectedIds.includes(l.id));
            
            // Remove from agent data if available
            if (window.mockAvailableLeads) {
                window.mockAvailableLeads = window.mockAvailableLeads.filter(l => !selectedIds.includes(l.id));
            }
            if (window.mockMyLeads) {
                window.mockMyLeads = window.mockMyLeads.filter(l => !selectedIds.includes(l.id));
            }
            
            selectedLeads.clear();
            updateLeadBulkActionsVisibility();
            renderAllLeadsTable();
            updateAllLeadsStats();
            
            // Update publisher counts
            updatePublisherLeadCounts();
            renderPublishersTable();
            updatePublisherStats();
            
            alert(`🗑️ ${selectedIds.length} leads deleted`);
        }
    };

    // Export functions
    window.refreshAllLeads = function() {
        try {
            loadAllLeadsData();
            renderAllLeadsTable();
            updateAllLeadsStats();
            alert('🔄 All leads data refreshed');
        } catch (error) {
            console.error('Error refreshing all leads:', error);
            alert('Error refreshing leads data');
        }
    };

    window.exportAllLeads = function() {
        try {
            exportLeadsToCSV(filteredLeadsData, 'all_leads_export');
            alert(`📊 Exported ${filteredLeadsData.length} leads to CSV`);
        } catch (error) {
            console.error('Error exporting all leads:', error);
            alert('Error exporting leads data');
        }
    };

    // CSV export utility
    function exportLeadsToCSV(leadsData, filename) {
        try {
            const headers = [
                'Lead ID', 'Name', 'Email', 'Phone', 'State', 'Type', 'Status',
                'Publisher', 'Vendor Code', 'Medical Bills', 'Primary Injury',
                'Treatment Received', 'Has Lawyer', 'Police Report', 'Incident Date',
                'Received Date', 'Source Campaign', 'Source URL', 'TrustedForm',
                'Consent', 'Description'
            ];
            
            const csvContent = [
                headers.join(','),
                ...leadsData.map(lead => [
                    lead.id,
                    `"${lead.name || ''}"`,
                    `"${lead.email || ''}"`,
                    `"${lead.phone || ''}"`,
                    `"${lead.state || ''}"`,
                    `"${lead.type || ''}"`,
                    `"${lead.leadStatus || ''}"`,
                    `"${lead.publisher_name || ''}"`,
                    `"${lead.vendor_code || ''}"`,
                    `"${lead.estimated_medical_bills || ''}"`,
                    `"${lead.what_is_the_primary_injury || ''}"`,
                    `"${lead.did_the_injured_person_receive_treatment || ''}"`,
                    `"${lead.are_you_currently_represented_by_a_lawyer_for_this_case || ''}"`,
                    `"${lead.was_a_police_report_filed || ''}"`,
                    `"${lead.incidentDate || ''}"`,
                    `"${lead.receivedDate || ''}"`,
                    `"${lead.xselect4 || ''}"`,
                    `"${lead.source_url || ''}"`,
                    `"${lead.trustedform_url ? 'Verified' : 'Not verified'}"`,
                    `"${lead.consent === '1' ? 'Yes' : 'No'}"`,
                    `"${(lead.description || lead.additional_details || '').replace(/"/g, '""')}"`
                ].join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('📊 CSV exported:', filename);
            
        } catch (error) {
            console.error('Error exporting CSV:', error);
        }
    }

    console.log('🏢 Publisher Manager loaded successfully');
    console.log('📋 All Leads Management functionality added');
    console.log('🔧 Final check - handleCreatePublisher type:', typeof window.handleCreatePublisher);
    
} catch (error) {
    console.error('❌ Error initializing Publisher Manager:', error);
    alert('Error initializing Publisher Manager: ' + error.message);
} 