using System.ComponentModel.DataAnnotations;

namespace Bim.Server.Models
{
    public class ResetPasswordModel
    {
        [Required(ErrorMessage = "Le token est requis")]
        public string Token { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le nouveau mot de passe est requis")]
        [MinLength(8, ErrorMessage = "Le mot de passe doit contenir au moins 8 caractères")]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class PasswordResetToken
    {
        public required string UserId { get; set; }
        public required string Token { get; set; }
        public DateTime ExpiryDate { get; set; }
    }
}
