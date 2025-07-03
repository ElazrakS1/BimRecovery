using System;
using System.ComponentModel.DataAnnotations;

namespace Bim.Server.Models
{
    public class SystemLog
    {
        public int Id { get; set; }
        
        public DateTime Timestamp { get; set; }

        public string Action { get; set; } = string.Empty;

        public string Resource { get; set; } = string.Empty;

        [StringLength(450)]
        public string? UserId { get; set; }

        [StringLength(256)]
        public string? UserName { get; set; }

        [StringLength(4000)]
        public string? Details { get; set; }

        [StringLength(50)]
        public string Level { get; set; } = "info";

        [StringLength(50)]
        public string? IpAddress { get; set; }

        // Navigation property
        public virtual ApplicationUser? User { get; set; }
    }
}
