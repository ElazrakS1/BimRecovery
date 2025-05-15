using Bim.Server.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace Bim.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly ILogger<UsersController> _logger;

        public UsersController(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            ILogger<UsersController> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            try
            {
                var users = await _userManager.Users
                    .Select(u => new
                    {
                        u.Id,
                        u.Email,
                        u.FirstName,
                        u.LastName,
                        u.Company,
                        u.Position,
                        u.IsActive,
                        u.CreatedAt,
                        u.LastLogin
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving users list");
                return StatusCode(500, new { message = "Une erreur s'est produite lors de la récupération des utilisateurs" });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            
            if (user == null)
            {
                return NotFound(new { message = "Utilisateur non trouvé" });
            }

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new
            {
                id = user.Id,
                firstName = user.FirstName,
                lastName = user.LastName,
                email = user.Email,
                company = user.Company,
                position = user.Position,
                isActive = user.IsActive,
                lastLogin = user.LastLogin,
                createdAt = user.CreatedAt,
                roles = roles
            });
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] StatusUpdateModel model)
        {
            var user = await _userManager.FindByIdAsync(id);
            
            if (user == null)
            {
                return NotFound(new { message = "Utilisateur non trouvé" });
            }
            
            // Empêcher la désactivation de son propre compte
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (id == currentUserId)
            {
                return BadRequest(new { message = "Vous ne pouvez pas modifier le statut de votre propre compte" });
            }

            user.IsActive = model.IsActive;
            var result = await _userManager.UpdateAsync(user);
            
            if (!result.Succeeded)
            {
                return StatusCode(500, new { message = "Erreur lors de la mise à jour de l'utilisateur", errors = result.Errors.Select(e => e.Description) });
            }

            return Ok(new { message = "Statut de l'utilisateur mis à jour avec succès" });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UserUpdateModel model)
        {
            var user = await _userManager.FindByIdAsync(id);
            
            if (user == null)
            {
                return NotFound(new { message = "Utilisateur non trouvé" });
            }

            user.FirstName = model.FirstName;
            user.LastName = model.LastName;
            user.Company = model.Company;
            user.Position = model.Position;

            // Mettre à jour l'email si nécessaire
            if (user.Email != model.Email)
            {
                var userWithEmail = await _userManager.FindByEmailAsync(model.Email);
                if (userWithEmail != null && userWithEmail.Id != id)
                {
                    return BadRequest(new { message = "Cet email est déjà utilisé" });
                }

                user.Email = model.Email;
                user.UserName = model.Email; // Utiliser l'email comme nom d'utilisateur
                user.NormalizedEmail = model.Email.ToUpper();
                user.NormalizedUserName = model.Email.ToUpper();
            }

            // Mettre à jour le mot de passe si fourni
            if (!string.IsNullOrEmpty(model.Password))
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var passwordResult = await _userManager.ResetPasswordAsync(user, token, model.Password);
                
                if (!passwordResult.Succeeded)
                {
                    return StatusCode(500, new { message = "Erreur lors de la réinitialisation du mot de passe", errors = passwordResult.Errors.Select(e => e.Description) });
                }
            }

            var result = await _userManager.UpdateAsync(user);
            
            if (!result.Succeeded)
            {
                return StatusCode(500, new { message = "Erreur lors de la mise à jour de l'utilisateur", errors = result.Errors.Select(e => e.Description) });
            }

            // Mettre à jour les rôles si nécessaire
            if (!string.IsNullOrEmpty(model.Role))
            {
                var currentRoles = await _userManager.GetRolesAsync(user);
                
                // Supprimer les rôles actuels
                if (currentRoles.Any())
                {
                    await _userManager.RemoveFromRolesAsync(user, currentRoles);
                }
                
                // Ajouter le nouveau rôle
                if (!await _roleManager.RoleExistsAsync(model.Role))
                {
                    await _roleManager.CreateAsync(new IdentityRole(model.Role));
                }
                
                await _userManager.AddToRoleAsync(user, model.Role);
            }

            return Ok(new { message = "Utilisateur mis à jour avec succès" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            
            if (user == null)
            {
                return NotFound(new { message = "Utilisateur non trouvé" });
            }
            
            // Empêcher la suppression de son propre compte
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (id == currentUserId)
            {
                return BadRequest(new { message = "Vous ne pouvez pas supprimer votre propre compte" });
            }

            var result = await _userManager.DeleteAsync(user);
            
            if (!result.Succeeded)
            {
                return StatusCode(500, new { message = "Erreur lors de la suppression de l'utilisateur", errors = result.Errors.Select(e => e.Description) });
            }

            return Ok(new { message = "Utilisateur supprimé avec succès" });
        }
    }

    public class StatusUpdateModel
    {
        public bool IsActive { get; set; }
    }

    public class UserUpdateModel
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Password { get; set; }
        public string? Company { get; set; }
        public string? Position { get; set; }
        public string? Role { get; set; }
    }
}