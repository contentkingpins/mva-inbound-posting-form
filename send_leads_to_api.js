const https = require('https');
const fs = require('fs');

// The mock lead data
const mockLeads = [
    {
        "lead_id": "TX-2025-05421",
        "first_name": "Michael",
        "last_name": "Rodriguez",
        "phone_home": "512-555-3892",
        "email": "mrodriguez@example.com",
        "zip_code": "78745",
        "state": "TX",
        "city": "Austin",
        "vendor_code": "LAWFIRM-SEO",
        "timestamp": "2025-04-25T14:22:33Z",
        "disposition": "Not Qualified Lead",
        "notes": "Caller was at fault in the accident. Not eligible for representation.",
        "accident_date": "2025-04-01",
        "accident_location": "I-35 South, Austin",
        "caller_at_fault": "yes",
        "has_attorney": "no",
        "was_injured": "yes",
        "medical_within_30_days": "no",
        "at_fault_has_insurance": "yes",
        "is_commercial_vehicle": "no",
        "has_um_coverage": "no",
        "has_commercial_proof": "no"
    },
    {
        "lead_id": "TX-2025-09872",
        "first_name": "Jessica",
        "last_name": "Martinez",
        "phone_home": "713-555-7634",
        "email": "jmartinez@example.com",
        "zip_code": "77002",
        "state": "TX",
        "city": "Houston",
        "vendor_code": "GOOGLE-ADS",
        "timestamp": "2025-04-26T09:45:12Z",
        "disposition": "Not Qualified Lead",
        "notes": "Accident occurred 2.5 years ago. Beyond statute of limitations.",
        "accident_date": "2023-03-12",
        "accident_location": "Highway 610 Loop, Houston",
        "caller_at_fault": "no",
        "has_attorney": "no",
        "was_injured": "yes",
        "medical_within_30_days": "yes",
        "at_fault_has_insurance": "yes",
        "is_commercial_vehicle": "no",
        "has_um_coverage": "no",
        "has_commercial_proof": "no"
    },
    {
        "lead_id": "TX-2025-12543",
        "first_name": "Robert",
        "last_name": "Johnson",
        "phone_home": "214-555-1938",
        "email": "rjohnson@example.com",
        "zip_code": "75201",
        "state": "TX",
        "city": "Dallas",
        "vendor_code": "FACEBOOK",
        "timestamp": "2025-04-27T16:37:21Z",
        "disposition": "Awaiting Proof of Claim",
        "notes": "Caller needs to provide medical records and police report. Following up next week.",
        "accident_date": "2025-04-10",
        "accident_location": "Dallas North Tollway",
        "caller_at_fault": "no",
        "has_attorney": "no",
        "was_injured": "yes",
        "medical_within_30_days": "yes",
        "at_fault_has_insurance": "yes",
        "is_commercial_vehicle": "yes",
        "has_um_coverage": "yes",
        "has_commercial_proof": "no"
    },
    {
        "lead_id": "TX-2025-15789",
        "first_name": "Sarah",
        "last_name": "Thompson",
        "phone_home": "512-555-7821",
        "email": "sthompson@example.com",
        "zip_code": "78701",
        "state": "TX",
        "city": "Austin",
        "vendor_code": "YELP",
        "timestamp": "2025-04-28T10:15:43Z",
        "disposition": "Docs Sent",
        "notes": "Representation agreement sent via email. Waiting for signed documents.",
        "accident_date": "2025-04-15",
        "accident_location": "MoPac Expressway, Austin",
        "caller_at_fault": "no",
        "has_attorney": "no",
        "was_injured": "yes",
        "medical_within_30_days": "yes",
        "at_fault_has_insurance": "yes",
        "is_commercial_vehicle": "no",
        "has_um_coverage": "yes",
        "has_commercial_proof": "no"
    },
    {
        "lead_id": "TX-2025-18934",
        "first_name": "David",
        "last_name": "Garcia",
        "phone_home": "956-555-3427",
        "email": "dgarcia@example.com",
        "zip_code": "78520",
        "state": "TX",
        "city": "Brownsville",
        "vendor_code": "REFERRAL",
        "timestamp": "2025-04-29T14:22:18Z",
        "disposition": "Docs Sent",
        "notes": "Initial paperwork delivered. Awaiting medical authorization forms.",
        "accident_date": "2025-04-05",
        "accident_location": "Highway 77, Brownsville",
        "caller_at_fault": "no",
        "has_attorney": "no",
        "was_injured": "yes",
        "medical_within_30_days": "yes",
        "at_fault_has_insurance": "yes",
        "is_commercial_vehicle": "no",
        "has_um_coverage": "no",
        "has_commercial_proof": "no"
    },
    {
        "lead_id": "TX-2025-21576",
        "first_name": "Jennifer",
        "last_name": "Wilson",
        "phone_home": "817-555-9283",
        "email": "jwilson@example.com",
        "zip_code": "76102",
        "state": "TX",
        "city": "Fort Worth",
        "vendor_code": "INSTAGRAM",
        "timestamp": "2025-04-30T09:14:57Z",
        "disposition": "Not Interested",
        "notes": "Caller decided to go with another attorney. Called to inform us.",
        "accident_date": "2025-04-20",
        "accident_location": "I-30, Fort Worth",
        "caller_at_fault": "no",
        "has_attorney": "yes",
        "was_injured": "yes",
        "medical_within_30_days": "yes",
        "at_fault_has_insurance": "yes",
        "is_commercial_vehicle": "no",
        "has_um_coverage": "no",
        "has_commercial_proof": "no"
    },
    {
        "lead_id": "TX-2025-24789",
        "first_name": "Thomas",
        "last_name": "Anderson",
        "phone_home": "281-555-6742",
        "email": "tanderson@example.com",
        "zip_code": "77494",
        "state": "TX",
        "city": "Katy",
        "vendor_code": "ORGANIC",
        "timestamp": "2025-04-30T15:48:32Z",
        "disposition": "Retained for Firm",
        "notes": "All paperwork complete. Case assigned to Attorney Johnson. Initial consultation scheduled.",
        "accident_date": "2025-04-22",
        "accident_location": "Grand Parkway, Katy",
        "caller_at_fault": "no",
        "has_attorney": "no",
        "was_injured": "yes",
        "medical_within_30_days": "yes",
        "at_fault_has_insurance": "yes",
        "is_commercial_vehicle": "yes",
        "has_um_coverage": "yes",
        "has_commercial_proof": "yes"
    }
];

