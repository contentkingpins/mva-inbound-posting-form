#!/bin/bash

API_ID="9qtb4my1ij"
VENDORS_RESOURCE_ID="e303o0"
LAMBDA_ARN="arn:aws:lambda:us-east-1:730335341755:function:mva-crm-lambda-prod"

echo "🔧 Setting up vendor endpoint integrations..."

# Set up GET /vendors integration
echo "🔗 Setting up GET /vendors integration..."
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations"

# Set up POST /vendors integration  
echo "🔗 Setting up POST /vendors integration..."
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations"

# Set up OPTIONS /vendors integration (for CORS)
echo "🔗 Setting up OPTIONS /vendors integration..."
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json":"{\"statusCode\": 200}"}'

# Set up integration responses
echo "📤 Setting up integration responses..."

# GET method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"false"}'

# POST method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_RESOURCE_ID \
  --http-method POST \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"false"}'

# OPTIONS method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"false","method.response.header.Access-Control-Allow-Headers":"false","method.response.header.Access-Control-Allow-Methods":"false"}'

# Set up integration responses
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $VENDORS_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'\''https://main.d21xta9fg9b6w.amplifyapp.com'\''","method.response.header.Access-Control-Allow-Headers":"'\''Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'\''","method.response.header.Access-Control-Allow-Methods":"'\''GET,POST,OPTIONS'\''"}' \
  --response-templates '{"application/json":""}'

# Deploy the API
echo "🚀 Deploying API..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Fixed vendor endpoint integrations"

echo "✅ Vendor endpoint setup complete!"
echo "🔗 Test with: curl https://$API_ID.execute-api.us-east-1.amazonaws.com/prod/vendors" 