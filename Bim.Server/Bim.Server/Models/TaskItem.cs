using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Bim.Server.Models
{
    public class TaskItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        [Required]
        public string Status { get; set; } = "Pending";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? DueDate { get; set; }        [Required(ErrorMessage = "The AssignedTo field is required")]
        public string AssignedToId { get; set; } = null!;

        [ForeignKey("AssignedToId")]
        [Required]
        public ApplicationUser AssignedTo { get; set; } = null!;

        public string? CreatedById { get; set; }

        [ForeignKey("CreatedById")]
        public ApplicationUser? CreatedBy { get; set; }        [Required(ErrorMessage = "The Project field is required")]
        public int ProjectId { get; set; }

        [ForeignKey("ProjectId")]
        [Required]
        public Project Project { get; set; } = null!;

        [StringLength(50)]
        public string? Priority { get; set; }

        public int? EstimatedHours { get; set; }
        public int? ActualHours { get; set; }

        public bool IsDeleted { get; set; }
    }
}
