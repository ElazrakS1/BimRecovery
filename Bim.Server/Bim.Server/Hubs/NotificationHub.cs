using Microsoft.AspNetCore.SignalR;

namespace Bim.Server.Hubs
{    
    /// <summary>
    /// Hub de notification pour envoyer des notifications en temps réel aux utilisateurs
    /// </summary>
    public class NotificationHub : Hub
    {
        private readonly ILogger<NotificationHub> _logger;

        public NotificationHub(ILogger<NotificationHub> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Envoie une notification simple à un utilisateur spécifique
        /// </summary>
        public async Task SendTaskNotification(string userId, string message)
        {
            _logger.LogInformation($"Sending task notification to user {userId}");
            await Clients.User(userId).SendAsync("ReceiveTaskNotification", message);
        }
        
        
        /// <summary>
        /// Envoie une notification structurée concernant l'attribution d'une tâche
        /// </summary>
        public async Task SendTaskAssignmentNotification(string userId, object taskData)
        {
            _logger.LogInformation($"Sending task assignment notification to user {userId}");
            await Clients.User(userId).SendAsync("ReceiveTaskNotification", taskData);
        }

        public async Task JoinGroup(string groupName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }

        public async Task LeaveGroup(string groupName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }

        public async Task SendProjectUpdate(string projectId, string update)
        {
            await Clients.Group($"project_{projectId}").SendAsync("ReceiveProjectUpdate", update);
        }

        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
    }
}