// API configuration - replace with the actual production API endpoint
const apiEndpoint = 'nv01uveape.execute-api.us-east-1.amazonaws.com';
const apiPath = '/prod/leads';
const apiKey = 'fpoI4Uwleh63QVGGsnAUG49W7B8k67g21Gc8glIl'; // The dashboard API key

// Function to send a single lead to the API
function sendLead(lead) {
    return new Promise((resolve, reject) => {
        // Prepare the request data
        const data = JSON.stringify(lead);
        
        // Set up the request options
        const options = {
            hostname: apiEndpoint,
            port: 443, // HTTPS
            path: apiPath,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'x-api-key': apiKey,
                // Add any other required headers
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
                    console.log(`Successfully sent lead: ${lead.lead_id}`);
                    console.log(`Response: ${responseData}`);
                    resolve();
                } else {
                    console.error(`Error sending lead ${lead.lead_id}: ${res.statusCode}`);
                    console.error(`Response: ${responseData}`);
                    reject(new Error(`Status code: ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error(`Request error for lead ${lead.lead_id}:`, error);
            reject(error);
        });
        
        // Send the data
        req.write(data);
        req.end();
    });
}

// Send all leads sequentially
async function sendAllLeads() {
    console.log(`Starting to send ${mockLeads.length} leads to API...`);
    
    // Set a valid vendor code that's known to exist in the system
    const validVendorCode = "VENDOR1";
    
    for (const lead of mockLeads) {
        try {
            // Add the required lp_caller_id field, format phone numbers, and use valid vendor code
            const formattedLead = {
                ...lead,
                // Format phone to be exactly 10 digits (removing any non-digit characters)
                phone_home: lead.phone_home.replace(/\D/g, '').slice(0, 10).padStart(10, '0'),
                // Add required lp_caller_id that matches phone_home
                lp_caller_id: lead.phone_home.replace(/\D/g, '').slice(0, 10).padStart(10, '0'),
                // Use known valid vendor code
                vendor_code: validVendorCode
            };
            
            console.log(`Sending lead ${lead.lead_id} with vendor code ${validVendorCode}...`);
            await sendLead(formattedLead);
            // Add a small delay between requests to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Failed to send lead ${lead.lead_id}:`, error);
            // Continue with the next lead even if one fails
        }
    }
    
    console.log('Finished sending all leads.');
}

// Start sending leads
sendAllLeads(); 