using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Bim.Server.Models
{
    /// <summary>
    /// Représente une tâche assignée à un utilisateur dans un projet
    /// </summary>
    public class Task
    {
        public int Id { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required]
        public int ProjectId { get; set; }

        [ForeignKey("ProjectId")]
        public Project Project { get; set; } = null!;

        // Utilisateur qui a créé la tâche
        [Required]
        public string CreatedById { get; set; } = string.Empty;

        [ForeignKey("CreatedById")]
        public ApplicationUser CreatedBy { get; set; } = null!;

        // Utilisateur assigné à la tâche
        public string? AssignedToId { get; set; }

        [ForeignKey("AssignedToId")]
        public ApplicationUser? AssignedTo { get; set; }

        // Statut de la tâche
        public string Status { get; set; } = "pending"; // pending, in_progress, completed, cancelled

        // Priorité
        public string Priority { get; set; } = "medium"; // low, medium, high, urgent

        // Dates
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? DueDate { get; set; }
        public DateTime? CompletedAt { get; set; }

        // Lien avec une annotation (optionnel)
        public int? RelatedAnnotationId { get; set; }

        [ForeignKey("RelatedAnnotationId")]
        public Annotation? RelatedAnnotation { get; set; }

        // Élément IFC lié (optionnel)
        public string? TargetElementId { get; set; }

        // Position 3D associée (optionnel)
        public double? PositionX { get; set; }
        public double? PositionY { get; set; }
        public double? PositionZ { get; set; }

        // Métadonnées et tags
        public string? Tags { get; set; } // JSON array of tags
        public string? Metadata { get; set; } // JSON string for additional data

        // Progression (0-100)
        public int Progress { get; set; } = 0;        // Commentaires de suivi
        public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();

        // Historique des changements
        public ICollection<TaskHistory> History { get; set; } = new List<TaskHistory>();

        // Assignations multiples (nouvelle fonctionnalité)
        public ICollection<TaskAssignment> Assignments { get; set; } = new List<TaskAssignment>();
    }

    /// <summary>
    /// Commentaire sur une tâche
    /// </summary>
    public class TaskComment
    {
        public int Id { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        [Required]
        public int TaskId { get; set; }

        [ForeignKey("TaskId")]
        public Task Task { get; set; } = null!;

        [Required]
        public string AuthorId { get; set; } = string.Empty;

        [ForeignKey("AuthorId")]
        public ApplicationUser Author { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Réponse à un autre commentaire
        public int? ParentCommentId { get; set; }

        [ForeignKey("ParentCommentId")]
        public TaskComment? ParentComment { get; set; }

        public ICollection<TaskComment> Replies { get; set; } = new List<TaskComment>();
    }

    /// <summary>
    /// Historique des changements d'une tâche
    /// </summary>
    public class TaskHistory
    {
        public int Id { get; set; }

        [Required]
        public int TaskId { get; set; }

        [ForeignKey("TaskId")]
        public Task Task { get; set; } = null!;

        [Required]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey("UserId")]
        public ApplicationUser User { get; set; } = null!;

        [Required]
        public string Action { get; set; } = string.Empty; // created, updated, assigned, completed, etc.

        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public string? Field { get; set; } // field that was changed

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? Description { get; set; }
    }
}
