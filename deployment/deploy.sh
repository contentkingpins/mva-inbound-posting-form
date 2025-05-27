#!/bin/bash

# MVA CRM API Deployment Script
# This script deploys the complete CRM functionality to AWS

set -e  # Exit on any error

echo "🚀 Starting MVA CRM API Deployment..."

# Configuration
FUNCTION_NAME="mva-inbound-posting-api"
API_ID="9qtb4my1ij"
REGION="us-east-1"
ACCOUNT_ID="337909762852"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Step 1: Install Dependencies
echo "📦 Installing dependencies..."
if command -v npm &> /dev/null; then
    npm install @aws-sdk/client-dynamodb@^3.458.0 @aws-sdk/lib-dynamodb@^3.458.0 jsonwebtoken@^9.0.2 uuid@^9.0.0
    echo_success "Dependencies installed"
else
    echo_warning "npm not found, assuming dependencies are already installed"
fi

# Step 2: Create deployment package
echo "📝 Creating deployment package..."
if command -v zip &> /dev/null; then
    zip -r mva-crm-api.zip . -x "*.md" "*.zip" "deploy.sh" "*.git*"
    echo_success "Deployment package created: mva-crm-api.zip"
else
    echo_error "zip command not found. Please install zip or create package manually"
fi

# Step 3: Update Lambda function
echo "🔄 Updating Lambda function..."
if aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://mva-crm-api.zip > /dev/null 2>&1; then
    echo_success "Lambda function updated"
else
    echo_error "Failed to update Lambda function. Check AWS credentials and permissions"
fi

# Step 4: Set environment variables
echo "🔧 Setting environment variables..."
if aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables='{
        "LEADS_TABLE":"Leads",
        "USERS_TABLE":"Users", 
        "VENDORS_TABLE":"Vendors",
        "USER_POOL_ID":"us-east-1_lhc964tLD",
        "COGNITO_CLIENT_ID":"1ekkeqvftfnv0ld0u8utdbafv1",
        "JWT_SECRET":"mvaCrmSecretKey2024!"
    }' > /dev/null 2>&1; then
    echo_success "Environment variables set"
else
    echo_error "Failed to set environment variables"
fi

