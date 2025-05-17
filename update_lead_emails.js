const https = require('https');

// API configuration
const apiEndpoint = 'nv01uveape.execute-api.us-east-1.amazonaws.com';
const apiPath = '/prod/leads';
const apiKey = 'fpoI4Uwleh63QVGGsnAUG49W7B8k67g21Gc8glIl';

// Leads that were uploaded with API-provided lead_ids
const uploadedLeads = [
    {
        "original_lead_id": "TX-2025-05421",
        "api_lead_id": "f9f32d91-7848-49af-8856-90293a2b8e0c",
        "first_name": "Michael",
        "last_name": "Rodriguez",
        "email": "mrodriguez@example.com" // Will be updated
    },
    {
        "original_lead_id": "TX-2025-09872",
        "api_lead_id": "a2caa2dc-9707-4ab1-92c2-fb87332e6533",
        "first_name": "Jessica",
        "last_name": "Martinez",
        "email": "jmartinez@example.com" // Will be updated
    },
    {
        "original_lead_id": "TX-2025-12543",
        "api_lead_id": "67e3a4d6-259e-43aa-8ebe-c019c91191d6",
        "first_name": "Robert",
        "last_name": "Johnson",
        "email": "rjohnson@example.com" // Will be updated
    },
    {
        "original_lead_id": "TX-2025-15789",
        "api_lead_id": "51b8ccfa-15af-45c5-b9f5-e4dc42f16a2a",
        "first_name": "Sarah",
        "last_name": "Thompson",
        "email": "sthompson@example.com" // Will be updated
    },
    {
        "original_lead_id": "TX-2025-18934",
        "api_lead_id": "c724b000-b1e7-467f-b312-67c6f46961c7",
        "first_name": "David",
        "last_name": "Garcia",
        "email": "dgarcia@example.com" // Will be updated
    },
    {
        "original_lead_id": "TX-2025-21576",
        "api_lead_id": "95ebe10e-4cf3-4aae-8f9b-79f99891ae76",
        "first_name": "Jennifer",
        "last_name": "Wilson",
        "email": "jwilson@example.com" // Will be updated
    },
    {
        "original_lead_id": "TX-2025-24789",
        "api_lead_id": "9141c7de-1c5f-44eb-ae61-69ee7d3a56b5",
        "first_name": "Thomas",
        "last_name": "Anderson",
        "email": "tanderson@example.com" // Will be updated
    }
];

// Common email domains to replace example.com
const emailDomains = [
    "gmail.com",
    "yahoo.com",
    "ymail.com",
    "icloud.com"
];

// Function to update a single lead with new email
function updateLeadEmail(lead) {
    return new Promise((resolve, reject) => {
        // Extract username from the old email
        const username = lead.email.split('@')[0];
        
        // Select a random email domain
        const randomDomain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
        
        // Create new email
        const newEmail = `${username}@${randomDomain}`;
        
        // Prepare the update data
        const updateData = {
            email: newEmail
        };
        
        const data = JSON.stringify(updateData);
        
        // Set up the request options for PATCH
        const options = {
            hostname: apiEndpoint,
            port: 443, // HTTPS
            path: `${apiPath}/${lead.api_lead_id}`, // Adding lead_id to path for PATCH
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'x-api-key': apiKey
            }
        };
        
        // Send the request
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`Successfully updated email for lead ${lead.original_lead_id} from ${lead.email} to ${newEmail}`);
                    console.log(`Response: ${responseData}`);
                    resolve(newEmail);
                } else {
                    console.error(`Error updating lead ${lead.original_lead_id}: ${res.statusCode}`);
                    console.error(`Response: ${responseData}`);
                    reject(new Error(`Status code: ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error(`Request error for lead ${lead.original_lead_id}:`, error);
            reject(error);
        });
        
        // Send the data
        req.write(data);
        req.end();
    });
}

// Update all leads sequentially
async function updateAllLeadEmails() {
    console.log(`Starting to update emails for ${uploadedLeads.length} leads...`);
    
    for (const lead of uploadedLeads) {
        try {
            await updateLeadEmail(lead);
            // Add a small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Failed to update email for lead ${lead.original_lead_id}:`, error);
            // Continue with next lead even if one fails
        }
    }
    
    console.log('Finished updating all lead emails.');
}

// Start updating lead emails
updateAllLeadEmails(); 