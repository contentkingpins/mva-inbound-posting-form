#!/bin/bash

# Quick fix script to add missing /vendors routes to API Gateway

API_ID="9qtb4my1ij"
LAMBDA_ARN="arn:aws:lambda:us-east-1:730335341755:function:mva-crm-lambda-prod"

echo "🛠️ Adding missing /vendors routes to API Gateway..."

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/`].id' --output text)
echo "📍 Root resource ID: $ROOT_ID"

# Create /vendors resource
echo "📁 Creating /vendors resource..."
VENDORS_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part "vendors" \
  --query 'id' --output text)
echo "✅ Created /vendors resource: $VENDORS_ID"

# Create GET /vendors method
echo "🔗 Creating GET /vendors method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_ID \
  --http-method GET \
  --authorization-type NONE

# Create POST /vendors method
echo "🔗 Creating POST /vendors method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_ID \
  --http-method POST \
  --authorization-type NONE

# Create OPTIONS /vendors method (CORS)
echo "🔗 Creating OPTIONS /vendors method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_ID \
  --http-method OPTIONS \
  --authorization-type NONE

# Create integrations for /vendors
echo "🔧 Setting up Lambda integrations..."

# GET /vendors integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations"

# POST /vendors integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations"

# Deploy API
echo "🚀 Deploying API to prod stage..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Added missing /vendors routes"

echo "✅ Vendor routes added successfully!"
echo "🔗 Test with: curl https://$API_ID.execute-api.us-east-1.amazonaws.com/prod/vendors" 