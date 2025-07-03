using Bim.Server.Models;
using Bim.Server.Models.DTOs;
using SystemTask = System.Threading.Tasks.Task;

namespace Bim.Server.Services
{
    public interface INotificationService
    {
        SystemTask SendNotificationAsync(CreateNotificationDto notificationDto);
        System.Threading.Tasks.Task<IEnumerable<Notification>> GetUserNotificationsAsync(string userId, bool unreadOnly = false);
        SystemTask MarkAsReadAsync(int notificationId, string userId);
        SystemTask MarkAllAsReadAsync(string userId);
        SystemTask UpdateNotificationPreferencesAsync(string userId, NotificationPreferencesDto preferences);
        System.Threading.Tasks.Task<NotificationPreferencesDto> GetNotificationPreferencesAsync(string userId);
        SystemTask SendEmailNotificationAsync(string email, string subject, string message);
        
        // Méthode utilitaire pour les notifications d'intégration
        SystemTask SendIntegrationNotificationAsync(string userId, string type, string title, string message, string? data = null);
    }
}