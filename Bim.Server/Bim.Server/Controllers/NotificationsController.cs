using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Bim.Server.Models.DTOs;
using Bim.Server.Services;
using System.Security.Claims;
using SystemTask = System.Threading.Tasks.Task;

namespace Bim.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(
            INotificationService notificationService,
            ILogger<NotificationsController> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetNotifications([FromQuery] bool unreadOnly = false)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
                // In development mode, provide a fallback user ID for testing
                if (string.IsNullOrEmpty(userId) && Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
                {
                    _logger.LogWarning("No user ID found in claims, using fallback ID for development testing");
                    userId = "d65f3b6f-db0b-42d9-9ac4-62af5ca6cbf1"; // Use the same ID we saw in logs
                }
                else if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt to notifications endpoint");
                    return Unauthorized();
                }

                _logger.LogInformation($"Fetching notifications for user {userId}, unreadOnly: {unreadOnly}");
                var notifications = await _notificationService.GetUserNotificationsAsync(userId, unreadOnly);
                
                var result = notifications.Select(n => new
                {
                    n.Id,
                    n.Type,
                    n.Title,
                    n.Message,
                    n.Data,
                    n.CreatedAt,
                    n.IsRead,
                    n.ReadAt
                });

                _logger.LogInformation($"Returning {result.Count()} notifications for user {userId}");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching notifications");
                return StatusCode(500, "Error fetching notifications");
            }
        }

        [HttpPost]
        public async System.Threading.Tasks.Task<ActionResult> SendNotification(CreateNotificationDto createDto)
        {
            try
            {
                await _notificationService.SendNotificationAsync(createDto);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending notification");
                return StatusCode(500, "Error sending notification");
            }
        }

        [HttpPut("{id}/read")]
        public async System.Threading.Tasks.Task<ActionResult> MarkAsRead(int id)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
                // In development mode, provide a fallback user ID for testing
                if (string.IsNullOrEmpty(userId) && Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
                {
                    _logger.LogWarning("No user ID found in claims for marking as read, using fallback ID");
                    userId = "d65f3b6f-db0b-42d9-9ac4-62af5ca6cbf1"; // Use the same ID we saw in logs
                }
                else if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                _logger.LogInformation($"Marking notification {id} as read for user {userId}");
                await _notificationService.MarkAsReadAsync(id, userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification as read");
                return StatusCode(500, "Error marking notification as read");
            }
        }

        [HttpPut("read-all")]
        public async System.Threading.Tasks.Task<ActionResult> MarkAllAsRead()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
                // In development mode, provide a fallback user ID for testing
                if (string.IsNullOrEmpty(userId) && Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
                {
                    _logger.LogWarning("No user ID found in claims for marking all as read, using fallback ID");
                    userId = "d65f3b6f-db0b-42d9-9ac4-62af5ca6cbf1"; // Use the same ID we saw in logs
                }
                else if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                _logger.LogInformation($"Marking all notifications as read for user {userId}");
                await _notificationService.MarkAllAsReadAsync(userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all notifications as read");
                return StatusCode(500, "Error marking all notifications as read");
            }
        }

        [HttpGet("preferences")]
        public async Task<ActionResult<NotificationPreferencesDto>> GetPreferences()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized();

                var preferences = await _notificationService.GetNotificationPreferencesAsync(userId);
                return Ok(preferences);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching notification preferences");
                return StatusCode(500, "Error fetching notification preferences");
            }
        }

        [HttpPut("preferences")]
        public async System.Threading.Tasks.Task<ActionResult> UpdatePreferences(NotificationPreferencesDto preferences)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized();

                await _notificationService.UpdateNotificationPreferencesAsync(userId, preferences);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating notification preferences");
                return StatusCode(500, "Error updating notification preferences");
            }
        }
    }
}
