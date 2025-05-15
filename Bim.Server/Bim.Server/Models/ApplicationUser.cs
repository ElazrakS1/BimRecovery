using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace Bim.Server.Models
{
    public class ApplicationUser : IdentityUser
    {
        [Required]
        [MaxLength(50)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string LastName { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? Company { get; set; }
        
        [MaxLength(100)]
        public string? Position { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? LastLogin { get; set; }
        
        public bool IsActive { get; set; } = true;
    }
}
