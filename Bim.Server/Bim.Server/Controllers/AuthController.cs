using Bim.Server.Models;
using Bim.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Memory;

namespace Bim.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _cache;
        private readonly ILogger<AuthController> _logger;

        private readonly INotificationService _notificationService;

        // Clé utilisée pour stocker les tokens de réinitialisation dans le cache
        private const string RESET_TOKEN_CACHE_PREFIX = "PasswordReset_";
        private const int TOKEN_EXPIRY_MINUTES = 30;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration configuration,
            IMemoryCache cache,
            ILogger<AuthController> logger,
            INotificationService notificationService)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _configuration = configuration;
            _cache = cache;
            _logger = logger;
            _notificationService = notificationService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            try
            {
                _logger.LogInformation("Login attempt for user: {Email}", model.Email);
                
                var user = await _userManager.FindByEmailAsync(model.Email);
                
                if (user == null)
                {
                    _logger.LogWarning("Login failed: User not found for email: {Email}", model.Email);
                    return Unauthorized(new { message = "Email ou mot de passe incorrect" });
                }

                if (!user.IsActive)
                {
                    _logger.LogWarning("Login failed: User account is inactive: {Email}", model.Email);
                    return Unauthorized(new { message = "Votre compte est désactivé. Contactez l'administrateur." });
                }

                if (!await _userManager.CheckPasswordAsync(user, model.Password))
                {
                    _logger.LogWarning("Login failed: Invalid password for user: {Email}", model.Email);
                    return Unauthorized(new { message = "Email ou mot de passe incorrect" });
                }

                var userRoles = await _userManager.GetRolesAsync(user);
                  var authClaims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
                    new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                    new Claim("FirstName", user.FirstName ?? string.Empty),
                    new Claim("LastName", user.LastName ?? string.Empty)
                };
                
                foreach (var userRole in userRoles)
                {
                    authClaims.Add(new Claim(ClaimTypes.Role, userRole));
                }
                
                var token = CreateToken(authClaims);
                var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
                
                _logger.LogInformation("Login successful for user: {Email}", model.Email);
                
                user.LastLogin = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);

                return Ok(new
                {
                    token = tokenString,
                    expiration = token.ValidTo,
                    user = new
                    {
                        id = user.Id,
                        userName = user.UserName,
                        email = user.Email,
                        firstName = user.FirstName,
                        lastName = user.LastName,
                        roles = userRoles
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred during login for user: {Email}", model.Email);
                return StatusCode(500, new { message = "Une erreur s'est produite lors de la connexion" });
            }
        }

        [HttpPost("register")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Register([FromBody] RegisterModel model)
        {
            try
            {
                var userExists = await _userManager.FindByEmailAsync(model.Email);
                
                if (userExists != null)
                    return StatusCode(StatusCodes.Status400BadRequest, new { message = "Un utilisateur avec cet email existe déjà" });

                if (!string.IsNullOrEmpty(model.Role) && !await _roleManager.RoleExistsAsync(model.Role))
                {
                    var roleResult = await _roleManager.CreateAsync(new IdentityRole(model.Role));
                    if (!roleResult.Succeeded)
                    {
                        return StatusCode(StatusCodes.Status500InternalServerError, 
                            new { message = "Erreur lors de la création du rôle", errors = roleResult.Errors.Select(e => e.Description) });
                    }
                }

                var user = new ApplicationUser
                {
                    Email = model.Email,
                    SecurityStamp = Guid.NewGuid().ToString(),
                    UserName = model.Email,
                    FirstName = model.FirstName,
                    LastName = model.LastName,
                    Company = model.Company,
                    Position = model.Position,
                    IsActive = true
                };
                
                var result = await _userManager.CreateAsync(user, model.Password);
                
                if (!result.Succeeded)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, 
                        new { message = "Erreur lors de la création de l'utilisateur", errors = result.Errors.Select(e => e.Description) });
                }

                var roleToAdd = !string.IsNullOrEmpty(model.Role) ? model.Role : "User";
                if (await _roleManager.RoleExistsAsync(roleToAdd))
                {
                    await _userManager.AddToRoleAsync(user, roleToAdd);
                }
                else
                {
                    await _roleManager.CreateAsync(new IdentityRole(roleToAdd));
                    await _userManager.AddToRoleAsync(user, roleToAdd);
                }

                return Ok(new { message = "Utilisateur créé avec succès" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Une erreur s'est produite lors de l'enregistrement de l'utilisateur");
                return StatusCode(StatusCodes.Status500InternalServerError, 
                    new { message = "Une erreur inattendue s'est produite", error = ex.Message });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("GetCurrentUser: No user ID found in claims");
                    return Unauthorized();
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("GetCurrentUser: User not found for ID: {UserId}", userId);
                    return NotFound("Utilisateur non trouvé");
                }

                var roles = await _userManager.GetRolesAsync(user);
                var claims = await _userManager.GetClaimsAsync(user);

                _logger.LogInformation(
                    "GetCurrentUser: Retrieved user data. UserId: {UserId}, Roles: {Roles}",
                    userId,
                    string.Join(", ", roles)
                );

                var userInfo = new
                {
                    Id = user.Id,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Company = user.Company,
                    Position = user.Position,
                    Roles = roles.ToArray(),
                    Claims = claims.Select(c => new { type = c.Type, value = c.Value }).ToArray(),
                    IsActive = user.IsActive
                };

                return Ok(userInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving current user");
                return StatusCode(500, "Une erreur s'est produite lors de la récupération des informations de l'utilisateur");
            }
        }

        [HttpGet("verify")]
        [Authorize]
        public IActionResult Verify()
        {
            return Ok(new { isValid = true });
        }

        private JwtSecurityToken CreateToken(List<Claim> authClaims)
        {
            _logger.LogInformation(
                "Creating JWT token with claims: {Claims}",
                string.Join(", ", authClaims.Select(c => $"{c.Type}: {c.Value}"))
            );

            var authSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Secret"] ?? 
                throw new InvalidOperationException("JWT Secret not found"))
            );
            
            var tokenValidityInDays = int.Parse(_configuration["Jwt:ExpiryInDays"] ?? "7");

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                expires: DateTime.Now.AddDays(tokenValidityInDays),
                claims: authClaims,
                signingCredentials: new SigningCredentials(
                    authSigningKey, 
                    SecurityAlgorithms.HmacSha256
                )
            );

            return token;
        }

        private void CacheUserData(ApplicationUser user, IList<string> roles)
        {
            var cacheEntryOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromMinutes(30))
                .SetSize(1);

            var userData = new Dictionary<string, object>
            {
                { "UserId", user.Id },
                { "Roles", roles }
            };

            _cache.Set($"UserData_{user.Id}", userData, cacheEntryOptions);
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordModel model)
        {
            try
            {
                _logger.LogInformation("Password reset request for email: {Email}", model.Email);
                
                var user = await _userManager.FindByEmailAsync(model.Email);
                if (user == null)
                {
                    _logger.LogWarning("Password reset request for non-existent email: {Email}", model.Email);
                    // Retourner 200 pour ne pas révéler si l'email existe ou non
                    return Ok(new { message = "Si votre email est associé à un compte, vous recevrez un email de réinitialisation" });
                }

                // Générer un token aléatoire sécurisé
                var tokenBytes = new byte[32];
                using (var rng = RandomNumberGenerator.Create())
                {
                    rng.GetBytes(tokenBytes);
                }
                var token = Convert.ToBase64String(tokenBytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
                
                // Stocker le token dans le cache avec expiration
                var resetTokenInfo = new PasswordResetToken
                {
                    UserId = user.Id,
                    Token = token,
                    ExpiryDate = DateTime.UtcNow.AddMinutes(TOKEN_EXPIRY_MINUTES)
                };
                
                _cache.Set(RESET_TOKEN_CACHE_PREFIX + token, resetTokenInfo, TimeSpan.FromMinutes(TOKEN_EXPIRY_MINUTES));
                
                // Construction du lien de réinitialisation
                var resetLink = $"{Request.Scheme}://{Request.Host}/reset-password/{token}";
                
                // Dans un environnement réel, envoyer un email avec le lien
                // Pour l'instant, utilisons notre service de notification pour simuler
                var emailSubject = "Réinitialisation de votre mot de passe Smart BIM";
                var emailBody = $@"
                    <h2>Réinitialisation de votre mot de passe</h2>
                    <p>Bonjour {user.FirstName},</p>
                    <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
                    <p>Pour réinitialiser votre mot de passe, veuillez cliquer sur le lien ci-dessous :</p>
                    <p><a href='{resetLink}'>{resetLink}</a></p>
                    <p>Ce lien expirera dans {TOKEN_EXPIRY_MINUTES} minutes.</p>
                    <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
                    <p>Cordialement,<br>L'équipe Smart BIM</p>
                ";
                
                if (!string.IsNullOrEmpty(user.Email))
                {
                    await _notificationService.SendEmailNotificationAsync(user.Email, emailSubject, emailBody);
                }
                
                // Log pour développement/débogage
                _logger.LogInformation("Password reset link: {Link}", resetLink);
                
                return Ok(new { 
                    message = "Un email de réinitialisation a été envoyé si l'adresse est associée à un compte",
                    // Uniquement pour faciliter le développement, à retirer en production
                    debug = new { link = resetLink, token = token }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing password reset request for email: {Email}", model.Email);
                return StatusCode(500, new { message = "Une erreur est survenue lors du traitement de votre demande" });
            }
        }
        
        [HttpGet("reset-password/validate")]
        public IActionResult ValidateResetToken([FromQuery] string token)
        {
            try
            {
                if (string.IsNullOrEmpty(token))
                {
                    return BadRequest(new { valid = false, message = "Token manquant" });
                }
                
                // Récupérer les informations du token depuis le cache
                if (_cache.TryGetValue(RESET_TOKEN_CACHE_PREFIX + token, out PasswordResetToken? tokenInfo) && tokenInfo != null)
                {
                    if (tokenInfo.ExpiryDate > DateTime.UtcNow)
                    {
                        return Ok(new { valid = true });
                    }
                    
                    _logger.LogWarning("Reset token expired: {Token}", token);
                    return BadRequest(new { valid = false, message = "Le lien a expiré" });
                }
                
                _logger.LogWarning("Invalid reset token: {Token}", token);
                return BadRequest(new { valid = false, message = "Lien de réinitialisation invalide" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating reset token");
                return StatusCode(500, new { valid = false, message = "Une erreur est survenue lors de la validation du lien" });
            }
        }
        
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordModel model)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { message = "Données invalides" });
                }
                
                // Récupérer les informations du token depuis le cache
                if (!_cache.TryGetValue(RESET_TOKEN_CACHE_PREFIX + model.Token, out PasswordResetToken? tokenInfo) || tokenInfo == null)
                {
                    _logger.LogWarning("Reset password attempt with invalid token: {Token}", model.Token);
                    return BadRequest(new { message = "Le lien de réinitialisation est invalide ou a expiré" });
                }
                
                if (tokenInfo.ExpiryDate <= DateTime.UtcNow)
                {
                    _logger.LogWarning("Reset password attempt with expired token: {Token}", model.Token);
                    return BadRequest(new { message = "Le lien de réinitialisation a expiré" });
                }
                
                // Trouver l'utilisateur
                var user = await _userManager.FindByIdAsync(tokenInfo.UserId);
                if (user == null)
                {
                    _logger.LogWarning("User not found for reset token: {Token}, UserId: {UserId}", model.Token, tokenInfo.UserId);
                    return BadRequest(new { message = "Utilisateur non trouvé" });
                }
                
                // Vérifier que le mot de passe répond aux exigences de sécurité
                var passwordValidators = _userManager.PasswordValidators;
                foreach (var validator in passwordValidators)
                {
                    var validationResult = await validator.ValidateAsync(_userManager, user, model.NewPassword);
                    if (!validationResult.Succeeded)
                    {
                        return BadRequest(new { 
                            message = "Le mot de passe ne répond pas aux exigences de sécurité", 
                            errors = validationResult.Errors.Select(e => e.Description) 
                        });
                    }
                }
                
                // Générer un token de réinitialisation pour Identity
                var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
                
                // Réinitialiser le mot de passe
                var result = await _userManager.ResetPasswordAsync(user, resetToken, model.NewPassword);
                if (!result.Succeeded)
                {
                    _logger.LogWarning("Failed to reset password for user: {UserId}, Errors: {Errors}", 
                        user.Id, string.Join(", ", result.Errors.Select(e => e.Description)));
                    
                    return BadRequest(new { 
                        message = "Échec de la réinitialisation du mot de passe", 
                        errors = result.Errors.Select(e => e.Description) 
                    });
                }
                
                // Supprimer le token du cache
                _cache.Remove(RESET_TOKEN_CACHE_PREFIX + model.Token);
                
                _logger.LogInformation("Password reset successful for user: {UserId}", user.Id);
                
                // Envoyer une notification à l'utilisateur
                var emailSubject = "Votre mot de passe a été modifié";
                var emailBody = $@"
                    <h2>Confirmation de changement de mot de passe</h2>
                    <p>Bonjour {user.FirstName},</p>
                    <p>Votre mot de passe a été modifié avec succès.</p>
                    <p>Si vous n'êtes pas à l'origine de cette action, veuillez contacter immédiatement l'équipe de support.</p>
                    <p>Cordialement,<br>L'équipe Smart BIM</p>
                ";
                
                if (!string.IsNullOrEmpty(user.Email))
                {
                    await _notificationService.SendEmailNotificationAsync(user.Email, emailSubject, emailBody);
                }
                
                return Ok(new { message = "Mot de passe réinitialisé avec succès" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password with token: {Token}", model.Token);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la réinitialisation du mot de passe" });
            }
        }
    }
}