# Step 5: Get API Gateway resource info
echo "🔍 Getting API Gateway resources..."
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/`].id' --output text)

if [ -z "$ROOT_ID" ]; then
    echo_error "Could not find root resource in API Gateway"
fi

echo_success "Found root resource: $ROOT_ID"

# Function to create resource if it doesn't exist
create_resource_if_not_exists() {
    local parent_id=$1
    local path_part=$2
    
    # Check if resource already exists
    existing_id=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?pathPart==\`$path_part\`].id" --output text)
    
    if [ -z "$existing_id" ]; then
        echo "Creating resource: $path_part"
        aws apigateway create-resource \
            --rest-api-id $API_ID \
            --parent-id $parent_id \
            --path-part $path_part > /dev/null 2>&1
        
        # Get the newly created resource ID
        sleep 1
        new_id=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?pathPart==\`$path_part\`].id" --output text)
        echo $new_id
    else
        echo "Resource $path_part already exists"
        echo $existing_id
    fi
}

# Function to create method if it doesn't exist
create_method_if_not_exists() {
    local resource_id=$1
    local http_method=$2
    
    # Check if method exists
    if aws apigateway get-method --rest-api-id $API_ID --resource-id $resource_id --http-method $http_method > /dev/null 2>&1; then
        echo "Method $http_method already exists for resource $resource_id"
    else
        echo "Creating method: $http_method for resource $resource_id"
        aws apigateway put-method \
            --rest-api-id $API_ID \
            --resource-id $resource_id \
            --http-method $http_method \
            --authorization-type NONE > /dev/null 2>&1
    fi
}

# Step 6: Create API Gateway resources and methods
echo "🌐 Setting up API Gateway resources..."

# Create /leads resource
LEADS_ID=$(create_resource_if_not_exists $ROOT_ID "leads")
create_method_if_not_exists $LEADS_ID "GET"
create_method_if_not_exists $LEADS_ID "POST"
create_method_if_not_exists $LEADS_ID "OPTIONS"

# Create /leads/{id} resource
LEAD_ID_ID=$(create_resource_if_not_exists $LEADS_ID "{id}")
create_method_if_not_exists $LEAD_ID_ID "PATCH"
create_method_if_not_exists $LEAD_ID_ID "DELETE"
create_method_if_not_exists $LEAD_ID_ID "OPTIONS"

# Create /admin resource
ADMIN_ID=$(create_resource_if_not_exists $ROOT_ID "admin")

# Create /admin/stats resource
STATS_ID=$(create_resource_if_not_exists $ADMIN_ID "stats")
create_method_if_not_exists $STATS_ID "GET"
create_method_if_not_exists $STATS_ID "OPTIONS"

# Create /admin/analytics resource
ANALYTICS_ID=$(create_resource_if_not_exists $ADMIN_ID "analytics")
create_method_if_not_exists $ANALYTICS_ID "GET"
create_method_if_not_exists $ANALYTICS_ID "OPTIONS"

echo_success "API Gateway resources created"

# Step 7: Configure Lambda integrations
echo "🔗 Configuring Lambda integrations..."
LAMBDA_ARN="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME"

# Function to create integration if it doesn't exist
create_integration() {
    local resource_id=$1
    local http_method=$2
    
    if aws apigateway get-integration --rest-api-id $API_ID --resource-id $resource_id --http-method $http_method > /dev/null 2>&1; then
        echo "Integration already exists for $http_method on resource $resource_id"
    else
        echo "Creating integration for $http_method on resource $resource_id"
        aws apigateway put-integration \
            --rest-api-id $API_ID \
            --resource-id $resource_id \
            --http-method $http_method \
            --type AWS_PROXY \
            --integration-http-method POST \
            --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" > /dev/null 2>&1
    fi
}

# Create integrations for all methods
create_integration $LEADS_ID "GET"
create_integration $LEADS_ID "POST"
create_integration $LEAD_ID_ID "PATCH"
create_integration $LEAD_ID_ID "DELETE"
create_integration $STATS_ID "GET"
create_integration $ANALYTICS_ID "GET"

echo_success "Lambda integrations configured"

# Step 8: Add Lambda permissions
echo "🔐 Adding Lambda permissions..."
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id "api-gateway-crm-access-$(date +%s)" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*" > /dev/null 2>&1 || echo_warning "Permission may already exist"

echo_success "Lambda permissions added"

# Step 9: Deploy API Gateway
echo "🚀 Deploying API Gateway..."
if aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "CRM functionality deployment $(date)" > /dev/null 2>&1; then
    echo_success "API Gateway deployed"
else
    echo_error "Failed to deploy API Gateway"
fi

# Step 10: Test deployment
echo "🧪 Testing deployment..."
BASE_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/prod"

# Test auth endpoint (should work without auth)
if curl -s -X OPTIONS "$BASE_URL/auth/get-username" > /dev/null; then
    echo_success "Auth endpoints accessible"
else
    echo_warning "Auth endpoints may not be accessible"
fi

# Test leads endpoint (will return 401 without auth, which is expected)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE_URL/leads")
if [ "$HTTP_CODE" = "200" ]; then
    echo_success "Leads endpoints accessible"
else
    echo_warning "Leads endpoints may not be accessible (HTTP $HTTP_CODE)"
fi

# Test admin endpoint (will return 401 without auth, which is expected)  
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE_URL/admin/stats")
if [ "$HTTP_CODE" = "200" ]; then
    echo_success "Admin endpoints accessible"
else
    echo_warning "Admin endpoints may not be accessible (HTTP $HTTP_CODE)"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 New API Endpoints:"
echo "   • GET    $BASE_URL/leads"
echo "   • POST   $BASE_URL/leads"
echo "   • PATCH  $BASE_URL/leads/{id}"
echo "   • DELETE $BASE_URL/leads/{id}"
echo "   • GET    $BASE_URL/admin/stats"
echo "   • GET    $BASE_URL/admin/analytics"
echo ""
echo "🔑 Authentication required for all endpoints except OPTIONS"
echo "📖 See DEPLOYMENT_GUIDE.md for detailed usage instructions"
echo ""
echo "🔍 To test with authentication:"
echo "   curl -X GET '$BASE_URL/leads' -H 'Authorization: Bearer YOUR_JWT_TOKEN'"

# Cleanup
rm -f mva-crm-api.zip
echo_success "Cleanup completed" 