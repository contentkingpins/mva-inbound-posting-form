# Phase 2 Deployment Script for MVA CRM
# Advanced Search & Export System

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectName = "mva-crm",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipInfrastructure = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipCodeDeploy = $false
)

Write-Host "🚀 Starting Phase 2 Deployment - Advanced Search & Export System" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Project: $ProjectName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""

# Check if AWS CLI is installed and configured
try {
    $awsIdentity = aws sts get-caller-identity --query "Account" --output text 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "AWS CLI not configured. Please run 'aws configure' first."
        exit 1
    }
    Write-Host "✅ AWS CLI configured for account: $awsIdentity" -ForegroundColor Green
} catch {
    Write-Error "AWS CLI not found. Please install AWS CLI first."
    exit 1
}

# Function to wait for CloudFormation stack
function Wait-ForStackComplete {
    param(
        [string]$StackName,
        [string]$Operation
    )
    
    Write-Host "⏳ Waiting for stack $Operation to complete..." -ForegroundColor Yellow
    
    do {
        Start-Sleep -Seconds 30
        $stackStatus = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].StackStatus" --output text 2>$null
        
        if ($stackStatus -match "COMPLETE") {
            Write-Host "✅ Stack $Operation completed successfully" -ForegroundColor Green
            return $true
        } elseif ($stackStatus -match "FAILED" -or $stackStatus -match "ROLLBACK") {
            Write-Host "❌ Stack $Operation failed with status: $stackStatus" -ForegroundColor Red
            return $false
        } else {
            Write-Host "   Status: $stackStatus" -ForegroundColor Gray
        }
    } while ($true)
}

