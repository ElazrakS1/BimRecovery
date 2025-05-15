using Bim.Server.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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

        public AuthController(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration configuration,
            IMemoryCache cache,
            ILogger<AuthController> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _configuration = configuration;
            _cache = cache;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            
            if (user == null)
                return Unauthorized(new { message = "Email ou mot de passe incorrect" });

            if (!user.IsActive)
                return Unauthorized(new { message = "Votre compte est désactivé. Contactez l'administrateur." });

            if (!await _userManager.CheckPasswordAsync(user, model.Password))
                return Unauthorized(new { message = "Email ou mot de passe incorrect" });

            var userRoles = await _userManager.GetRolesAsync(user);
            
            var authClaims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
                new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };
            
            foreach (var userRole in userRoles)
            {
                authClaims.Add(new Claim(ClaimTypes.Role, userRole));
            }
            
            var token = CreateToken(authClaims);
            
            user.LastLogin = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            CacheUserData(user, userRoles);
            
            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
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
                    return Unauthorized();
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound("Utilisateur non trouvé");
                }

                var roles = await _userManager.GetRolesAsync(user);

                var userInfo = new
                {
                    Id = user.Id,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Company = user.Company,
                    Position = user.Position,
                    Roles = roles.ToArray(),
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
        public IActionResult VerifyToken()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Token invalide" });
                }
                
                return Ok(new { message = "Token valide" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la vérification du token");
                return StatusCode(500, new { message = "Erreur lors de la vérification du token" });
            }
        }

        private JwtSecurityToken CreateToken(List<Claim> authClaims)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? 
                throw new InvalidOperationException("JWT Key is not configured");
            var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

            var expiryInDays = int.Parse(_configuration["Jwt:ExpiryInDays"] ?? "7");
            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                expires: DateTime.Now.AddDays(expiryInDays),
                claims: authClaims,
                signingCredentials: new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)
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
    }
}
