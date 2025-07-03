using Microsoft.AspNetCore.Http;
using System.Net;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

namespace Bim.Server.Middleware
{
    public class GlobalExceptionHandlerMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;
        private readonly IWebHostEnvironment _env;

        public GlobalExceptionHandlerMiddleware(
            RequestDelegate next,
            ILogger<GlobalExceptionHandlerMiddleware> logger,
            IWebHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception has occurred");
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception ex)
        {
            context.Response.ContentType = "application/json";
            
            int statusCode;
            object response;

            if (ex is SecurityTokenExpiredException)
            {
                statusCode = (int)HttpStatusCode.Unauthorized;
                response = new {
                    success = false,
                    message = "Session expirée",
                    code = "TokenExpired",
                    details = _env.IsDevelopment() ? ex.Message : null
                };
            }
            else if (ex is SecurityTokenValidationException)
            {
                statusCode = (int)HttpStatusCode.Unauthorized;
                response = new {
                    success = false,
                    message = "Token d'authentification invalide",
                    code = "TokenValidationError",
                    details = _env.IsDevelopment() ? ex.Message : null
                };
            }
            else if (ex is SecurityTokenException)
            {
                statusCode = (int)HttpStatusCode.InternalServerError;
                response = new {
                    success = false,
                    message = "Erreur lors de la génération du token d'authentification",
                    code = "TokenGenerationError",
                    details = _env.IsDevelopment() ? ex.Message : null
                };
            }
            else if (ex is InvalidOperationException && ex.Message.Contains("JWT"))
            {
                statusCode = (int)HttpStatusCode.InternalServerError;
                response = new {
                    success = false,
                    message = "Erreur de configuration du serveur JWT",
                    code = "JWTConfigurationError",
                    details = _env.IsDevelopment() ? ex.Message : null
                };
            }
            else if (ex is UnauthorizedAccessException)
            {
                statusCode = (int)HttpStatusCode.Unauthorized;
                response = new {
                    success = false,
                    message = "Non autorisé",
                    code = "Unauthorized",
                    details = _env.IsDevelopment() ? ex.Message : null
                };
            }
            else
            {
                statusCode = (int)HttpStatusCode.InternalServerError;
                response = new {
                    success = false,
                    message = "Une erreur inattendue s'est produite",
                    code = "UnexpectedError",
                    details = _env.IsDevelopment() ? ex.Message : null,
                    path = context.Request.Path,
                    method = context.Request.Method
                };
            }

            context.Response.StatusCode = statusCode;

            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = null,
                WriteIndented = true
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
        }
    }

    public static class GlobalExceptionHandlerMiddlewareExtensions
    {
        public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
        {
            return app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
        }
    }
}