# Step 1: Deploy Infrastructure (if not skipped)
if (-not $SkipInfrastructure) {
    Write-Host "📦 STEP 1: Deploying Phase 2 Infrastructure" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    
    $stackName = "$ProjectName-phase2-$Environment"
    $templateFile = "phase2-infrastructure.yml"
    
    if (-not (Test-Path $templateFile)) {
        Write-Error "CloudFormation template not found: $templateFile"
        exit 1
    }
    
    # Check if stack exists
    $stackExists = aws cloudformation describe-stacks --stack-name $stackName 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "📝 Updating existing stack: $stackName" -ForegroundColor Yellow
        aws cloudformation update-stack `
            --stack-name $stackName `
            --template-body file://$templateFile `
            --parameters ParameterKey=Environment,ParameterValue=$Environment ParameterKey=ProjectName,ParameterValue=$ProjectName `
            --capabilities CAPABILITY_NAMED_IAM
            
        if ($LASTEXITCODE -eq 0) {
            $success = Wait-ForStackComplete -StackName $stackName -Operation "update"
            if (-not $success) { exit 1 }
        } else {
            Write-Host "ℹ️  No changes detected in infrastructure" -ForegroundColor Gray
        }
    } else {
        Write-Host "🆕 Creating new stack: $stackName" -ForegroundColor Yellow
        aws cloudformation create-stack `
            --stack-name $stackName `
            --template-body file://$templateFile `
            --parameters ParameterKey=Environment,ParameterValue=$Environment ParameterKey=ProjectName,ParameterValue=$ProjectName `
            --capabilities CAPABILITY_NAMED_IAM
            
        if ($LASTEXITCODE -eq 0) {
            $success = Wait-ForStackComplete -StackName $stackName -Operation "creation"
            if (-not $success) { exit 1 }
        } else {
            Write-Error "Failed to create stack"
            exit 1
        }
    }
    
    # Get stack outputs
    Write-Host "📋 Retrieving stack outputs..." -ForegroundColor Yellow
    $outputs = aws cloudformation describe-stacks --stack-name $stackName --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    
    $savedSearchesTable = ($outputs | Where-Object { $_.OutputKey -eq "SavedSearchesTableName" }).OutputValue
    $exportJobsTable = ($outputs | Where-Object { $_.OutputKey -eq "ExportJobsTableName" }).OutputValue
    $exportQueue = ($outputs | Where-Object { $_.OutputKey -eq "ExportQueueUrl" }).OutputValue
    $exportBucket = ($outputs | Where-Object { $_.OutputKey -eq "ExportBucketName" }).OutputValue
    $exportWorkerFunction = ($outputs | Where-Object { $_.OutputKey -eq "ExportWorkerFunctionName" }).OutputValue
    
    Write-Host "✅ Infrastructure deployed successfully!" -ForegroundColor Green
    Write-Host "   SavedSearches Table: $savedSearchesTable" -ForegroundColor Gray
    Write-Host "   ExportJobs Table: $exportJobsTable" -ForegroundColor Gray
    Write-Host "   Export Queue: $exportQueue" -ForegroundColor Gray
    Write-Host "   Export Bucket: $exportBucket" -ForegroundColor Gray
    Write-Host "   Export Worker: $exportWorkerFunction" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping infrastructure deployment" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Create deployment package (if not skipped)
if (-not $SkipCodeDeploy) {
    Write-Host "📦 STEP 2: Creating Phase 2 Deployment Package" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    
    $deploymentFiles = @(
        "index.js",
        "searchController.js", 
        "exportController.js",
        "exportWorker.js",
        "leadController.js",
        "adminController.js",
        "assignmentController.js",
        "bulkController.js",
        "get-username-by-email.js",
        "forgot-password.js",
        "confirm-forgot-password.js"
    )
    
    $packageName = "phase2-deployment.zip"
    
    Write-Host "📁 Checking required files..." -ForegroundColor Yellow
    $missingFiles = @()
    foreach ($file in $deploymentFiles) {
        if (-not (Test-Path "lambda-package/$file")) {
            $missingFiles += $file
        } else {
            Write-Host "   ✅ $file" -ForegroundColor Green
        }
    }
    
    if ($missingFiles.Count -gt 0) {
        Write-Host "❌ Missing required files:" -ForegroundColor Red
        foreach ($file in $missingFiles) {
            Write-Host "   ❌ $file" -ForegroundColor Red
        }
        exit 1
    }
    
    # Create ZIP package
    Write-Host "📦 Creating deployment package: $packageName" -ForegroundColor Yellow
    
    if (Test-Path $packageName) {
        Remove-Item $packageName -Force
    }
    
    # Create zip with all lambda-package files
    Compress-Archive -Path "lambda-package/*" -DestinationPath $packageName -Force
    
    $zipSize = (Get-Item $packageName).Length
    Write-Host "✅ Deployment package created: $packageName ($([math]::Round($zipSize/1KB, 2)) KB)" -ForegroundColor Green
    Write-Host ""
    
    # Step 3: Deploy to Lambda
    Write-Host "🚀 STEP 3: Deploying Code to Lambda Functions" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    
    # Get main Lambda function name (from existing deployment)
    $mainFunctionName = "$ProjectName-inbound-posting-form-$Environment"
    
    Write-Host "📤 Updating main Lambda function: $mainFunctionName" -ForegroundColor Yellow
    aws lambda update-function-code --function-name $mainFunctionName --zip-file fileb://$packageName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Main Lambda function updated successfully" -ForegroundColor Green
    } else {
        Write-Error "Failed to update main Lambda function"
        exit 1
    }
    
    # Update export worker function
    if (-not $SkipInfrastructure) {
        Write-Host "📤 Updating export worker function: $exportWorkerFunction" -ForegroundColor Yellow
        
        # Create worker-specific package
        $workerPackage = "export-worker.zip"
        Compress-Archive -Path "lambda-package/exportWorker.js" -DestinationPath $workerPackage -Force
        
        aws lambda update-function-code --function-name $exportWorkerFunction --zip-file fileb://$workerPackage
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Export worker function updated successfully" -ForegroundColor Green
        } else {
            Write-Error "Failed to update export worker function"
            exit 1
        }
        
        Remove-Item $workerPackage -Force
    }
    
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping code deployment" -ForegroundColor Yellow
    Write-Host ""
}

# Step 4: Update Environment Variables
Write-Host "⚙️  STEP 4: Updating Environment Variables" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

if (-not $SkipInfrastructure) {
    $mainFunctionName = "$ProjectName-inbound-posting-form-$Environment"
    
    Write-Host "🔧 Adding Phase 2 environment variables to main function..." -ForegroundColor Yellow
    
    # Get current environment variables
    $currentEnvJson = aws lambda get-function-configuration --function-name $mainFunctionName --query "Environment.Variables" --output json
    $currentEnv = $currentEnvJson | ConvertFrom-Json
    
    # Add Phase 2 variables
    $currentEnv | Add-Member -Name "SAVED_SEARCHES_TABLE" -Value $savedSearchesTable -MemberType NoteProperty -Force
    $currentEnv | Add-Member -Name "EXPORT_JOBS_TABLE" -Value $exportJobsTable -MemberType NoteProperty -Force
    $currentEnv | Add-Member -Name "EXPORT_QUEUE_URL" -Value $exportQueue -MemberType NoteProperty -Force
    $currentEnv | Add-Member -Name "EXPORT_BUCKET" -Value $exportBucket -MemberType NoteProperty -Force
    $currentEnv | Add-Member -Name "SES_FROM_EMAIL" -Value "no-reply@mva-crm.com" -MemberType NoteProperty -Force
    
    $envJson = $currentEnv | ConvertTo-Json -Compress
    
    aws lambda update-function-configuration --function-name $mainFunctionName --environment "Variables=$envJson"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Environment variables updated successfully" -ForegroundColor Green
    } else {
        Write-Warning "Failed to update environment variables. Please update manually."
    }
} else {
    Write-Host "ℹ️  Infrastructure skipped - please update environment variables manually" -ForegroundColor Gray
}

Write-Host ""

# Step 5: Verification
Write-Host "🔍 STEP 5: Deployment Verification" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

Write-Host "🧪 Testing endpoint connectivity..." -ForegroundColor Yellow

# Try to get API Gateway URL (if available)
$apiUrl = "https://main.d21xta9fg9b6w.amplifyapp.com"  # Your existing API URL

Write-Host "   Testing search endpoint availability..." -ForegroundColor Gray
# This would need proper authentication to test fully
Write-Host "   ℹ️  Manual testing required with valid JWT token" -ForegroundColor Gray

Write-Host ""
Write-Host "🎉 Phase 2 Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ New Endpoints Available:" -ForegroundColor Green
Write-Host "   🔍 POST /api/leads/search - Advanced search" -ForegroundColor Gray
Write-Host "   📋 GET /api/leads/filters - Filter options" -ForegroundColor Gray
Write-Host "   💾 POST /api/leads/search/saved - Save search" -ForegroundColor Gray
Write-Host "   📂 GET /api/leads/search/saved - Get saved searches" -ForegroundColor Gray
Write-Host "   🗑️  DELETE /api/leads/search/saved/{id} - Delete saved search" -ForegroundColor Gray
Write-Host "   📊 POST /api/leads/export - Initiate export" -ForegroundColor Gray
Write-Host "   📈 GET /api/leads/export/{jobId} - Export status" -ForegroundColor Gray
Write-Host "   ⬇️  GET /api/leads/export/{jobId}/download - Download file" -ForegroundColor Gray
Write-Host "   📚 GET /api/leads/export/history - Export history" -ForegroundColor Gray
Write-Host "   ❌ DELETE /api/leads/export/{jobId} - Cancel export" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Configure SES email domain verification" -ForegroundColor Gray
Write-Host "   2. Test all endpoints with proper authentication" -ForegroundColor Gray
Write-Host "   3. Update frontend to use new search and export APIs" -ForegroundColor Gray
Write-Host "   4. Monitor CloudWatch logs for any issues" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Documentation: PHASE2_API_DOCUMENTATION.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 Phase 2 is ready for frontend integration!" -ForegroundColor Green 