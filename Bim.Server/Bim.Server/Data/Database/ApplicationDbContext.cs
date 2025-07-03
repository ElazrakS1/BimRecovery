using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Bim.Server.Models;
using System;

namespace Bim.Server.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }        public DbSet<Project> Projects { get; set; } = null!;
        public DbSet<IFCFile> IFCFiles { get; set; } = null!;
        public DbSet<ToolUsage> ToolUsages { get; set; } = null!;
        public DbSet<TaskItem> Tasks { get; set; } = null!;
        public DbSet<SystemLog> SystemLogs { get; set; } = null!;        // Collaboration entities
        public DbSet<Annotation> Annotations { get; set; } = null!;
        public DbSet<Models.Task> CollaborationTasks { get; set; } = null!;
        public DbSet<TaskComment> TaskComments { get; set; } = null!;
        public DbSet<TaskHistory> TaskHistory { get; set; } = null!;
        public DbSet<TaskAssignment> TaskAssignments { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure SystemLog entity
            builder.Entity<SystemLog>(entity =>
            {
                entity.ToTable("SystemLogs");
                
                // Primary Key
                entity.HasKey(x => x.Id);
                
                // Properties
                entity.Property(x => x.Id)
                      .ValueGeneratedOnAdd();
                
                entity.Property(x => x.Timestamp)
                      .IsRequired()
                      .HasColumnType("datetime2");
                
                entity.Property(x => x.Action)
                      .IsRequired()
                      .HasMaxLength(100);
                
                entity.Property(x => x.Resource)
                      .IsRequired()
                      .HasMaxLength(200);
                
                entity.Property(x => x.Level)
                      .IsRequired()
                      .HasMaxLength(50)
                      .HasDefaultValue("info");
                
                entity.Property(x => x.UserId)
                      .HasMaxLength(450);
                
                entity.Property(x => x.UserName)
                      .HasMaxLength(256);
                
                entity.Property(x => x.Details)
                      .HasMaxLength(4000);
                
                entity.Property(x => x.IpAddress)
                      .HasMaxLength(50);

                // Indexes
                entity.HasIndex(x => x.Timestamp);
                entity.HasIndex(x => x.UserId);
                entity.HasIndex(x => x.Action);
                entity.HasIndex(x => x.Resource);
                entity.HasIndex(x => x.Level);
                entity.HasIndex(x => new { x.Timestamp, x.Level });
                entity.HasIndex(x => new { x.UserId, x.Timestamp });
                entity.HasIndex(x => new { x.Action, x.Resource });

                // Relationships
                entity.HasOne(x => x.User)
                      .WithMany()
                      .HasForeignKey(x => x.UserId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // Identity tables configuration
            builder.Entity<ApplicationUser>().ToTable("Users");
            builder.Entity<IdentityRole>().ToTable("Roles");
            builder.Entity<IdentityUserRole<string>>().ToTable("UserRoles");
            builder.Entity<IdentityUserClaim<string>>().ToTable("UserClaims");
            builder.Entity<IdentityUserLogin<string>>().ToTable("UserLogins");
            builder.Entity<IdentityRoleClaim<string>>().ToTable("RoleClaims");
            builder.Entity<IdentityUserToken<string>>().ToTable("UserTokens");

            // Configure relationships for other entities
            builder.Entity<IFCFile>()
                .HasOne(f => f.Project)
                .WithMany(p => p.IFCFiles)
                .HasForeignKey(f => f.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ToolUsage>()
                .HasOne(t => t.Project)
                .WithMany(p => p.ToolUsages)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<TaskItem>()
                .HasOne(t => t.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<TaskItem>()
                .HasOne(t => t.AssignedTo)
                .WithMany()
                .HasForeignKey(t => t.AssignedToId)
                .OnDelete(DeleteBehavior.Restrict);            builder.Entity<TaskItem>()
                .HasOne(t => t.CreatedBy)
                .WithMany()
                .HasForeignKey(t => t.CreatedById)
                .OnDelete(DeleteBehavior.SetNull);            // Configure Annotation entity
            builder.Entity<Annotation>(entity =>
            {
                entity.HasKey(a => a.Id);
                
                entity.Property(a => a.Content)
                      .IsRequired()
                      .HasMaxLength(2000);
                
                entity.Property(a => a.AnnotationType)
                      .IsRequired()
                      .HasMaxLength(50);
                
                entity.Property(a => a.Style)
                      .HasMaxLength(1000);
                
                entity.HasOne(a => a.Project)
                      .WithMany()
                      .HasForeignKey(a => a.ProjectId)
                      .OnDelete(DeleteBehavior.Cascade);
                  entity.HasOne(a => a.Author)
                      .WithMany()
                      .HasForeignKey(a => a.AuthorId)
                      .OnDelete(DeleteBehavior.Restrict);
                
                entity.HasOne(a => a.ParentAnnotation)
                      .WithMany(a => a.Replies)
                      .HasForeignKey(a => a.ParentAnnotationId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure Task entity  
            builder.Entity<Models.Task>(entity =>
            {
                entity.ToTable("CollaborationTasks"); // Use different table name to avoid confusion
                entity.HasKey(t => t.Id);
                
                entity.Property(t => t.Title)
                      .IsRequired()
                      .HasMaxLength(200);
                
                entity.Property(t => t.Status)
                      .IsRequired()
                      .HasMaxLength(50);
                
                entity.Property(t => t.Priority)
                      .IsRequired()
                      .HasMaxLength(50);
                
                entity.HasOne(t => t.Project)
                      .WithMany()
                      .HasForeignKey(t => t.ProjectId)
                      .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(t => t.AssignedTo)
                      .WithMany()
                      .HasForeignKey(t => t.AssignedToId)
                      .OnDelete(DeleteBehavior.SetNull);
                  entity.HasOne(t => t.CreatedBy)
                      .WithMany()
                      .HasForeignKey(t => t.CreatedById)
                      .OnDelete(DeleteBehavior.Restrict);
                
                entity.HasOne(t => t.RelatedAnnotation)
                      .WithMany()
                      .HasForeignKey(t => t.RelatedAnnotationId)
                      .OnDelete(DeleteBehavior.SetNull);
            });            // Configure Notification entity
            builder.Entity<Notification>(entity =>
            {
                entity.HasKey(n => n.Id);
                
                entity.Property(n => n.Title)
                      .IsRequired()
                      .HasMaxLength(200);
                
                entity.Property(n => n.Type)
                      .IsRequired()
                      .HasMaxLength(50);
                
                entity.Property(n => n.Priority)
                      .IsRequired()
                      .HasMaxLength(20);
                
                entity.Property(n => n.Metadata)
                      .HasColumnType("nvarchar(max)");
                
                entity.HasOne(n => n.User)
                      .WithMany()
                      .HasForeignKey(n => n.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(n => n.Project)
                      .WithMany()
                      .HasForeignKey(n => n.ProjectId)
                      .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(n => n.Task)
                      .WithMany()
                      .HasForeignKey(n => n.TaskId)
                      .OnDelete(DeleteBehavior.SetNull);
                
                entity.HasOne(n => n.Annotation)
                      .WithMany()
                      .HasForeignKey(n => n.AnnotationId)
                      .OnDelete(DeleteBehavior.SetNull);
                
                entity.HasOne(n => n.TriggeredBy)
                      .WithMany()
                      .HasForeignKey(n => n.TriggeredById)
                      .OnDelete(DeleteBehavior.SetNull);
            });
              // Configure NotificationPreference entity
            builder.Entity<NotificationPreference>(entity =>
            {
                entity.HasKey(np => np.Id);
                
                entity.HasOne(np => np.User)
                      .WithMany()
                      .HasForeignKey(np => np.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure TaskAssignment entity (many-to-many relationship)
            builder.Entity<TaskAssignment>(entity =>
            {
                entity.HasKey(ta => ta.Id);
                
                entity.Property(ta => ta.Status)
                      .IsRequired()
                      .HasMaxLength(20)
                      .HasDefaultValue("active");
                
                entity.HasOne(ta => ta.Task)
                      .WithMany(t => t.Assignments)
                      .HasForeignKey(ta => ta.TaskId)
                      .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(ta => ta.User)
                      .WithMany()
                      .HasForeignKey(ta => ta.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(ta => ta.AssignedBy)
                      .WithMany()
                      .HasForeignKey(ta => ta.AssignedById)
                      .OnDelete(DeleteBehavior.Restrict);
                      
                // Index for better performance on queries
                entity.HasIndex(ta => new { ta.TaskId, ta.UserId, ta.Status });
            });
        }
    }
}
