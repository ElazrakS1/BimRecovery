using System.Net;
using System.Text.Json;

namespace Bim.Server.Middleware
{
    public class ApiAuthenticationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ApiAuthenticationMiddleware> _logger;

        public ApiAuthenticationMiddleware(RequestDelegate next, ILogger<ApiAuthenticationMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
                
                // Check if we're being redirected to the login page
                if (context.Response.StatusCode == (int)HttpStatusCode.Redirect && 
                    context.Response.Headers.Location.ToString().Contains("Login"))
                {
                    _logger.LogWarning("Intercepted redirect to Login, returning 401 instead");
                    
                    // Clear response headers
                    context.Response.Headers.Clear();
                    
                    // Reset the response
                    context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                    context.Response.ContentType = "application/json";
                    
                    var result = JsonSerializer.Serialize(new { message = "Authentication required" });
                    await context.Response.WriteAsync(result);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception in ApiAuthenticationMiddleware");
                throw;
            }
        }
    }

    // Extension method for middleware registration
    public static class ApiAuthenticationMiddlewareExtensions
    {
        public static IApplicationBuilder UseApiAuthentication(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<ApiAuthenticationMiddleware>();
        }
    }
}
