namespace Bim.Server.Models
{
    public class LoginModel
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterModel
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Company { get; set; }
        public string? Position { get; set; }
        public string? Role { get; set; }
    }

    public class ForgotPasswordModel
    {
        public string Email { get; set; } = string.Empty;
    }

    public class UserProfileData
    {
        public string id { get; set; } = string.Empty;
        public string? userName { get; set; }
        public string? email { get; set; }
        public string firstName { get; set; } = string.Empty;
        public string lastName { get; set; } = string.Empty;
        public string? company { get; set; }
        public string? position { get; set; }
        public IList<string> roles { get; set; } = new List<string>();
    }
}
