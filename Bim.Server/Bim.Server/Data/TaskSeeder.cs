using Bim.Server.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace Bim.Server.Data
{
    public static class TaskSeeder
    {
        public static async System.Threading.Tasks.Task SeedTasks(ApplicationDbContext context)
        {
            if (!context.Tasks.Any())
            {
                // First, ensure we have some users to assign tasks to
                var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@bimrecovery.com");
                if (adminUser == null)
                {
                    // Skip seeding if no users exist yet
                    return;
                }

                var tasks = new List<TaskItem>
                {
                    new TaskItem
                    {
                        Title = "Examiner le modèle BIM du bâtiment principal",
                        Status = "In Progress",
                        DueDate = DateTime.Now.AddDays(7),
                        Priority = "High",
                        AssignedToId = adminUser.Id,
                        CreatedById = adminUser.Id,
                        CreatedAt = DateTime.UtcNow,
                        ProjectId = 1 // Assuming project 1 exists
                    },
                    new TaskItem
                    {
                        Title = "Mettre à jour la documentation technique",
                        Status = "Pending",
                        DueDate = DateTime.Now.AddDays(14),
                        Priority = "Medium",
                        AssignedToId = adminUser.Id,
                        CreatedById = adminUser.Id,
                        CreatedAt = DateTime.UtcNow,
                        ProjectId = 1
                    },
                    new TaskItem
                    {
                        Title = "Résoudre les conflits de modélisation",
                        Status = "Pending",
                        DueDate = DateTime.Now.AddDays(5),
                        Priority = "High",
                        AssignedToId = adminUser.Id,
                        CreatedById = adminUser.Id,
                        CreatedAt = DateTime.UtcNow,
                        ProjectId = 1
                    },
                    new TaskItem
                    {
                        Title = "Valider les spécifications MEP",
                        Status = "Completed",
                        DueDate = DateTime.Now.AddDays(-2),
                        Priority = "Medium",
                        AssignedToId = adminUser.Id,
                        CreatedById = adminUser.Id,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        ProjectId = 1
                    }
                };

                await context.Tasks.AddRangeAsync(tasks);
                await context.SaveChangesAsync();
            }
        }
    }
}
