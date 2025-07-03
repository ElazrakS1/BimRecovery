using System.ComponentModel.DataAnnotations;

namespace Bim.Server.Models.DTOs
{
    public class ModelScreenshotDto
    {
        [Required]
        public string Base64Image { get; set; } = string.Empty;
    }
}
