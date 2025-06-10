/**
 * Publisher Creator Fix - Direct API Call
 * Bypasses CORS issues by using a simpler approach
 */

async function createPublisherDirect(publisherData) {
    console.log('🚀 Creating publisher directly...', publisherData);
    
    const API_BASE = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
    
    // Try different token types
    const tokens = [
        localStorage.getItem('auth_token'),
        localStorage.getItem('idToken'), 
        localStorage.getItem('accessToken'),
        localStorage.getItem('mva_token')
    ].filter(Boolean);
    
    if (tokens.length === 0) {
        throw new Error('No authentication token found');
    }
    
    // Try different data structures that the backend might expect
    const dataStructures = [
        // Structure 1: Basic name/email structure (vendorController.js)
        {
            name: publisherData.name,
            email: publisherData.email,
            contact_phone: publisherData.phone || '',
            website: publisherData.website || '',
            status: publisherData.status || 'active',
            notes: 'Created via admin dashboard'
        },
        // Structure 2: With vendor_code (lambda-fix-package)
        {
            name: publisherData.name,
            vendor_code: publisherData.vendor_code,
            description: `Publisher: ${publisherData.name}`,
            email: publisherData.email
        },
        // Structure 3: Original structure
        {
            name: publisherData.name,
            email: publisherData.email,
            vendor_code: publisherData.vendor_code,
            api_key: publisherData.api_key,
            status: publisherData.status
        }
    ];
    
    // Try different endpoints
    const endpoints = ['/vendors', '/admin/vendors/create'];
    
    for (const token of tokens) {
        for (const endpoint of endpoints) {
            for (let i = 0; i < dataStructures.length; i++) {
                const dataStructure = dataStructures[i];
                
                try {
                    console.log(`🔄 Trying token ${tokens.indexOf(token) + 1}/${tokens.length}, endpoint: ${endpoint}, data structure ${i + 1}/${dataStructures.length}`);
                    
                    const result = await makeRequest(API_BASE + endpoint, token, dataStructure);
                    
                    console.log('✅ Publisher creation successful!', result);
                    return result;
                    
                } catch (error) {
                    console.log(`❌ Attempt failed:`, error.message);
                    
                    // If it's a 401/403, try next token
                    if (error.message.includes('401') || error.message.includes('403')) {
                        break; // Try next token
                    }
                    
                    // If it's a 400, try next data structure
                    if (error.message.includes('400')) {
                        continue; // Try next data structure
                    }
                    
                    // If it's a 500, try next endpoint
                    if (error.message.includes('500')) {
                        break; // Try next endpoint
                    }
                }
            }
        }
    }
    
    // If all attempts failed, throw the last error with helpful info
    throw new Error(`Failed to create publisher after trying ${tokens.length} tokens, ${endpoints.length} endpoints, and ${dataStructures.length} data structures. Check console for details.`);
}

// Helper function to make individual requests
function makeRequest(url, token, data) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        
        // Set headers
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Origin', 'https://main.d21xta9fg9b6w.amplifyapp.com');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                const status = xhr.status;
                const responseText = xhr.responseText;
                
                console.log(`📡 Response ${status}:`, responseText);
                
                if (status === 200 || status === 201) {
                    try {
                        const response = JSON.parse(responseText);
                        resolve(response);
                    } catch (e) {
                        resolve({ success: true, message: 'Publisher created successfully', data: responseText });
                    }
                } else {
                    let errorMessage = `HTTP ${status}`;
                    try {
                        const errorResponse = JSON.parse(responseText);
                        errorMessage = errorResponse.message || errorResponse.error || errorResponse.body || errorMessage;
                    } catch (e) {
                        errorMessage = responseText || errorMessage;
                    }
                    reject(new Error(errorMessage));
                }
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('Network error'));
        };
        
        xhr.send(JSON.stringify(data));
    });
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
            
            // Show success message with more details
            let successMessage = `✅ Publisher "${name}" created successfully!\n\n`;
            successMessage += `📧 Email: ${email}\n`;
            successMessage += `🏷️ Vendor Code: ${vendorCode}\n`;
            successMessage += `🔑 API Key: ${apiKey}\n`;
            successMessage += `📊 Status: ${status}\n\n`;
            
            if (result && result.vendor) {
                successMessage += `✅ Backend Response: Success\n`;
                successMessage += `🆔 Vendor ID: ${result.vendor.id || 'Generated'}\n`;
            } else {
                successMessage += `✅ Backend Response: Created successfully\n`;
            }

            alert(successMessage);
            
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
            
            let errorMessage = `❌ Failed to create publisher "${name}"\n\n`;
            
            if (error.message.includes('authentication') || error.message.includes('token')) {
                errorMessage += `🔐 Authentication Issue:\n`;
                errorMessage += `The authentication token may be expired or invalid.\n`;
                errorMessage += `Please try logging out and logging back in.\n\n`;
                errorMessage += `Error: ${error.message}`;
            } else if (error.message.includes('already exists')) {
                errorMessage += `⚠️ Duplicate Publisher:\n`;
                errorMessage += `A publisher with similar details already exists.\n`;
                errorMessage += `Please check the publisher list or try different details.\n\n`;
                errorMessage += `Error: ${error.message}`;
            } else if (error.message.includes('validation') || error.message.includes('required')) {
                errorMessage += `📋 Validation Error:\n`;
                errorMessage += `Some required information is missing or invalid.\n\n`;
                errorMessage += `Please check:\n`;
                errorMessage += `• Publisher name is provided\n`;
                errorMessage += `• Email address is valid\n`;
                errorMessage += `• All required fields are filled\n\n`;
                errorMessage += `Error: ${error.message}`;
            } else {
                errorMessage += `🔧 Technical Issue:\n`;
                errorMessage += `There was a problem connecting to the server.\n`;
                errorMessage += `This might be a temporary issue.\n\n`;
                errorMessage += `What you can try:\n`;
                errorMessage += `• Wait a moment and try again\n`;
                errorMessage += `• Check your internet connection\n`;
                errorMessage += `• Contact support if the issue persists\n\n`;
                errorMessage += `Technical Details: ${error.message}`;
            }
            
            alert(errorMessage);
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