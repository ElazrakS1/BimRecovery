using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Bim.Server.Models
{
    public class IFCFile
    {
        public int Id { get; set; }

        [Required]
        public string FileName { get; set; } = string.Empty;

        [Required]
        public string FilePath { get; set; } = string.Empty;

        public DateTime UploadDate { get; set; }

        public long FileSize { get; set; }

        public string ProjectName { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        // Métadonnées IFC
        public string IfcSchemaVersion { get; set; } = string.Empty;
        public string IfcProjectName { get; set; } = string.Empty;
        public string IfcProjectDescription { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string Organization { get; set; } = string.Empty;

        // Foreign key for Project
        [Required]
        public int ProjectId { get; set; }

        // Navigation property for Project
        [ForeignKey("ProjectId")]
        public Project Project { get; set; } = null!;
    }
}