using Microsoft.EntityFrameworkCore;
using Bim.Server.Data;
using Bim.Server.Models;
using Microsoft.Extensions.Logging;

namespace Bim.Server.Services
{
    public interface IUserValidationService
    {
        Task<UserValidationResult> ValidateUsersForAssignmentAsync(IEnumerable<string> userIds);
        Task<bool> UserExistsAsync(string userId);
        Task<List<ApplicationUser>> GetValidUsersAsync(IEnumerable<string> userIds);
        Task<UserValidationResult> ValidateUsersWithDetailedInfoAsync(IEnumerable<string> userIds);
    }

    public class UserValidationService : IUserValidationService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UserValidationService> _logger;

        public UserValidationService(ApplicationDbContext context, ILogger<UserValidationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<UserValidationResult> ValidateUsersForAssignmentAsync(IEnumerable<string> userIds)
        {
            if (userIds == null || !userIds.Any())
            {
                return new UserValidationResult
                {
                    IsValid = true,
                    ValidUserIds = new List<string>(),
                    InvalidUserIds = new List<string>(),
                    InactiveUserIds = new List<string>()
                };
            }

            var cleanUserIds = userIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
            
            if (!cleanUserIds.Any())
            {
                return new UserValidationResult
                {
                    IsValid = true,
                    ValidUserIds = new List<string>(),
                    InvalidUserIds = new List<string>(),
                    InactiveUserIds = new List<string>()
                };
            }

            var existingUsers = await _context.Users
                .Where(u => cleanUserIds.Contains(u.Id))
                .Select(u => new { u.Id, u.IsActive, u.Email, u.FirstName, u.LastName })
                .ToListAsync();

            var validUsers = existingUsers.Where(u => u.IsActive).Select(u => u.Id).ToList();
            var inactiveUsers = existingUsers.Where(u => !u.IsActive).Select(u => u.Id).ToList();
            var invalidUsers = cleanUserIds.Except(existingUsers.Select(u => u.Id)).ToList();

            var result = new UserValidationResult
            {
                IsValid = invalidUsers.Count == 0 && inactiveUsers.Count == 0,
                ValidUserIds = validUsers,
                InvalidUserIds = invalidUsers,
                InactiveUserIds = inactiveUsers,
                UserDetails = existingUsers.ToDictionary(u => u.Id, u => new UserInfo
                {
                    Id = u.Id,
                    Email = u.Email ?? "",
                    FullName = $"{u.FirstName} {u.LastName}".Trim(),
                    IsActive = u.IsActive
                })
            };

            if (!result.IsValid)
            {
                _logger.LogWarning("User validation failed. Invalid users: {InvalidUsers}, Inactive users: {InactiveUsers}", 
                    string.Join(", ", invalidUsers), string.Join(", ", inactiveUsers));
            }

            return result;
        }

        public async Task<bool> UserExistsAsync(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return false;

            return await _context.Users.AnyAsync(u => u.Id == userId && u.IsActive);
        }

        public async Task<List<ApplicationUser>> GetValidUsersAsync(IEnumerable<string> userIds)
        {
            if (userIds == null || !userIds.Any())
                return new List<ApplicationUser>();

            var cleanUserIds = userIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
            
            return await _context.Users
                .Where(u => cleanUserIds.Contains(u.Id) && u.IsActive)
                .ToListAsync();
        }

        public async Task<UserValidationResult> ValidateUsersWithDetailedInfoAsync(IEnumerable<string> userIds)
        {
            var result = await ValidateUsersForAssignmentAsync(userIds);
            
            // Add detailed error messages
            var errors = new List<string>();
            
            if (result.InvalidUserIds.Any())
            {
                errors.Add($"Les utilisateurs suivants n'existent pas dans la base de données: {string.Join(", ", result.InvalidUserIds)}");
            }
            
            if (result.InactiveUserIds.Any())
            {
                var inactiveUserNames = result.InactiveUserIds.Select(id => 
                    result.UserDetails.ContainsKey(id) ? 
                    $"{result.UserDetails[id].FullName} ({result.UserDetails[id].Email})" : 
                    id
                ).ToList();
                
                errors.Add($"Les utilisateurs suivants sont inactifs: {string.Join(", ", inactiveUserNames)}");
            }
            
            result.ErrorMessages = errors;
            return result;
        }
    }

    public class UserValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> ValidUserIds { get; set; } = new List<string>();
        public List<string> InvalidUserIds { get; set; } = new List<string>();
        public List<string> InactiveUserIds { get; set; } = new List<string>();
        public Dictionary<string, UserInfo> UserDetails { get; set; } = new Dictionary<string, UserInfo>();
        public List<string> ErrorMessages { get; set; } = new List<string>();
        
        public bool HasValidUsers => ValidUserIds.Any();
        public bool HasInvalidUsers => InvalidUserIds.Any();
        public bool HasInactiveUsers => InactiveUserIds.Any();
    }

    public class UserInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}
