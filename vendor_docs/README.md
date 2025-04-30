# Vendor Integration Documentation

This directory contains API integration documentation for each vendor. Each vendor has a unique vendor code that they must use when submitting leads to our API.

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
```

## Vendor Codes

Each vendor is assigned a unique code that follows this format:
- First 3 letters of the vendor name (uppercase)
- 5 character random alphanumeric string

For example: **ABC12DEF**

This code is used to track all leads submitted by the vendor and must be included in every API request.

## Lead Tracking

When a vendor submits a lead, the system:
1. Validates the vendor code exists in our database
2. Attaches the vendor code to the lead record
3. Allows querying leads by vendor code

## API Documentation

Vendor-specific API documentation will be generated in this directory as markdown files with the naming convention: `VENDORCODE_api_instructions.md`

These files contain:
- The vendor's unique code
- API endpoint information
- Authentication details
- Required request format
- Example code snippets

You can generate these files using the vendor management script. 