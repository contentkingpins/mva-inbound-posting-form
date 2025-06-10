# Create Missing Leads Table
Write-Host "Creating mva-crm-Leads-production DynamoDB table..." -ForegroundColor Yellow

# Check existing tables first
Write-Host "Checking existing tables..." -ForegroundColor Blue
aws dynamodb list-tables --region us-east-1

Write-Host "`nCreating leads table..." -ForegroundColor Blue

# Create table with proper JSON formatting
$createTableCommand = @"
aws dynamodb create-table \
--table-name "mva-crm-Leads-production" \
--attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=vendor_code,AttributeType=S \
    AttributeName=timestamp,AttributeType=S \
--key-schema \
    AttributeName=id,KeyType=HASH \
--global-secondary-indexes \
    IndexName=VendorTimestampIndex,KeySchema=[{AttributeName=vendor_code,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
--provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
--region us-east-1
"@

# Execute the command
Invoke-Expression $createTableCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Leads table creation initiated!" -ForegroundColor Green
    
    # Wait for table to be active
    Write-Host "Waiting for table to become active..." -ForegroundColor Yellow
    aws dynamodb wait table-exists --table-name "mva-crm-Leads-production" --region us-east-1
    
    Write-Host "✅ Leads table is now active!" -ForegroundColor Green
    
    # Verify table creation
    Write-Host "Verifying table..." -ForegroundColor Blue
    aws dynamodb describe-table --table-name "mva-crm-Leads-production" --region us-east-1 --query "Table.TableStatus"
    
} else {
    Write-Host "❌ Failed to create leads table" -ForegroundColor Red
    Write-Host "Table may already exist - checking..." -ForegroundColor Yellow
    aws dynamodb describe-table --table-name "mva-crm-Leads-production" --region us-east-1 --query "Table.TableStatus"
}

Write-Host "`n🎯 Leads table setup complete!" -ForegroundColor Green 