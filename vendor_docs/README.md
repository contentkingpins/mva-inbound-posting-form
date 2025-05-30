# Vendor Integration Documentation

This directory contains API integration documentation for each vendor. Each vendor has a unique vendor code and API key that they must use when submitting leads to our API.

## Managing Vendors

To manage vendors and generate documentation, use the vendor management script:

```bash
# Create a new vendor
node scripts/vendor-management.js create "Vendor Name" vendor@email.com 555-123-4567

# List all vendors
node scripts/vendor-management.js list

# Get details for a specific vendor
node scripts/vendor-management.js get VENDOR_CODE

# Generate API instructions for a vendor
node scripts/vendor-management.js instructions VENDOR_CODE

# Regenerate API key for a vendor
node scripts/vendor-management.js regenerate-key VENDOR_CODE
```

## Vendor Codes and API Keys

Each vendor is assigned:

1. A unique **vendor code** that follows this format:
   - First 3 letters of the vendor name (uppercase)
   - 5 character random alphanumeric string
   
   Example: **ABC12DEF**

2. A unique **API key** (32 character random string)
   - This is automatically generated when a vendor is created
   - Can be regenerated if needed for security reasons
   - Each vendor gets their own API key for tracking and security

The vendor code is used to track all leads submitted by the vendor and must be included in every API request. The API key is used for authentication.

## Lead Tracking

When a vendor submits a lead, the system:
1. Validates the vendor's API key for authentication
2. Validates the vendor code exists in our database
3. Attaches the vendor code to the lead record
4. Allows querying leads by vendor code

## API Documentation

Vendor-specific API documentation will be generated in this directory as markdown files with the naming convention: `VENDORCODE_api_instructions.md`

These files contain:
- The vendor's unique code
- The vendor's API key
- API endpoint information
- Authentication details
- Required request format
- Example code snippets

You can generate these files using the vendor management script.

## Security Considerations

- Each vendor has their own API key for improved security
- If a vendor's API key is compromised, it can be regenerated without affecting other vendors
- The system can track API usage on a per-vendor basis
- Vendor-specific API keys allow for more granular control over API access 