#!/bin/bash

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# DocuSign credentials from environment or command line
USER_ID=${1:-"534890fa-b646-4dd0-b6be-8edefa446308"}
ACCOUNT_ID=${2:-"1cd48c0c-1772-4dda-8652-01f771015168"}
INTEGRATION_KEY=${3:-"9398cb45-b60d-4397-8cc2-b46e052283c"}
SECRET_KEY=${4:-"d33fdfa0-aa42-4123-85f1-c9603ad66677"}
TEMPLATE_ID=${5:-""}

# Function to create/update SSM parameter
create_parameter() {
    local name=$1
    local value=$2
    local description=$3

    aws ssm put-parameter \
        --name "/docusign/$name" \
        --value "$value" \
        --type "SecureString" \
        --description "$description" \
        --overwrite

    if [ $? -eq 0 ]; then
        echo "Successfully set parameter: /docusign/$name"
    else
        echo "Failed to set parameter: /docusign/$name"
        exit 1
    fi
}

# Create/update parameters
create_parameter "user_id" "$USER_ID" "DocuSign User ID"
create_parameter "account_id" "$ACCOUNT_ID" "DocuSign Account ID"
create_parameter "integration_key" "$INTEGRATION_KEY" "DocuSign Integration Key"
create_parameter "secret_key" "$SECRET_KEY" "DocuSign Secret Key"

# Only set template ID if provided
if [ ! -z "$TEMPLATE_ID" ]; then
    create_parameter "retainer_template_id" "$TEMPLATE_ID" "DocuSign Retainer Agreement Template ID"
fi

# Check if private key file exists
if [ -f "docusign_private_key.pem" ]; then
    # Read private key and store it
    PRIVATE_KEY=$(cat docusign_private_key.pem)
    create_parameter "private_key" "$PRIVATE_KEY" "DocuSign RSA Private Key"
else
    echo "Warning: docusign_private_key.pem not found. Please set it manually later."
fi

echo "DocuSign parameters setup complete!" 