using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using Bim.Server.Data;
using Bim.Server.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using SystemTask = System.Threading.Tasks.Task;

namespace Bim.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class LogsController : ControllerBase
    {
        private readonly IDbContextFactory<ApplicationDbContext> _contextFactory;
        private readonly ILogger<LogsController> _logger;
        private const int MaxPageSize = 100;
        private const int DefaultPageSize = 50;
        private const int QueryTimeoutSeconds = 45;

        public LogsController(IDbContextFactory<ApplicationDbContext> contextFactory, ILogger<LogsController> logger)
        {
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string? userId,
            [FromQuery] string? action,
            [FromQuery] string? resource,
            [FromQuery] string? level,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = DefaultPageSize)
        {
            string requestId = HttpContext.TraceIdentifier;
            
            try
            {
                _logger.LogInformation(
                    "[RequestId: {RequestId}] GetLogs request received with parameters: startDate={StartDate}, endDate={EndDate}, page={Page}, pageSize={PageSize}",
                    requestId, startDate, endDate, page, pageSize);

                if (!startDate.HasValue || !endDate.HasValue)
                {
                    return BadRequest(new { 
                        message = "Les dates de début et de fin sont requises",
                        requestId,
                        code = "MISSING_DATES"
                    });
                }

                // Use separate context instances for count and data queries
                var totalCount = await GetTotalCount(startDate.Value, endDate.Value, userId, action, resource, level);
                var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

                var logs = await GetPagedLogs(
                    startDate.Value, endDate.Value, userId, action, resource, level, 
                    page, pageSize);

                return Ok(new {
                    Data = logs,
                    Pagination = new {
                        Page = page,
                        PageSize = pageSize,
                        TotalPages = totalPages,
                        TotalCount = totalCount
                    },
                    RequestId = requestId
                });
            }
            catch (TimeoutException)
            {
                _logger.LogError("[RequestId: {RequestId}] Query timeout", requestId);
                return StatusCode(503, new {
                    message = "La requête a pris trop de temps. Veuillez réduire la plage de dates ou affiner vos filtres.",
                    requestId,
                    code = "QUERY_TIMEOUT"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RequestId: {RequestId}] Unexpected error in GetLogs", requestId);
                return StatusCode(500, new {
                    message = "Une erreur inattendue s'est produite",
                    details = ex.Message,
                    requestId,
                    code = "UNEXPECTED_ERROR"
                });
            }
        }

        private async Task<int> GetTotalCount(
            DateTime startDate,
            DateTime endDate,
            string? userId,
            string? action,
            string? resource,
            string? level)
        {
            using var context = _contextFactory.CreateDbContext();
            var utcStartDate = startDate.ToUniversalTime();
            var utcEndDate = endDate.ToUniversalTime();

            var query = context.SystemLogs
                .AsNoTracking()
                .Where(l => l.Timestamp >= utcStartDate && l.Timestamp <= utcEndDate);

            query = ApplyFilters(query, userId, action, resource, level);            var countTask = query.CountAsync();
            var timeoutTask = SystemTask.Delay(TimeSpan.FromSeconds(QueryTimeoutSeconds));
                
            if (await SystemTask.WhenAny(countTask, timeoutTask) == timeoutTask)
            {
                throw new TimeoutException("Count query timed out");
            }

            return await countTask;
        }

        private async Task<object[]> GetPagedLogs(
            DateTime startDate,
            DateTime endDate,
            string? userId,
            string? action,
            string? resource,
            string? level,
            int page,
            int pageSize)
        {
            using var context = _contextFactory.CreateDbContext();
            var utcStartDate = startDate.ToUniversalTime();
            var utcEndDate = endDate.ToUniversalTime();

            var query = context.SystemLogs
                .AsNoTracking()
                .Where(l => l.Timestamp >= utcStartDate && l.Timestamp <= utcEndDate);

            query = ApplyFilters(query, userId, action, resource, level);

            var dataTask = query
                .OrderByDescending(l => l.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new {
                    l.Id,
                    l.Timestamp,
                    l.Action,
                    l.Resource,
                    l.Details,
                    l.Level,
                    l.IpAddress,
                    l.UserId,
                    l.UserName
                })
                .ToArrayAsync();            var timeoutTask = SystemTask.Delay(TimeSpan.FromSeconds(QueryTimeoutSeconds));
                
            if (await SystemTask.WhenAny(dataTask, timeoutTask) == timeoutTask)
            {
                throw new TimeoutException("Data query timed out");
            }

            return await dataTask;
        }

        private static IQueryable<SystemLog> ApplyFilters(
            IQueryable<SystemLog> query,
            string? userId,
            string? action,
            string? resource,
            string? level)
        {
            if (!string.IsNullOrEmpty(userId))
                query = query.Where(l => l.UserId == userId);
            if (!string.IsNullOrEmpty(action))
                query = query.Where(l => l.Action.Contains(action));
            if (!string.IsNullOrEmpty(resource))
                query = query.Where(l => l.Resource.Contains(resource));
            if (!string.IsNullOrEmpty(level))
                query = query.Where(l => l.Level.ToLower() == level.ToLower());

            return query;
        }
    }
}
