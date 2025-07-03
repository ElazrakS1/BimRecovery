using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Bim.Server.Models;

namespace Bim.Server.Data.Configurations
{
    public class SystemLogConfiguration : IEntityTypeConfiguration<SystemLog>
    {
        public void Configure(EntityTypeBuilder<SystemLog> builder)
        {
            // Primary key
            builder.HasKey(x => x.Id);

            // Required fields
            builder.Property(x => x.Timestamp).IsRequired();
            builder.Property(x => x.Action).IsRequired().HasMaxLength(100);
            builder.Property(x => x.Resource).IsRequired().HasMaxLength(200);
            
            // Optional fields with constraints
            builder.Property(x => x.UserId).HasMaxLength(450); // Match ASP.NET Identity's key length
            builder.Property(x => x.UserName).HasMaxLength(256);
            builder.Property(x => x.Details).HasMaxLength(4000);
            
            // Level field with default value
            builder.Property(x => x.Level)
                .IsRequired()
                .HasMaxLength(50)
                .HasDefaultValue("info");

            builder.Property(x => x.IpAddress).HasMaxLength(50);

            // Relationship
            builder.HasOne(x => x.User)
                  .WithMany()
                  .HasForeignKey(x => x.UserId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Indexes for common queries
            builder.HasIndex(x => x.Timestamp);
            builder.HasIndex(x => x.UserId);
            builder.HasIndex(x => x.Action);
            builder.HasIndex(x => x.Resource);
            builder.HasIndex(x => x.Level);

            // Composite indexes for common filtering scenarios
            builder.HasIndex(x => new { x.Timestamp, x.Level });
            builder.HasIndex(x => new { x.UserId, x.Timestamp });
            builder.HasIndex(x => new { x.Action, x.Resource });
        }
    }
}
