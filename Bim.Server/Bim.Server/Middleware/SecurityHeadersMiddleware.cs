using Microsoft.AspNetCore.Http;

namespace Bim.Server.Middleware
{
    public class SecurityHeadersMiddleware
    {
        private readonly RequestDelegate _next;

        public SecurityHeadersMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Add security headers
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers["X-Frame-Options"] = "SAMEORIGIN";
            context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
            context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
              // Set Permissions-Policy header with standardized permissions
            context.Response.Headers["Permissions-Policy"] = 
                "accelerometer=(), " +
                "ambient-light-sensor=(), " +
                "autoplay=(), " +
                "battery=(), " +
                "camera=(), " +
                "cross-origin-isolated=(), " +
                "display-capture=(), " +
                "document-domain=(), " +
                "encrypted-media=(), " +
                "execution-while-not-rendered=(), " +
                "execution-while-out-of-viewport=(), " +
                "fullscreen=(), " +
                "geolocation=(), " +
                "gyroscope=(), " +
                "keyboard-map=(), " +
                "magnetometer=(), " +
                "microphone=(), " +
                "midi=(), " +
                "payment=(), " +
                "picture-in-picture=(), " +
                "publickey-credentials-get=(), " +
                "screen-wake-lock=(), " +
                "sync-xhr=(), " +
                "usb=(), " +
                "web-share=(), " +
                "xr-spatial-tracking=()";

            await _next(context);
        }
    }

    public static class SecurityHeadersMiddlewareExtensions
    {
        public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<SecurityHeadersMiddleware>();
        }
    }
}
