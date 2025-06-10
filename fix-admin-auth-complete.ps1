# Complete Fix for Admin Authentication Issue
Write-Host "🚀 Complete Admin Authentication Fix..." -ForegroundColor Yellow

Write-Host "`n=== Step 1: Setup Cognito Groups ===" -ForegroundColor Cyan
./fix-admin-group.ps1

Write-Host "`n=== Step 2: Deploy Updated Lambda Function ===" -ForegroundColor Cyan
./deploy-admin-fixes.ps1

Write-Host "`n=== Step 3: Test Authentication ===" -ForegroundColor Cyan

# Login to get new tokens with group membership
Write-Host "Getting fresh JWT tokens..." -ForegroundColor Blue
$loginResponse = Invoke-WebRequest -Uri "https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"MVAAdmin2025!"}'
$loginData = $loginResponse.Content | ConvertFrom-Json
$jwtToken = $loginData.tokens.accessToken

Write-Host "JWT Token (first 50 chars): $($jwtToken.Substring(0,50))..." -ForegroundColor Green

# Test all admin endpoints
$endpoints = @(
    @{Name="/admin/stats"; Url="https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/admin/stats"},
    @{Name="/admin/analytics"; Url="https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/admin/analytics"},
    @{Name="/leads"; Url="https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads"},
    @{Name="/vendors"; Url="https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/vendors"}
)

$successCount = 0
foreach ($endpoint in $endpoints) {
    Write-Host "Testing $($endpoint.Name)..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri $endpoint.Url -Headers @{"Authorization"="Bearer $jwtToken"} -Method GET
        Write-Host "✅ $($endpoint.Name): SUCCESS (Status: $($response.StatusCode))" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "❌ $($endpoint.Name): FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎯 Testing Summary:" -ForegroundColor Green
Write-Host "✅ Successfully tested: $successCount/4 endpoints" -ForegroundColor $(if($successCount -eq 4){'Green'}else{'Yellow'})

if ($successCount -eq 4) {
    Write-Host "`n🚀 ALL ADMIN AUTHENTICATION ISSUES FIXED!" -ForegroundColor Green
    Write-Host "The frontend team can now proceed with testing." -ForegroundColor White
} else {
    Write-Host "`n⚠️ Some endpoints still have issues. Check logs for details." -ForegroundColor Yellow
} 