using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Bim.Server.Data;
using Bim.Server.Models;
using SystemTask = System.Threading.Tasks.Task;

namespace Bim.Server.Middleware
{
    public class ActivityLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ActivityLoggingMiddleware> _logger;

        public ActivityLoggingMiddleware(RequestDelegate next, ILogger<ActivityLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async SystemTask InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
        {
            var originalBodyStream = context.Response.Body;

            try
            {
                // Create a new memory stream
                using var responseBody = new MemoryStream();
                context.Response.Body = responseBody;

                // Get user info
                var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userName = context.User?.FindFirst(ClaimTypes.Name)?.Value;

                // Continue down the pipeline
                await _next(context);

                // Log based on the request and response
                if (userId != null && IsLoggableRequest(context.Request))
                {
                    var log = new SystemLog
                    {
                        Timestamp = DateTime.UtcNow,
                        UserId = userId,
                        UserName = userName,
                        Action = DetermineAction(context.Request.Method, context.Request.Path),
                        Resource = DetermineResource(context.Request.Path),
                        Details = GetRequestDetails(context.Request),
                        Level = DetermineLogLevel(context.Response.StatusCode),
                        IpAddress = context.Connection.RemoteIpAddress?.ToString()
                    };

                    dbContext.SystemLogs.Add(log);
                    await dbContext.SaveChangesAsync();
                }

                // Copy the response to the original stream
                responseBody.Seek(0, SeekOrigin.Begin);
                await responseBody.CopyToAsync(originalBodyStream);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in activity logging middleware");
                throw;
            }
            finally
            {
                context.Response.Body = originalBodyStream;
            }
        }

        private bool IsLoggableRequest(HttpRequest request)
        {
            // Skip logging for static files, health checks, etc.
            return !request.Path.StartsWithSegments("/static") &&
                   !request.Path.StartsWithSegments("/health") &&
                   !request.Path.StartsWithSegments("/favicon.ico");
        }

        private string DetermineAction(string method, PathString path)
        {
            switch (method.ToUpper())
            {
                case "GET":
                    return "view";
                case "POST":
                    return "create";
                case "PUT":
                case "PATCH":
                    return "update";
                case "DELETE":
                    return "delete";
                default:
                    return method.ToLower();
            }
        }

        private string DetermineResource(PathString path)
        {
            var segments = path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments?.Length > 1)
            {
                return segments[1].ToLower(); // api/users -> users
            }
            return "unknown";
        }

        private string GetRequestDetails(HttpRequest request)
        {
            return $"{request.Method} {request.Path}{request.QueryString}";
        }

        private string DetermineLogLevel(int statusCode)
        {
            if (statusCode >= 500)
                return "error";
            if (statusCode >= 400)
                return "warning";
            return "info";
        }
    }

    // Extension method for easy middleware registration
    public static class ActivityLoggingMiddlewareExtensions
    {
        public static IApplicationBuilder UseActivityLogging(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<ActivityLoggingMiddleware>();
        }
    }
}
