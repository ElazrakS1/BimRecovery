using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace Bim.Server.Middleware
{
    /// <summary>
    /// Middleware pour la gestion des en-têtes HTTP
    /// </summary>
    public class HeadersMiddleware
    {
        private readonly RequestDelegate _next;

        public HeadersMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Continuer le pipeline
            await _next(context);

            // Vérifier si la réponse a déjà commencé avant de modifier les en-têtes
            if (context.Response.HasStarted)
            {
                // Si la réponse a déjà commencé, ne pas modifier les en-têtes
                return;
            }

            // Modifier les en-têtes après traitement par les autres middlewares
            if (context.Response.Headers.ContainsKey("Permissions-Policy"))
            {
                // Supprimer les en-têtes Permissions-Policy problématiques
                context.Response.Headers.Remove("Permissions-Policy");

                // Optionnel: remettre un en-tête Permissions-Policy corrigé
                context.Response.Headers["Permissions-Policy"] = 
                    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), " +
                    "payment=(), usb=()";
            }

            // Ajouter d'autres en-têtes de sécurité utiles
            if (!context.Response.Headers.ContainsKey("X-Content-Type-Options"))
            {
                context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            }

            if (!context.Response.Headers.ContainsKey("X-XSS-Protection"))
            {
                context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
            }
        }
    }

    // Extension method pour faciliter l'utilisation du middleware
    public static class HeadersMiddlewareExtensions
    {
        public static IApplicationBuilder UseHeadersMiddleware(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<HeadersMiddleware>();
        }
    }
}
