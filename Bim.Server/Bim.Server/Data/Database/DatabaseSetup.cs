using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Bim.Server.Data.Database
{
    public static class DatabaseSetup
    {
        public static IServiceCollection AddBimDatabase(
            this IServiceCollection services,
            string connectionString)
        {            // Register DbContext
            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseSqlServer(connectionString, sqlServerOptions =>
                {
                    sqlServerOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(30),
                        errorNumbersToAdd: null);
                    sqlServerOptions.CommandTimeout(30);
                });
            });

            return services;
        }        public static async Task InitializeDatabase(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var services = scope.ServiceProvider;

            try
            {
                var context = services.GetRequiredService<ApplicationDbContext>();
                await EnsureDatabaseCreated(context);
                await ApplyMigrations(context);
                await SeedData(services);
            }            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<ApplicationDbContext>>();
                logger.LogError(ex, "An error occurred while initializing the database.");
                throw;
            }
        }

        private static async Task EnsureDatabaseCreated(ApplicationDbContext context)
        {
            if (!await context.Database.CanConnectAsync())
            {
                await context.Database.EnsureCreatedAsync();
            }
        }

        private static async Task ApplyMigrations(ApplicationDbContext context)
        {
            if ((await context.Database.GetPendingMigrationsAsync()).Any())
            {
                await context.Database.MigrateAsync();
            }
        }

        private static async Task SeedData(IServiceProvider services)
        {
            await AdminUserSeeder.SeedAdminUser(services);
            await TestUsersSeeder.SeedTestUsers(services);
            // Add other seeding operations here if needed
        }
    }
}
