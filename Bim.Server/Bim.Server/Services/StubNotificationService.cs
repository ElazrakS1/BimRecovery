using Bim.Server.Models;
using Bim.Server.Models.DTOs;
using SystemTask = System.Threading.Tasks.Task;

namespace Bim.Server.Services
{
    /// <summary>
    /// Temporary stub implementation of INotificationService to get the server running
    /// </summary>
    public class StubNotificationService : INotificationService
    {
        private readonly ILogger<StubNotificationService>? _logger;
        private static readonly Dictionary<string, List<Notification>> _userNotifications = new();
        private static int _nextNotificationId = 4; // Start after our sample notifications

        public StubNotificationService(ILogger<StubNotificationService>? logger = null)
        {
            _logger = logger;
        }

        public async SystemTask SendNotificationAsync(CreateNotificationDto notificationDto)
        {
            // Create a real notification in our in-memory storage
            var notification = new Notification
            {
                Id = _nextNotificationId++,
                UserId = notificationDto.UserId,
                Type = notificationDto.Type,
                Title = notificationDto.Title,
                Message = notificationDto.Message,
                Data = notificationDto.Data,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            if (!_userNotifications.ContainsKey(notificationDto.UserId))
            {
                _userNotifications[notificationDto.UserId] = new List<Notification>();
            }

            _userNotifications[notificationDto.UserId].Add(notification);
            _logger?.LogInformation($"Added notification {notification.Id} for user {notificationDto.UserId}: {notification.Title}");
            
            await SystemTask.CompletedTask;
        }

        public async System.Threading.Tasks.Task<IEnumerable<Notification>> GetUserNotificationsAsync(string userId, bool unreadOnly = false)
        {
            _logger?.LogInformation($"Getting notifications for user {userId}, unreadOnly: {unreadOnly}");
            
            // Simulate async operation
            await SystemTask.CompletedTask;
            
            // Create default sample notifications if this is the first request for this user
            if (!_userNotifications.ContainsKey(userId))
            {
                _userNotifications[userId] = new List<Notification>
                {
                    new Notification
                    {
                        Id = 1,
                        UserId = userId,
                        Type = "integration_import",
                        Title = "Import IFC réussi",
                        Message = "Le fichier IFC a été importé avec succès",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow.AddHours(-2),
                        Data = "{\"fileId\":\"123\",\"elements\":156,\"properties\":892}"
                    },
                    new Notification
                    {
                        Id = 2,
                        UserId = userId,
                        Type = "api_sync",
                        Title = "Synchronisation API",
                        Message = "La synchronisation avec l'API externe a été effectuée",
                        IsRead = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-1),
                        ReadAt = DateTime.UtcNow.AddDays(-1).AddHours(1),
                        Data = "{\"apiId\":\"forge-api\",\"itemsSynced\":12}"
                    },
                    new Notification
                    {
                        Id = 3,
                        UserId = userId,
                        Type = "integration_export",
                        Title = "Export terminé",
                        Message = "L'export au format IFC4 est disponible au téléchargement",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow.AddHours(-6),
                        Data = "{\"fileId\":\"456\",\"format\":\"ifc4\"}"
                    }
                };
            }
            
            // Get notifications for this user
            var notifications = _userNotifications[userId];
            
            // Filter if only unread notifications are requested
            if (unreadOnly)
            {
                notifications = notifications.Where(n => !n.IsRead).ToList();
            }
            
            _logger?.LogInformation($"Returning {notifications.Count} notifications for user {userId}");
            return notifications;
        }

        public async SystemTask MarkAsReadAsync(int notificationId, string userId)
        {
            _logger?.LogInformation($"Marking notification {notificationId} as read for user {userId}");
            
            if (_userNotifications.ContainsKey(userId))
            {
                var notification = _userNotifications[userId].FirstOrDefault(n => n.Id == notificationId);
                if (notification != null)
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                    _logger?.LogInformation($"Notification {notificationId} marked as read");
                }
                else
                {
                    _logger?.LogWarning($"Notification {notificationId} not found for user {userId}");
                }
            }
            
            await SystemTask.CompletedTask;
        }

        public async SystemTask MarkAllAsReadAsync(string userId)
        {
            _logger?.LogInformation($"Marking all notifications as read for user {userId}");
            
            if (_userNotifications.ContainsKey(userId))
            {
                var now = DateTime.UtcNow;
                foreach (var notification in _userNotifications[userId].Where(n => !n.IsRead))
                {
                    notification.IsRead = true;
                    notification.ReadAt = now;
                }
                
                _logger?.LogInformation($"All notifications marked as read for user {userId}");
            }
            
            await SystemTask.CompletedTask;
        }

        public async SystemTask UpdateNotificationPreferencesAsync(string userId, NotificationPreferencesDto preferences)
        {
            // Stub implementation - no-op
            await SystemTask.CompletedTask;
        }

        public async System.Threading.Tasks.Task<NotificationPreferencesDto> GetNotificationPreferencesAsync(string userId)
        {
            // Simulate async operation while returning default preferences
            await SystemTask.CompletedTask;
            return new NotificationPreferencesDto
            {
                EmailEnabled = true,
                BrowserEnabled = true,
                TaskAssignments = true,
                Annotations = true,
                ProjectUpdates = true
            };
        }

        public async SystemTask SendEmailNotificationAsync(string email, string subject, string message)
        {
            _logger?.LogInformation($"Simulating email notification to {email}: {subject}");
            await SystemTask.CompletedTask;
        }
        
        /// <summary>
        /// Méthode utilitaire pour envoyer facilement une notification liée à l'interopérabilité
        /// </summary>
        public async SystemTask SendIntegrationNotificationAsync(string userId, string type, string title, string message, string? data = null)
        {
            await SendNotificationAsync(new CreateNotificationDto
            {
                UserId = userId,
                Type = type,
                Title = title,
                Message = message,
                Data = data
            });
        }
    }
}
