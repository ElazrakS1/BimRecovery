using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Bim.Server.Models
{
    /// <summary>
    /// Représente l'assignation d'un utilisateur à une tâche (relation many-to-many)
    /// </summary>
    public class TaskAssignment
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

        // Date d'assignation
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

        // Utilisateur qui a fait l'assignation
        [Required]
        public string AssignedById { get; set; } = string.Empty;

        [ForeignKey("AssignedById")]
        public ApplicationUser AssignedBy { get; set; } = null!;

        // Statut de l'assignation (actif, retiré, etc.)
        public string Status { get; set; } = "active"; // active, removed

        // Notes optionnelles lors de l'assignation
        public string? Notes { get; set; }
    }
}
