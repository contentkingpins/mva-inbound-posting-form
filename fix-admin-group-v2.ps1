# Fix Admin Authentication with Cognito Groups
Write-Host "Fixing admin authentication with Cognito Groups..." -ForegroundColor Yellow

# Step 1: Create admin group if it doesn't exist
Write-Host "Creating admin group..." -ForegroundColor Blue
aws cognito-idp create-group --group-name "admin" --user-pool-id "us-east-1_lhc964tLD" --description "Admin users with full access" --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Admin group created successfully" -ForegroundColor Green
} else {
    Write-Host "Admin group may already exist (this is OK)" -ForegroundColor Yellow
}

# Step 2: Add admin user to admin group
Write-Host "Adding admin user to admin group..." -ForegroundColor Blue
aws cognito-idp admin-add-user-to-group --user-pool-id "us-east-1_lhc964tLD" --username "admin" --group-name "admin" --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Admin user added to admin group successfully" -ForegroundColor Green
} else {
    Write-Host "Failed to add user to group" -ForegroundColor Red
}

Write-Host "Admin group setup complete!" -ForegroundColor Green 