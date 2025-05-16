#!/bin/bash

# Script to set up AWS SSM Parameters for DocuSign integration

echo "DocuSign Integration Setup"
echo "=========================="
echo "This script will help you set up the required parameters in AWS SSM Parameter Store"
echo "for the DocuSign integration."
echo ""

# User ID and Account ID are already known
USER_ID="534890fa-b646-4dd0-b6be-8edefa446308"
ACCOUNT_ID="1cd48c0c-1772-4dda-8652-01f771015168"

# Integration Key is known
INTEGRATION_KEY="9398cb45-b60d-4397-8cc2-b46e052283c"

# Secret Key is known
SECRET_KEY="d33fdfa0-aa42-4123-85f1-c9603ad66677"

# Get template ID
read -p "Enter your DocuSign Retainer Template ID: " TEMPLATE_ID

# Private key path is known
PRIVATE_KEY_PATH="./docusign_private_key.pem"

# Read the private key
if [ -f "$PRIVATE_KEY_PATH" ]; then
  PRIVATE_KEY=$(cat "$PRIVATE_KEY_PATH")
  echo "Private key read successfully"
else
  echo "Error: Private key file not found at $PRIVATE_KEY_PATH"
  exit 1
fi

# Confirm details
echo ""
echo "Please confirm the following details:"
echo "User ID: $USER_ID"
echo "Account ID: $ACCOUNT_ID"
echo "Integration Key: $INTEGRATION_KEY"
echo "Secret Key: $SECRET_KEY"
echo "Template ID: $TEMPLATE_ID"
echo "Private Key: [REDACTED]"
read -p "Is this information correct? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
  echo "Setup cancelled"
  exit 1
fi

# Store parameters in AWS SSM Parameter Store
echo ""
echo "Storing parameters in AWS SSM Parameter Store..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "Error: AWS CLI is not installed. Please install it and configure your credentials."
  exit 1
fi

# Store User ID
aws ssm put-parameter \
  --name "/docusign/user_id" \
  --value "$USER_ID" \
  --type "SecureString" \
  --overwrite

# Store Account ID
aws ssm put-parameter \
  --name "/docusign/account_id" \
  --value "$ACCOUNT_ID" \
  --type "SecureString" \
  --overwrite

# Store Integration Key
aws ssm put-parameter \
  --name "/docusign/integration_key" \
  --value "$INTEGRATION_KEY" \
  --type "SecureString" \
  --overwrite

# Store Secret Key
aws ssm put-parameter \
  --name "/docusign/secret_key" \
  --value "$SECRET_KEY" \
  --type "SecureString" \
  --overwrite

# Store Template ID
aws ssm put-parameter \
  --name "/docusign/retainer_template_id" \
  --value "$TEMPLATE_ID" \
  --type "SecureString" \
  --overwrite

# Store Private Key
aws ssm put-parameter \
  --name "/docusign/private_key" \
  --value "$PRIVATE_KEY" \
  --type "SecureString" \
  --overwrite

echo ""
echo "DocuSign parameters have been stored in AWS SSM Parameter Store"
echo "You can now deploy your application to use these credentials" 