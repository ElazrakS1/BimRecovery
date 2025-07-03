using Microsoft.EntityFrameworkCore;

namespace Bim.Server.Data
{
    public class BimDbContext : DbContext
    {
        public BimDbContext(DbContextOptions<BimDbContext> options) : base(options)
        {
        }
        
        // Add your DbSet properties here
    }
}
