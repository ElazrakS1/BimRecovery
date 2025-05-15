using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Bim.Server.Middleware
{
    public class WebAssemblyMiddleware
    {
        private readonly RequestDelegate _next;

        public WebAssemblyMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.Request.Path.ToString().EndsWith(".wasm"))
            {
                context.Response.Headers["Content-Type"] = "application/wasm";
            }
            else if (context.Request.Path.ToString().EndsWith(".worker.js"))
            {
                context.Response.Headers["Content-Type"] = "text/javascript";
            }

            await _next(context);
        }
    }

    public static class WebAssemblyMiddlewareExtensions
    {
        public static IApplicationBuilder UseWebAssembly(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<WebAssemblyMiddleware>();
        }
    }
}
