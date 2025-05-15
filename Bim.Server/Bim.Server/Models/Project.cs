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

        public DateTime CreatedDate { get; set; }

        public DateTime? LastModifiedDate { get; set; }

        // Navigation property for IFC files
        public ICollection<IFCFile> IFCFiles { get; set; } = new List<IFCFile>();

        // Propriété pour stocker l'ID de l'utilisateur qui a créé le projet
        public string? CreatedById { get; set; }

        // Navigation property pour l'utilisateur créateur
        [ForeignKey("CreatedById")]
        public ApplicationUser? CreatedBy { get; set; }
    }
}