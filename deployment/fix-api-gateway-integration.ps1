# Fix API Gateway /vendors integration to point to correct Lambda function
Write-Host "Fixing API Gateway /vendors integration..."

$API_ID = "9qtb4my1ij"
$CORRECT_LAMBDA_ARN = "arn:aws:lambda:us-east-1:337909762852:function:mva-inbound-posting-api"
$INTEGRATION_URI = "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$CORRECT_LAMBDA_ARN/invocations"

# Get vendors resource ID
$VENDORS_RESOURCE_ID = aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/vendors'].id" --output text

Write-Host "Vendors resource ID: $VENDORS_RESOURCE_ID"

# Update GET /vendors integration
Write-Host "Updating GET /vendors integration..."
aws apigateway put-integration `
  --rest-api-id $API_ID `
  --resource-id $VENDORS_RESOURCE_ID `
  --http-method GET `
  --type AWS_PROXY `
  --integration-http-method POST `
  --uri $INTEGRATION_URI

# Update POST /vendors integration  
Write-Host "Updating POST /vendors integration..."
aws apigateway put-integration `
  --rest-api-id $API_ID `
  --resource-id $VENDORS_RESOURCE_ID `
  --http-method POST `
  --type AWS_PROXY `
  --integration-http-method POST `
  --uri $INTEGRATION_URI

# Deploy the API
Write-Host "Deploying API changes..."
aws apigateway create-deployment `
  --rest-api-id $API_ID `
  --stage-name prod `
  --description "Fixed vendors endpoint Lambda integration"

Write-Host "API Gateway vendors integration fixed!"
Write-Host "Test endpoint: https://$API_ID.execute-api.us-east-1.amazonaws.com/prod/vendors"