/**
 * Publisher Creator Fix - Direct API Call
 * Bypasses CORS issues by using a simpler approach
 */

async function createPublisherDirect(publisherData) {
    console.log('🚀 Creating publisher directly...', publisherData);
    
    const API_BASE = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
    const token = localStorage.getItem('auth_token') || localStorage.getItem('idToken');
    
    if (!token) {
        throw new Error('No authentication token found');
    }
    
    try {
        // Use XMLHttpRequest instead of fetch to bypass some CORS issues
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE}/vendors`, true);
            
            // Set headers
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.setRequestHeader('Origin', 'https://main.d21xta9fg9b6w.amplifyapp.com');
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    console.log('📡 Publisher creation response:', xhr.status, xhr.responseText);
                    
                    if (xhr.status === 200 || xhr.status === 201) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (e) {
                            resolve({ success: true, message: 'Publisher created successfully' });
                        }
                    } else {
                        const errorText = xhr.responseText || `HTTP ${xhr.status}`;
                        reject(new Error(`Failed to create publisher: ${errorText}`));
                    }
                }
            };
            
            xhr.onerror = function() {
                reject(new Error('Network error during publisher creation'));
            };
            
            // Send the request
            xhr.send(JSON.stringify(publisherData));
        });
        
    } catch (error) {
        console.error('❌ Error creating publisher:', error);
        throw error;
    }
}

// Generate unique vendor code
function generateVendorCode() {
    const prefix = 'PUB';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

// Generate API key
function generateApiKey() {
    const prefix = 'api_';
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Enhanced publisher creation with form integration
function setupPublisherCreationFix() {
    console.log('🔧 Setting up publisher creation fix...');
    
    // Override the existing handleCreatePublisher function
    window.handleCreatePublisher = async function() {
        console.log('🏢 Creating publisher with direct API call...');
        
        try {
            // Get form data
            const name = document.getElementById('new-publisher-name')?.value?.trim();
            const email = document.getElementById('new-publisher-email')?.value?.trim();
            const status = document.getElementById('new-publisher-status')?.value || 'active';
            
            if (!name || !email) {
                alert('Please fill in both Publisher Name and Contact Email');
                return;
            }
            
            // Auto-generate codes if not provided
            const vendorCode = document.getElementById('new-publisher-code')?.value || generateVendorCode();
            const apiKey = document.getElementById('new-publisher-api-key')?.value || generateApiKey();
            
            // Update form with generated values
            if (document.getElementById('new-publisher-code')) {
                document.getElementById('new-publisher-code').value = vendorCode;
            }
            if (document.getElementById('new-publisher-api-key')) {
                document.getElementById('new-publisher-api-key').value = apiKey;
            }
            
            const publisherData = {
                name: name,
                email: email,
                vendor_code: vendorCode,
                api_key: apiKey,
                status: status
            };
            
            console.log('📊 Publisher data:', publisherData);
            
            // Show loading state
            const createBtn = document.querySelector('#add-publisher-modal .btn-primary');
            if (createBtn) {
                createBtn.disabled = true;
                createBtn.textContent = 'Creating...';
            }
            
            // Create publisher using direct API call
            const result = await createPublisherDirect(publisherData);
            
            console.log('✅ Publisher created successfully:', result);
            
            // Show success message
            alert(`Publisher "${name}" created successfully!\n\nVendor Code: ${vendorCode}\nAPI Key: ${apiKey}`);
            
            // Close modal
            if (window.closeModal) {
                window.closeModal('add-publisher-modal');
            }
            
            // Clear form
            if (document.getElementById('new-publisher-name')) {
                document.getElementById('new-publisher-name').value = '';
            }
            if (document.getElementById('new-publisher-email')) {
                document.getElementById('new-publisher-email').value = '';
            }
            
            // Reload publishers list
            if (window.adminDashboard && window.adminDashboard.loadVendors) {
                setTimeout(() => {
                    window.adminDashboard.loadVendors();
                }, 1000);
            }
            
        } catch (error) {
            console.error('❌ Publisher creation failed:', error);
            alert(`Failed to create publisher: ${error.message}`);
        } finally {
            // Reset button state
            const createBtn = document.querySelector('#add-publisher-modal .btn-primary');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = 'Create Publisher';
            }
        }
    };
    
    // Auto-fill form fields when opening modal
    window.openAddPublisherModal = function() {
        try {
            console.log('🏢 Opening Add Publisher modal...');
            const modal = document.getElementById('add-publisher-modal');
            if (!modal) {
                alert('Error: Add Publisher modal not found');
                return;
            }
            
            // Clear form fields first
            if (document.getElementById('new-publisher-name')) {
                document.getElementById('new-publisher-name').value = '';
            }
            if (document.getElementById('new-publisher-email')) {
                document.getElementById('new-publisher-email').value = '';
            }
            
            // Auto-generate vendor code and API key
            if (document.getElementById('new-publisher-code')) {
                document.getElementById('new-publisher-code').value = generateVendorCode();
            }
            if (document.getElementById('new-publisher-api-key')) {
                document.getElementById('new-publisher-api-key').value = generateApiKey();
            }
            
            // Open the modal
            modal.classList.add('active');
            console.log('✅ Add Publisher modal opened');
            
        } catch (error) {
            console.error('Error opening Add Publisher modal:', error);
            alert('Error opening Add Publisher modal: ' + error.message);
        }
    };
    
    console.log('✅ Publisher creation fix ready');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPublisherCreationFix);
} else {
    setupPublisherCreationFix();
}

// Export for manual use
window.createPublisherDirect = createPublisherDirect;
window.generateVendorCode = generateVendorCode;
window.generateApiKey = generateApiKey;

console.log('🔧 Publisher Creator Fix loaded - bypasses CORS issues'); 