# Script PowerShell pour tester l'endpoint des utilisateurs
# Test de l'endpoint /api/collaborationtasks/available-users

$baseUrl = "https://localhost:7128"
$endpoint = "/api/collaborationtasks/available-users"
$fullUrl = "$baseUrl$endpoint"

Write-Host "🔍 Testing user endpoint..." -ForegroundColor Yellow
Write-Host "📍 URL: $fullUrl" -ForegroundColor Cyan

try {
    # Ignorer les erreurs SSL pour les tests en développement
    add-type @"
        using System.Net;
        using System.Security.Cryptography.X509Certificates;
        public class TrustAllCertsPolicy : ICertificatePolicy {
            public bool CheckValidationResult(
                ServicePoint srvPoint, X509Certificate certificate,
                WebRequest request, int certificateProblem) {
                return true;
            }
        }
"@
    [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

    Write-Host "`n1️⃣ Testing without authentication..." -ForegroundColor Blue
    
    $response = Invoke-RestMethod -Uri $fullUrl -Method Get -Headers @{
        "Content-Type" = "application/json"
    } -ErrorAction Stop
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "📊 Response received:" -ForegroundColor Green
    
    if ($response -is [array]) {
        Write-Host "📈 User Count: $($response.Count)" -ForegroundColor Green
        
        for ($i = 0; $i -lt $response.Count; $i++) {
            $user = $response[$i]
            Write-Host "   User $($i + 1): $($user.firstName) $($user.lastName) ($($user.email))" -ForegroundColor White
        }
    } else {
        Write-Host "📋 Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ ERROR occurred:" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        Write-Host "   Status: $statusCode $statusDescription" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host "🔑 Authentication required - trying with token..." -ForegroundColor Yellow
            
            # Essayer avec authentification
            try {
                $loginUrl = "$baseUrl/api/auth/login"
                $loginData = @{
                    email = "admin@bimrecovery.com"
                    password = "Admin@123456"
                } | ConvertTo-Json
                
                Write-Host "`n2️⃣ Attempting login..." -ForegroundColor Blue
                $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $loginData -ContentType "application/json" -ErrorAction Stop
                
                if ($loginResponse.token) {
                    Write-Host "✅ Login successful!" -ForegroundColor Green
                    $token = $loginResponse.token
                    
                    # Tester l'endpoint avec le token
                    $authHeaders = @{
                        "Authorization" = "Bearer $token"
                        "Content-Type" = "application/json"
                    }
                    
                    Write-Host "`n3️⃣ Testing with authentication..." -ForegroundColor Blue
                    $authResponse = Invoke-RestMethod -Uri $fullUrl -Method Get -Headers $authHeaders -ErrorAction Stop
                    
                    Write-Host "✅ AUTH SUCCESS!" -ForegroundColor Green
                    Write-Host "📈 User Count: $($authResponse.Count)" -ForegroundColor Green
                    
                    for ($i = 0; $i -lt $authResponse.Count; $i++) {
                        $user = $authResponse[$i]
                        Write-Host "   User $($i + 1): $($user.firstName) $($user.lastName) ($($user.email))" -ForegroundColor White
                    }
                } else {
                    Write-Host "❌ Login failed - no token received" -ForegroundColor Red
                }
                
            } catch {
                Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n✅ Test completed!" -ForegroundColor Green
