namespace Bim.Server.Models.DTOs
{
    /// <summary>
    /// DTO pour créer une nouvelle annotation
    /// </summary>
    public class CreateAnnotationDto
    {
        public string Content { get; set; } = string.Empty;
        public int ProjectId { get; set; }
        public double PositionX { get; set; }
        public double PositionY { get; set; }
        public double PositionZ { get; set; }
        public double? CameraX { get; set; }
        public double? CameraY { get; set; }
        public double? CameraZ { get; set; }
        public string? TargetElementId { get; set; }
        public string AnnotationType { get; set; } = "comment";
        public string? Style { get; set; }
        public bool IsPublic { get; set; } = true;
        public int? ParentAnnotationId { get; set; }
    }

    /// <summary>
    /// DTO pour mettre à jour une annotation
    /// </summary>
    public class UpdateAnnotationDto
    {
        public string? Content { get; set; }
        public string? Status { get; set; }
        public string? Style { get; set; }
        public bool? IsPublic { get; set; }
    }

    /// <summary>
    /// DTO pour l'affichage d'une annotation
    /// </summary>
    public class AnnotationDto
    {
        public int Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public string AuthorId { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public string AuthorEmail { get; set; } = string.Empty;
        public int ProjectId { get; set; }
        public double PositionX { get; set; }
        public double PositionY { get; set; }
        public double PositionZ { get; set; }
        public double? CameraX { get; set; }
        public double? CameraY { get; set; }
        public double? CameraZ { get; set; }
        public string? TargetElementId { get; set; }
        public string AnnotationType { get; set; } = string.Empty;
        public string? Style { get; set; }        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? ParentAnnotationId { get; set; }
        public bool IsPublic { get; set; }
        public List<AnnotationDto> Replies { get; set; } = new List<AnnotationDto>();
    }    /// <summary>
    /// DTO pour créer une nouvelle tâche
    /// </summary>
    public class CreateTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int ProjectId { get; set; }
        public string? AssignedToId { get; set; } // Maintenu pour compatibilité
        public List<string> AssignedToIds { get; set; } = new List<string>(); // Nouvelle propriété pour multiple assignees
        public string Priority { get; set; } = "medium";
        public DateTime? DueDate { get; set; }
        public int? RelatedAnnotationId { get; set; }
        public string? TargetElementId { get; set; }
        public double? PositionX { get; set; }
        public double? PositionY { get; set; }
        public double? PositionZ { get; set; }
        public string? Tags { get; set; }
    }    /// <summary>
    /// DTO pour mettre à jour une tâche
    /// </summary>
    public class UpdateTaskDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? AssignedToId { get; set; } // Maintenu pour compatibilité
        public List<string>? AssignedToIds { get; set; } // Nouvelle propriété pour multiple assignees
        public string? Status { get; set; }
        public string? Priority { get; set; }
        public DateTime? DueDate { get; set; }
        public int? Progress { get; set; }
        public string? Tags { get; set; }
    }

    /// <summary>
    /// DTO pour l'affichage d'une tâche
    /// </summary>
    public class TaskDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string CreatedById { get; set; } = string.Empty;        public string CreatedByName { get; set; } = string.Empty;
        public string? AssignedToId { get; set; } // Maintenu pour compatibilité (premier assigné)
        public string? AssignedToName { get; set; } // Maintenu pour compatibilité (premier assigné)
        public string? AssignedToEmail { get; set; } // Maintenu pour compatibilité (premier assigné)
        public List<UserAssignmentDto> Assignees { get; set; } = new List<UserAssignmentDto>(); // Tous les assignés
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? DueDate { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int? RelatedAnnotationId { get; set; }
        public string? TargetElementId { get; set; }
        public double? PositionX { get; set; }
        public double? PositionY { get; set; }
        public double? PositionZ { get; set; }
        public string? Tags { get; set; }
        public int Progress { get; set; }        public List<TaskCommentDto> Comments { get; set; } = new List<TaskCommentDto>();
    }

    /// <summary>
    /// DTO pour l'affichage détaillé d'une tâche avec historique
    /// </summary>
    public class TaskDetailsDto : TaskDto
    {
        public List<TaskHistoryDto> History { get; set; } = new List<TaskHistoryDto>();
        public int CommentsCount => Comments.Count;
    }

    /// <summary>
    /// DTO pour l'historique d'une tâche
    /// </summary>
    public class TaskHistoryDto
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public string? Notes { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// DTO pour créer un commentaire de tâche
    /// </summary>
    public class CreateTaskCommentDto
    {
        public string Content { get; set; } = string.Empty;
        public int TaskId { get; set; }
        public int? ParentCommentId { get; set; }
    }

    /// <summary>
    /// DTO pour l'affichage d'un commentaire de tâche
    /// </summary>
    public class TaskCommentDto
    {
        public int Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public int TaskId { get; set; }
        public string AuthorId { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public string AuthorEmail { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? ParentCommentId { get; set; }
        public List<TaskCommentDto> Replies { get; set; } = new List<TaskCommentDto>();
    }    /// <summary>
    /// DTO pour créer une notification
    /// </summary>
    public class CreateNotificationDto
    {
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Type { get; set; } = "info";
        public string? Data { get; set; }
    }

    /// <summary>
    /// DTO pour l'affichage d'une notification
    /// </summary>
    public class NotificationDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public string Priority { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int? ProjectId { get; set; }
        public string? ProjectName { get; set; }
        public int? TaskId { get; set; }
        public string? TaskTitle { get; set; }
        public int? AnnotationId { get; set; }
        public string? ActionUrl { get; set; }
        public string? TriggeredById { get; set; }
        public string? TriggeredByName { get; set; }
    }

    /// <summary>
    /// DTO pour mettre à jour les préférences de notification
    /// </summary>
    public class UpdateNotificationPreferencesDto
    {
        public bool? EmailNotifications { get; set; }
        public bool? InAppNotifications { get; set; }
        public bool? PushNotifications { get; set; }
        public string? EmailFrequency { get; set; }
        public bool? TaskAssignments { get; set; }
        public bool? TaskUpdates { get; set; }
        public bool? AnnotationMentions { get; set; }
        public bool? ProjectUpdates { get; set; }
        public bool? SystemAlerts { get; set; }
        public string? WorkingHours { get; set; }
    }    /// <summary>
    /// DTO pour les préférences de notification
    /// </summary>
    public class NotificationPreferencesDto
    {
        public bool EmailEnabled { get; set; } = true;
        public bool BrowserEnabled { get; set; } = true;
        public bool TaskAssignments { get; set; } = true;
        public bool Annotations { get; set; } = true;
        public bool ProjectUpdates { get; set; } = true;
        public string EmailFrequency { get; set; } = "immediate";
        public string WorkingHours { get; set; } = "9-17";
    }

    /// <summary>
    /// DTO pour l'affichage d'un utilisateur assigné à une tâche
    /// </summary>
    public class UserAssignmentDto
    {
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; }
        public string AssignedById { get; set; } = string.Empty;
        public string AssignedByName { get; set; } = string.Empty;
        public string Status { get; set; } = "active";
    }

    /// <summary>
    /// DTO pour ajouter un utilisateur à une tâche
    /// </summary>
    public class AddUserToTaskDto
    {
        public string UserId { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }
}
