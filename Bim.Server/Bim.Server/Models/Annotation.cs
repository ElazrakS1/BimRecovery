using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Bim.Server.Models
{
    /// <summary>
    /// Représente une annotation ou un commentaire sur une maquette 3D
    /// </summary>
    public class Annotation
    {
        public int Id { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        [Required]
        public string AuthorId { get; set; } = string.Empty;

        [ForeignKey("AuthorId")]
        public ApplicationUser Author { get; set; } = null!;

        [Required]
        public int ProjectId { get; set; }

        [ForeignKey("ProjectId")]
        public Project Project { get; set; } = null!;

        // Position 3D de l'annotation dans la maquette
        public double PositionX { get; set; }
        public double PositionY { get; set; }
        public double PositionZ { get; set; }

        // Orientation de la caméra (optionnel)
        public double? CameraX { get; set; }
        public double? CameraY { get; set; }
        public double? CameraZ { get; set; }

        // Élément IFC ciblé (optionnel)
        public string? TargetElementId { get; set; }

        // Type d'annotation (texte, flèche, surlignage, etc.)
        public string AnnotationType { get; set; } = "comment"; // comment, arrow, highlight, measure

        // Style de l'annotation (couleur, taille, etc.)
        public string? Style { get; set; } // JSON string for style properties

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // État de l'annotation
        public string Status { get; set; } = "active"; // active, resolved, archived        // Réponses et mentions
        public int? ParentAnnotationId { get; set; }
        
        [ForeignKey("ParentAnnotationId")]
        public Annotation? ParentAnnotation { get; set; }

        public ICollection<Annotation> Replies { get; set; } = new List<Annotation>();

        // Visibilité
        public bool IsPublic { get; set; } = true;

        // Métadonnées additionnelles
        public string? Metadata { get; set; } // JSON string for additional data
    }
}
