#!/bin/bash

# Fix API Gateway /vendors integration to point to correct Lambda function
echo "🔧 Fixing API Gateway /vendors integration..."

API_ID="9qtb4my1ij"
CORRECT_LAMBDA_ARN="arn:aws:lambda:us-east-1:337909762852:function:mva-inbound-posting-api"
INTEGRATION_URI="arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$CORRECT_LAMBDA_ARN/invocations"

# Get vendors resource ID
echo "📍 Getting vendors resource ID..."
VENDORS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/vendors'].id" --output text)

echo "✅ Vendors resource ID: $VENDORS_RESOURCE_ID"

if [ -z "$VENDORS_RESOURCE_ID" ]; then
    echo "❌ Error: /vendors resource not found! Creating it first..."
    
    # Get root resource ID
    ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/`].id' --output text)
    
    # Create /vendors resource
    VENDORS_RESOURCE_ID=$(aws apigateway create-resource \
      --rest-api-id $API_ID \
      --parent-id $ROOT_ID \
      --path-part "vendors" \
      --query 'id' --output text)
    
    echo "✅ Created /vendors resource: $VENDORS_RESOURCE_ID"
    
    # Create methods
    aws apigateway put-method --rest-api-id $API_ID --resource-id $VENDORS_RESOURCE_ID --http-method GET --authorization-type NONE
    aws apigateway put-method --rest-api-id $API_ID --resource-id $VENDORS_RESOURCE_ID --http-method POST --authorization-type NONE
    aws apigateway put-method --rest-api-id $API_ID --resource-id $VENDORS_RESOURCE_ID --http-method OPTIONS --authorization-type NONE
fi

# Update GET /vendors integration
echo "🔗 Updating GET /vendors integration..."
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri $INTEGRATION_URI

# Update POST /vendors integration  
echo "🔗 Updating POST /vendors integration..."
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri $INTEGRATION_URI

# Add Lambda permission for API Gateway
echo "🔐 Adding Lambda permission for API Gateway..."
aws lambda add-permission \
  --function-name mva-inbound-posting-api \
  --statement-id apigateway-vendors-get \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:337909762852:$API_ID/*/GET/vendors" \
  2>/dev/null || echo "   (Permission already exists - OK)"

aws lambda add-permission \
  --function-name mva-inbound-posting-api \
  --statement-id apigateway-vendors-post \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:337909762852:$API_ID/*/POST/vendors" \
  2>/dev/null || echo "   (Permission already exists - OK)"

# Deploy the API
echo "🚀 Deploying API changes..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Fixed vendors endpoint Lambda integration"

echo "✅ API Gateway vendors integration fixed!"
echo "🔗 Test endpoint: https://$API_ID.execute-api.us-east-1.amazonaws.com/prod/vendors"
echo ""
echo "🧪 Testing endpoint..."
curl -i "https://$API_ID.execute-api.us-east-1.amazonaws.com/prod/vendors" 