# DocuSign Integration Setup

This document outlines the steps needed to set up DocuSign integration with the lead management system.

## Prerequisites

1. AWS CLI installed and configured with appropriate permissions
2. DocuSign developer account
3. DocuSign Integration Key and other credentials
4. Node.js 14.x or later

## Setup Steps

### 1. DocuSign Configuration

1. Go to DocuSign → Templates
2. Create a new template for your retainer agreement
3. Add the following form fields:
   - Client_FirstName
   - Client_LastName
   - Client_Email
   - Client_Phone
   - Client_Address
4. Save and note the Template ID

### 2. AWS Parameter Store Setup

Run the setup script with your DocuSign credentials:

```bash
# On Linux/Mac
./scripts/setup-docusign-params.sh \
  "your-user-id" \
  "your-account-id" \
  "your-integration-key" \
  "your-secret-key" \
  "your-template-id"

# On Windows PowerShell
.\scripts\setup-docusign-params.sh `
  "your-user-id" `
  "your-account-id" `
  "your-integration-key" `
  "your-secret-key" `
  "your-template-id"
```

### 3. Private Key Setup

1. Save your DocuSign RSA private key to `docusign_private_key.pem`
2. Run the setup script again to store the private key in Parameter Store

### 4. Verify Setup

1. Check AWS Parameter Store for the following parameters:
   - /docusign/user_id
   - /docusign/account_id
   - /docusign/integration_key
   - /docusign/secret_key
   - /docusign/private_key
   - /docusign/retainer_template_id

2. Deploy the updated serverless configuration:
```bash
serverless deploy
```

## Testing the Integration

1. Send a test retainer agreement:
```bash
curl -X POST https://your-api/leads/{lead_id}/send-retainer \
  -H "x-api-key: your-api-key"
```

2. Check the DocuSign webhook endpoint:
```bash
curl -X POST https://your-api/docusign/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Troubleshooting

1. Check CloudWatch logs for any errors
2. Verify Parameter Store values are correctly set
3. Ensure DocuSign credentials are valid
4. Check API Gateway configuration for the new endpoints 