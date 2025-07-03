using System.ComponentModel.DataAnnotations;

namespace Bim.Server.Models
{
    public class ToolUsage
    {
        public int Id { get; set; }
        
        [Required]
        public int ProjectId { get; set; }
        
        [Required]
        [StringLength(100)]
        public string ToolName { get; set; } = string.Empty;
        
        [Required]
        public DateTime UsageDate { get; set; }
        
        public int FileCount { get; set; }
        
        public bool ProcessedSuccessfully { get; set; }
        
        // Navigation property
        public Project? Project { get; set; }
    }
}
