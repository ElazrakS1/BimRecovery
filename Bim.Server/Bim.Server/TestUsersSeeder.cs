using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Bim.Server.Models;
using Bim.Server.Data;
using SystemTask = System.Threading.Tasks.Task;

namespace Bim.Server.Data
{
    public static class TestUsersSeeder
    {
        public static async SystemTask SeedTestUsers(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            // Create User role if it doesn't exist
            if (!await roleManager.RoleExistsAsync("User"))
            {
                await roleManager.CreateAsync(new IdentityRole("User"));
            }

            // Liste des utilisateurs de test
            var testUsers = new[]
            {
                new {
                    Email = "john.doe@bimrecovery.com",
                    FirstName = "John",
                    LastName = "Doe",
                    Company = "BIM Recovery Inc.",
                    Position = "BIM Coordinator"
                },
                new {
                    Email = "jane.smith@bimrecovery.com",
                    FirstName = "Jane",
                    LastName = "Smith",
                    Company = "BIM Recovery Inc.",
                    Position = "Project Manager"
                },
                new {
                    Email = "mike.johnson@bimrecovery.com",
                    FirstName = "Mike",
                    LastName = "Johnson",
                    Company = "BIM Recovery Inc.",
                    Position = "BIM Specialist"
                },
                new {
                    Email = "sarah.wilson@bimrecovery.com",
                    FirstName = "Sarah",
                    LastName = "Wilson",
                    Company = "BIM Recovery Inc.",
                    Position = "Quality Assurance"
                },
                new {
                    Email = "david.brown@bimrecovery.com",
                    FirstName = "David",
                    LastName = "Brown",
                    Company = "Construction Co.",
                    Position = "Site Engineer"
                }
            };

            foreach (var userData in testUsers)
            {
                if (await userManager.FindByEmailAsync(userData.Email) == null)
                {
                    var user = new ApplicationUser
                    {
                        UserName = userData.Email,
                        Email = userData.Email,
                        FirstName = userData.FirstName,
                        LastName = userData.LastName,
                        Company = userData.Company,
                        Position = userData.Position,
                        EmailConfirmed = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    var result = await userManager.CreateAsync(user, "TestUser123!");
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(user, "User");
                        Console.WriteLine($"✅ User created: {userData.FirstName} {userData.LastName} ({userData.Email})");
                    }
                    else
                    {
                        Console.WriteLine($"❌ Failed to create user {userData.Email}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                    }
                }
                else
                {
                    Console.WriteLine($"ℹ️ User already exists: {userData.Email}");
                }
            }
        }
    }
}
