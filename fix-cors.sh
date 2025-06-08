#!/bin/bash

# Fix CORS for MVA API Gateway
# This script adds OPTIONS method and proper CORS headers

API_ID="9qtb4my1ij"
REGION="us-east-1"

echo "🔧 Fixing CORS for API Gateway..."

# Get vendors resource ID
RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?pathPart=='vendors'].id" --output text)

if [ -z "$RESOURCE_ID" ]; then
    echo "❌ Could not find vendors resource"
    exit 1
fi

echo "✅ Found vendors resource: $RESOURCE_ID"

# Add OPTIONS method (ignore error if already exists)
echo "🔧 Adding OPTIONS method..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION 2>/dev/null || echo "OPTIONS method may already exist"

# Add method response for OPTIONS
echo "🔧 Adding OPTIONS method response..."
aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters "method.response.header.Access-Control-Allow-Origin=false,method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false" \
    --region $REGION 2>/dev/null || echo "Method response may already exist"

# Add integration for OPTIONS (mock integration)
echo "🔧 Adding OPTIONS integration..."
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --integration-http-method OPTIONS \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region $REGION 2>/dev/null || echo "Integration may already exist"

# Add integration response for OPTIONS
echo "🔧 Adding OPTIONS integration response..."
aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters "method.response.header.Access-Control-Allow-Origin='*',method.response.header.Access-Control-Allow-Headers='Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',method.response.header.Access-Control-Allow-Methods='GET,POST,PUT,DELETE,OPTIONS'" \
    --region $REGION 2>/dev/null || echo "Integration response may already exist"

# Deploy the changes
echo "🚀 Deploying API Gateway changes..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "CORS fix - add OPTIONS method" \
    --region $REGION

echo "✅ CORS fix complete!"
echo "🧪 Test URL: https://$API_ID.execute-api.$REGION.amazonaws.com/prod/vendors" 