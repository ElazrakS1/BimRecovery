using System.Text;
using Newtonsoft.Json;

namespace Bim.Server.Middleware
{
    public class DetailedLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<DetailedLoggingMiddleware> _logger;

        public DetailedLoggingMiddleware(RequestDelegate next, ILogger<DetailedLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try {
                var originalBodyStream = context.Response.Body;
                using var responseBody = new MemoryStream();
                context.Response.Body = responseBody;

                // Let the pipeline continue
                await _next(context);

                // Log response details for 500 errors
                if (context.Response.StatusCode == 500)
                {
                    responseBody.Seek(0, SeekOrigin.Begin);
                    var responseBodyText = await new StreamReader(responseBody).ReadToEndAsync();
                    
                    var logInfo = new {
                        Path = context.Request.Path,
                        Method = context.Request.Method,
                        StatusCode = context.Response.StatusCode,
                        ResponseBody = responseBodyText,
                        Headers = context.Response.Headers.ToDictionary(h => h.Key, h => h.Value.ToString())
                    };

                    _logger.LogError("Server Error Details: {Details}", 
                        JsonConvert.SerializeObject(logInfo, Formatting.Indented));
                }

                // Copy back to the original stream
                responseBody.Seek(0, SeekOrigin.Begin);
                await responseBody.CopyToAsync(originalBodyStream);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in logging middleware");
                throw;
            }
        }
    }

    public static class DetailedLoggingMiddlewareExtensions
    {
        public static IApplicationBuilder UseDetailedLogging(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<DetailedLoggingMiddleware>();
        }
    }
}
