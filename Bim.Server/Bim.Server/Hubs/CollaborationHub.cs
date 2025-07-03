using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Bim.Server.Hubs
{
    /// <summary>
    /// Hub SignalR pour les notifications et mises à jour en temps réel
    /// </summary>
    [Authorize]
    public class CollaborationHub : Hub
    {
        private readonly ILogger<CollaborationHub> _logger;

        public CollaborationHub(ILogger<CollaborationHub> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Connexion d'un utilisateur
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userEmail = Context.User?.FindFirst(ClaimTypes.Email)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                // Ajouter l'utilisateur à son groupe personnel
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
                
                _logger.LogInformation("User {UserId} ({Email}) connected to CollaborationHub with connection {ConnectionId}", 
                    userId, userEmail, Context.ConnectionId);

                // Notifier les autres utilisateurs de la connexion
                await Clients.Others.SendAsync("UserConnected", new { userId, userEmail, connectionId = Context.ConnectionId });
            }

            await base.OnConnectedAsync();
        }

        /// <summary>
        /// Déconnexion d'un utilisateur
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userEmail = Context.User?.FindFirst(ClaimTypes.Email)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                _logger.LogInformation("User {UserId} ({Email}) disconnected from CollaborationHub", userId, userEmail);

                // Notifier les autres utilisateurs de la déconnexion
                await Clients.Others.SendAsync("UserDisconnected", new { userId, userEmail });
            }

            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Rejoindre un projet pour recevoir les mises à jour en temps réel
        /// </summary>
        public async Task JoinProject(int projectId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"project_{projectId}");
                
                _logger.LogInformation("User {UserId} joined project {ProjectId}", userId, projectId);

                // Notifier les autres membres du projet
                await Clients.Group($"project_{projectId}").SendAsync("UserJoinedProject", new { userId, projectId });
            }
        }

        /// <summary>
        /// Quitter un projet
        /// </summary>
        public async Task LeaveProject(int projectId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"project_{projectId}");
                
                _logger.LogInformation("User {UserId} left project {ProjectId}", userId, projectId);

                // Notifier les autres membres du projet
                await Clients.Group($"project_{projectId}").SendAsync("UserLeftProject", new { userId, projectId });
            }
        }

        /// <summary>
        /// Signaler qu'un utilisateur consulte une annotation
        /// </summary>
        public async Task ViewingAnnotation(int projectId, int annotationId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userName = $"{Context.User?.FindFirst("FirstName")?.Value} {Context.User?.FindFirst("LastName")?.Value}".Trim();

            if (!string.IsNullOrEmpty(userId))
            {
                // Notifier les autres membres du projet
                await Clients.OthersInGroup($"project_{projectId}").SendAsync("UserViewingAnnotation", new 
                { 
                    userId, 
                    userName,
                    projectId, 
                    annotationId,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Signaler qu'un utilisateur est en train de taper un commentaire
        /// </summary>
        public async Task UserTyping(int projectId, string targetType, int targetId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userName = $"{Context.User?.FindFirst("FirstName")?.Value} {Context.User?.FindFirst("LastName")?.Value}".Trim();

            if (!string.IsNullOrEmpty(userId))
            {
                // Notifier les autres membres du projet
                await Clients.OthersInGroup($"project_{projectId}").SendAsync("UserTyping", new 
                { 
                    userId, 
                    userName,
                    projectId, 
                    targetType, // "annotation" or "task"
                    targetId,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Signaler qu'un utilisateur a arrêté de taper
        /// </summary>
        public async Task UserStoppedTyping(int projectId, string targetType, int targetId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                // Notifier les autres membres du projet
                await Clients.OthersInGroup($"project_{projectId}").SendAsync("UserStoppedTyping", new 
                { 
                    userId, 
                    projectId, 
                    targetType,
                    targetId
                });
            }
        }

        /// <summary>
        /// Partager une position 3D dans la maquette (curseur collaboratif)
        /// </summary>
        public async Task SharePosition(int projectId, double x, double y, double z, double? cameraX = null, double? cameraY = null, double? cameraZ = null)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userName = $"{Context.User?.FindFirst("FirstName")?.Value} {Context.User?.FindFirst("LastName")?.Value}".Trim();

            if (!string.IsNullOrEmpty(userId))
            {
                // Partager la position avec les autres membres du projet
                await Clients.OthersInGroup($"project_{projectId}").SendAsync("UserPositionUpdate", new 
                { 
                    userId, 
                    userName,
                    projectId, 
                    position = new { x, y, z },
                    camera = cameraX.HasValue ? new { x = cameraX, y = cameraY, z = cameraZ } : null,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// Envoyer un message de chat en temps réel (optionnel)
        /// </summary>
        public async Task SendChatMessage(int projectId, string message)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userName = $"{Context.User?.FindFirst("FirstName")?.Value} {Context.User?.FindFirst("LastName")?.Value}".Trim();
            var userEmail = Context.User?.FindFirst(ClaimTypes.Email)?.Value;

            if (!string.IsNullOrEmpty(userId) && !string.IsNullOrWhiteSpace(message))
            {
                var chatMessage = new
                {
                    id = Guid.NewGuid().ToString(),
                    userId,
                    userName,
                    userEmail,
                    message = message.Trim(),
                    projectId,
                    timestamp = DateTime.UtcNow
                };

                // Envoyer le message à tous les membres du projet
                await Clients.Group($"project_{projectId}").SendAsync("ChatMessage", chatMessage);

                _logger.LogInformation("Chat message sent by {UserId} in project {ProjectId}", userId, projectId);
            }
        }
    }
}
