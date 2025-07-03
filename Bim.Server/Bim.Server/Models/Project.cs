using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Bim.Server.Models
{
    public class Project
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }        public DateTime? LastModifiedDate { get; set; }        // Statut du projet (En attente, Actif, Archivé, etc.)
        // La valeur par défaut est "En attente", utilisée pour les nouvelles entrées et aussi 
        // pour les entrées existantes qui n'ont pas encore la colonne Status
        [StringLength(50)]
        public string? Status { get; set; } = "En attente";

        // Navigation property for IFC files
        public ICollection<IFCFile> IFCFiles { get; set; } = new List<IFCFile>();

        // Propriété pour stocker l'ID de l'utilisateur qui a créé le projet
        public string? CreatedById { get; set; }

        // Navigation property pour l'utilisateur créateur
        [ForeignKey("CreatedById")]
        public ApplicationUser? CreatedBy { get; set; }

        // Navigation property for tool usage tracking
        public ICollection<ToolUsage> ToolUsages { get; set; } = new List<ToolUsage>();

        // Navigation property for tasks
        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    }
}