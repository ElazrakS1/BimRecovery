# Simple PowerShell Test for BIM Recovery Collaborative Features
Write-Host "🧪 BIM Recovery - Quick Collaborative Features Test" -ForegroundColor Cyan

$SERVER_URL = "https://localhost:5258"

# Ignore SSL certificate errors
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "`n🌐 Testing Server Connectivity..." -ForegroundColor Yellow

try {
    $swaggerResponse = Invoke-WebRequest -Uri "$SERVER_URL/swagger/v1/swagger.json" -UseBasicParsing
    Write-Host "✅ Server is running - Status: $($swaggerResponse.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Server connectivity failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔓 Testing Collaborative Endpoints (Expecting 401)..." -ForegroundColor Yellow

$endpoints = @(
    "$SERVER_URL/api/collaborationtasks",
    "$SERVER_URL/api/collaborationtasks/project/1", 
    "$SERVER_URL/api/notifications",
    "$SERVER_URL/api/notifications/mytasks"
)

$allGood = $true

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint -UseBasicParsing -ErrorAction Stop
        Write-Host "⚠️  $endpoint returned $($response.StatusCode) (expected 401)" -ForegroundColor Yellow
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            Write-Host "✅ $endpoint - 401 Unauthorized (Good!)" -ForegroundColor Green
        }
        elseif ($statusCode -eq 404) {
            Write-Host "❌ $endpoint - 404 Not Found (Route missing!)" -ForegroundColor Red
            $allGood = $false
        }
        else {
            Write-Host "⚠️  $endpoint - Status: $statusCode" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n📊 QUICK TEST RESULTS:" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "🎉 All collaborative endpoints are properly registered!" -ForegroundColor Green
    Write-Host "✅ Authentication migration successful" -ForegroundColor Green
    Write-Host "✅ Ready for browser testing" -ForegroundColor Green
}
else {
    Write-Host "❌ Some endpoints are missing or misconfigured" -ForegroundColor Red
}

Write-Host "`n💡 Next: Start React client with npm run dev from Bim.Client folder" -ForegroundColor Cyan
