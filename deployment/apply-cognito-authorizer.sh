#!/bin/bash

# Apply Cognito Authorizer to MVA CRM API Gateway
# This script updates all API methods to use Cognito authorization

set -e

API_ID="9qtb4my1ij"
REGION="us-east-1"

echo "🚀 Applying Cognito Authorizer to MVA CRM API Gateway..."

# Step 1: Deploy the CloudFormation stack to create the authorizer
echo "📋 Creating Cognito Authorizer..."
aws cloudformation deploy \
  --template-file api-gateway-cognito-setup.yml \
  --stack-name mva-crm-cognito-authorizer \
  --region $REGION \
  --capabilities CAPABILITY_IAM

# Step 2: Get the authorizer ID from the stack output
echo "🔍 Getting Authorizer ID..."
AUTHORIZER_ID=$(aws cloudformation describe-stacks \
  --stack-name mva-crm-cognito-authorizer \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`AuthorizerId`].OutputValue' \
  --output text)

echo "✅ Authorizer ID: $AUTHORIZER_ID"

# Step 3: Get all resources and methods that need authorization
echo "📡 Getting API Gateway resources..."

# List of endpoints that need authorization (all except OPTIONS)
ENDPOINTS=(
  "/vendors GET"
  "/vendors POST" 
  "/vendors/{id} GET"
  "/vendors/{id} PUT"
  "/vendors/{id} DELETE"
  "/vendors/{id}/api-key PUT"
  "/vendors/bulk-update POST"
  "/leads GET"
  "/leads POST"
  "/leads/{id} PATCH"
  "/leads/{id} DELETE"
  "/admin/stats GET"
  "/admin/analytics GET"
)

# Step 4: Apply authorizer to each endpoint
echo "🔒 Applying authorization to endpoints..."

for endpoint in "${ENDPOINTS[@]}"; do
  IFS=' ' read -r resource_path method <<< "$endpoint"
  
  echo "  → Securing $method $resource_path"
  
  # Get resource ID for the path
  RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart=='${resource_path##*/}' || path=='$resource_path'].id" \
    --output text)
  
  if [ -n "$RESOURCE_ID" ] && [ "$RESOURCE_ID" != "None" ]; then
    # Update the method to use Cognito authorizer
    aws apigateway update-method \
      --rest-api-id $API_ID \
      --resource-id $RESOURCE_ID \
      --http-method $method \
      --region $REGION \
      --patch-ops op=replace,path=/authorizationType,value=COGNITO_USER_POOLS \
      --patch-ops op=replace,path=/authorizerId,value=$AUTHORIZER_ID \
      > /dev/null
    
    echo "    ✅ Secured $method $resource_path"
  else
    echo "    ⚠️  Resource not found: $resource_path"
  fi
done

# Step 5: Deploy the API
echo "🚀 Deploying API changes..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region $REGION \
  > /dev/null

echo ""
echo "🎉 SUCCESS! Cognito Authorizer applied to MVA CRM API"
echo ""
echo "📋 What this means:"
echo "   ✅ AWS now validates all JWT tokens automatically"
echo "   ✅ No custom auth code needed in Lambda"
echo "   ✅ Enterprise-grade security"
echo "   ✅ Automatic token validation"
echo ""
echo "🔧 Next steps:"
echo "   1. Update Lambda function to remove custom auth middleware"
echo "   2. Update frontend to use proper Cognito tokens"
echo "   3. Test the API endpoints"
echo ""
echo "🧪 Test command:"
echo "   curl -H 'Authorization: Bearer YOUR_COGNITO_TOKEN' \\"
echo "        https://$API_ID.execute-api.$REGION.amazonaws.com/prod/vendors"
echo "" 