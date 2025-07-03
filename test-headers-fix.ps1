Write-Host "Test de correction du HeadersMiddleware" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green

# URL de l'API
$apiUrl = "https://localhost:5001/api/values"

try {
    Write-Host "Envoi d'une requête HEAD à $apiUrl pour vérifier les en-têtes..." -ForegroundColor Yellow
    
    # Ignorer les erreurs de certificat pour les tests locaux
    if (-not ([System.Management.Automation.PSTypeName]'ServerCertificateValidationCallback').Type) {
        $certCallback = @"
using System;
using System.Net;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
public class ServerCertificateValidationCallback
{
    public static void Ignore()
    {
        if(ServicePointManager.ServerCertificateValidationCallback ==null)
        {
            ServicePointManager.ServerCertificateValidationCallback += 
                delegate
                (
                    Object obj, 
                    X509Certificate certificate, 
                    X509Chain chain, 
                    SslPolicyErrors errors
                )
                {
                    return true;
                };
        }
    }
}
"@
        Add-Type $certCallback
    }
    [ServerCertificateValidationCallback]::Ignore()
    
    # Envoi de la requête HEAD
    $request = [System.Net.WebRequest]::Create($apiUrl)
    $request.Method = "HEAD"
    $request.Timeout = 5000
    
    try {
        $response = $request.GetResponse()
        
        Write-Host "`nRéponse reçue! Status: " -ForegroundColor Green -NoNewline
        Write-Host "$([int]$response.StatusCode) $($response.StatusDescription)" -ForegroundColor Cyan
        
        Write-Host "`nEn-têtes de réponse:" -ForegroundColor Green
        foreach ($key in $response.Headers.AllKeys) {
            Write-Host "$key : " -ForegroundColor Yellow -NoNewline
            Write-Host "$($response.Headers[$key])" -ForegroundColor White
        }
        
        # Vérifier si l'en-tête Permissions-Policy est présent
        if ($response.Headers["Permissions-Policy"]) {
            Write-Host "`n⚠️ L'en-tête Permissions-Policy est toujours présent avec la valeur:" -ForegroundColor DarkYellow
            Write-Host $response.Headers["Permissions-Policy"] -ForegroundColor White
        } else {
            Write-Host "`n✅ L'en-tête Permissions-Policy a bien été supprimé." -ForegroundColor Green
        }
        
        # Vérifier les autres en-têtes de sécurité
        if ($response.Headers["X-Content-Type-Options"]) {
            Write-Host "`n✅ L'en-tête X-Content-Type-Options est présent avec la valeur:" -ForegroundColor Green
            Write-Host $response.Headers["X-Content-Type-Options"] -ForegroundColor White
        }
        
        if ($response.Headers["X-XSS-Protection"]) {
            Write-Host "`n✅ L'en-tête X-XSS-Protection est présent avec la valeur:" -ForegroundColor Green
            Write-Host $response.Headers["X-XSS-Protection"] -ForegroundColor White
        }
        
        $response.Close()
        
    } catch [System.Net.WebException] {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            Write-Host "`nErreur HTTP: $([int]$errorResponse.StatusCode) $($errorResponse.StatusDescription)" -ForegroundColor Red
            
            # Essayer de récupérer les en-têtes même en cas d'erreur
            Write-Host "`nEn-têtes de réponse:" -ForegroundColor Yellow
            foreach ($key in $errorResponse.Headers.AllKeys) {
                Write-Host "$key : $($errorResponse.Headers[$key])" -ForegroundColor White
            }
        } else {
            Write-Host "`nErreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "`nErreur inattendue: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest terminé." -ForegroundColor Green
