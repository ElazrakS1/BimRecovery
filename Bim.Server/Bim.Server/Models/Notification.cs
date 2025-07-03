using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Bim.Server.Models
{
    /// <summary>
    /// Représente une notification système
    /// </summary>
    public class Notification
    {
        public int Id { get; set; }        // Content and data
        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;

        public string? Data { get; set; } // JSON data for notification

        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey("UserId")]
        public ApplicationUser User { get; set; } = null!;

        // Type de notification
        public string Type { get; set; } = "info"; // info, warning, error, success, task, annotation, project

        // État de la notification
        public bool IsRead { get; set; } = false;

        // Priorité
        public string Priority { get; set; } = "normal"; // low, normal, high, urgent

        // Dates
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReadAt { get; set; }
        public DateTime? ExpiresAt { get; set; }

        // Liens vers d'autres entités
        public int? ProjectId { get; set; }

        [ForeignKey("ProjectId")]
        public Project? Project { get; set; }

        public int? TaskId { get; set; }

        [ForeignKey("TaskId")]
        public Task? Task { get; set; }

        public int? AnnotationId { get; set; }

        [ForeignKey("AnnotationId")]
        public Annotation? Annotation { get; set; }

        // Action URL pour naviguer vers l'élément lié
        public string? ActionUrl { get; set; }

        // Métadonnées additionnelles
        public string? Metadata { get; set; } // JSON string

        // Utilisateur qui a déclenché la notification (optionnel)
        public string? TriggeredById { get; set; }

        [ForeignKey("TriggeredById")]
        public ApplicationUser? TriggeredBy { get; set; }
    }

    /// <summary>
    /// Préférences de notification d'un utilisateur
    /// </summary>
    public class NotificationPreference
    {
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey("UserId")]
        public ApplicationUser User { get; set; } = null!;

        // Types de notifications activées
        public bool EmailNotifications { get; set; } = true;
        public bool InAppNotifications { get; set; } = true;
        public bool PushNotifications { get; set; } = false;

        // Fréquence des notifications par email
        public string EmailFrequency { get; set; } = "immediate"; // immediate, daily, weekly, never

        // Notifications spécifiques
        public bool TaskAssignments { get; set; } = true;
        public bool TaskUpdates { get; set; } = true;
        public bool AnnotationMentions { get; set; } = true;
        public bool ProjectUpdates { get; set; } = true;
        public bool SystemAlerts { get; set; } = true;

        // Heures de travail pour les notifications (JSON)
        public string? WorkingHours { get; set; } // JSON: {"start": "09:00", "end": "17:00", "timezone": "UTC+1"}

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
