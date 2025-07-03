using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Bim.Server.Data;
using Bim.Server.Models;
using Bim.Server.Models.DTOs;
using Bim.Server.Services;
using Bim.Server.Hubs;

namespace Bim.Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase    {
    private readonly ApplicationDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly UserManager<ApplicationUser>? _userManager;
        private readonly IHubContext<CollaborationHub>? _hubContext;
        private readonly ILogger<TasksController> _logger;

        public TasksController(
            ApplicationDbContext context,
            INotificationService notificationService,
            ILogger<TasksController> logger,
            UserManager<ApplicationUser>? userManager = null,
            IHubContext<CollaborationHub>? hubContext = null)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
            _userManager = userManager;
            _hubContext = hubContext;
        }

        // Helper method to normalize task properties
        private void NormalizeTaskProperties(TaskItem task)
        {
            var type = task.GetType();

            // Map common properties from camelCase to PascalCase if needed
            var titleValue = task.Title ?? type.GetProperty("title")?.GetValue(task)?.ToString();
            if (!string.IsNullOrEmpty(titleValue))
            {
                task.Title = titleValue;
            }

            var descriptionValue = task.Description ?? type.GetProperty("description")?.GetValue(task)?.ToString();
            task.Description = descriptionValue;

            var statusValue = task.Status ?? type.GetProperty("status")?.GetValue(task)?.ToString() ?? "Pending";
            task.Status = statusValue;

            var priorityValue = task.Priority ?? type.GetProperty("priority")?.GetValue(task)?.ToString();
            task.Priority = priorityValue;

            var assignedToIdValue = task.AssignedToId ?? type.GetProperty("assignedToId")?.GetValue(task)?.ToString();
            if (!string.IsNullOrEmpty(assignedToIdValue))
            {
                task.AssignedToId = assignedToIdValue;
            }

            if (task.ProjectId == 0)
            {
                var projectIdProperty = type.GetProperty("projectId");
                if (projectIdProperty != null)
                {
                    var projectIdValue = projectIdProperty.GetValue(task);
                    if (projectIdValue != null)
                    {
                        task.ProjectId = Convert.ToInt32(projectIdValue);
                    }
                }
            }

            // Handle estimated and actual hours
            var estimatedHoursProperty = type.GetProperty("estimatedHours") ?? type.GetProperty("EstimatedHours");
            if (estimatedHoursProperty?.GetValue(task) is int estimatedHours)
            {
                task.EstimatedHours = estimatedHours;
            }

            var actualHoursProperty = type.GetProperty("actualHours") ?? type.GetProperty("ActualHours");
            if (actualHoursProperty?.GetValue(task) is int actualHours)
            {
                task.ActualHours = actualHours;
            }

            // Handle due date if it exists
            var dueDateProperty = type.GetProperty("dueDate") ?? type.GetProperty("DueDate");
            if (dueDateProperty?.GetValue(task) is DateTime dueDate)
            {
                task.DueDate = dueDate;
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetTasks()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("GetTasks: Unauthorized access attempt");                return Unauthorized(new { message = "Utilisateur non authentifié" });
            }

            var tasks = await _context.Tasks
                .Include(t => t.CreatedBy)
                .Include(t => t.AssignedTo)
                .Include(t => t.Project)
                .Where(t => !t.IsDeleted)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                    {
                        t.Id,
                        t.Title,
                        t.Description,
                        t.Status,
                        t.Priority,
                        t.DueDate,
                        t.EstimatedHours,
                        t.ActualHours,
                        t.CreatedAt,
                        t.UpdatedAt,
                        ProjectId = t.Project.Id,
                        ProjectName = t.Project.Name,
                        AssignedTo = new
                        {
                            t.AssignedTo.Id,
                            t.AssignedTo.Email,
                            Name = $"{t.AssignedTo.FirstName} {t.AssignedTo.LastName}"
                        },
                        CreatedBy = t.CreatedBy != null ? new
                        {
                            t.CreatedBy.Id,
                            t.CreatedBy.Email,
                            Name = $"{t.CreatedBy.FirstName} {t.CreatedBy.LastName}"
                        } : null
                    })
                    .ToListAsync();

                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving tasks");                return StatusCode(500, new { message = "Une erreur s'est produite lors de la récupération des tâches" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TaskItem>> GetTask(int id)
        {
            var task = await _context.Tasks
                .Include(t => t.CreatedBy)
                .Include(t => t.AssignedTo)
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

            if (task == null)
            {
                return NotFound(new { message = "Tâche non trouvée" });
            }

            return task;
        }        [HttpPost]        
        public async Task<ActionResult<TaskItem>> CreateTask(TaskItem task)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Utilisateur non authentifié" });
                }

                // Normalize incoming task properties
                NormalizeTaskProperties(task);

                // Validate required fields
                if (string.IsNullOrWhiteSpace(task.Title))
                {
                    return BadRequest(new { message = "Le titre de la tâche est requis" });
                }

                if (string.IsNullOrWhiteSpace(task.AssignedToId))
                {
                    return BadRequest(new { message = "L'attribution est requise" });
                }

                if (task.ProjectId <= 0)
                {
                    return BadRequest(new { message = "Le projet est requis" });
                }

                // Check if Project exists
                var project = await _context.Projects.FindAsync(task.ProjectId);
                if (project == null)
                {
                    _logger.LogError("Task creation failed: Project with ID {ProjectId} not found", task.ProjectId);
                    return BadRequest(new { message = "Le projet spécifié n'existe pas" });
                }                // Check if user exists
                if (_userManager != null)
                {
                    var user = await _userManager.FindByIdAsync(task.AssignedToId);
                    if (user == null)
                    {
                        _logger.LogError("Task creation failed: User with ID {UserId} not found", task.AssignedToId);
                        return BadRequest(new { message = "L'utilisateur assigné n'existe pas" });
                    }
                }

                // Set creation metadata
                task.CreatedById = userId;
                task.CreatedAt = DateTime.UtcNow;
                task.Status = task.Status ?? "Pending";
                task.Priority = task.Priority ?? "Medium";

                _context.Tasks.Add(task);
                await _context.SaveChangesAsync();                // Notify assigned user
                if (_hubContext != null)
                {
                    await _hubContext.Clients.User(task.AssignedToId).SendAsync("ReceiveNotification", 
                        new { type = "TaskAssigned", message = $"Une nouvelle tâche vous a été assignée : {task.Title}" });
                }

                return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task: {Message}", ex.Message);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la création de la tâche" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, TaskItem task)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Utilisateur non authentifié" });
                }

                var existingTask = await _context.Tasks
                    .Include(t => t.AssignedTo)
                    .Include(t => t.Project)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (existingTask == null)
                {
                    return NotFound(new { message = "Tâche non trouvée" });
                }

                // Normalize incoming task properties
                NormalizeTaskProperties(task);

                // Validate required fields
                if (string.IsNullOrWhiteSpace(task.Title))
                {
                    return BadRequest(new { message = "Le titre de la tâche est requis" });
                }

                if (string.IsNullOrWhiteSpace(task.AssignedToId))
                {
                    return BadRequest(new { message = "L'attribution est requise" });
                }                // Check if user exists if assignment has changed
                if (task.AssignedToId != existingTask.AssignedToId && _userManager != null)
                {
                    var newAssignedUser = await _userManager.FindByIdAsync(task.AssignedToId);
                    if (newAssignedUser == null)
                    {
                        return BadRequest(new { message = "L'utilisateur assigné n'existe pas" });
                    }
                }

                // Update the properties
                existingTask.Title = task.Title;
                existingTask.Description = task.Description;
                existingTask.Status = task.Status ?? existingTask.Status;
                existingTask.Priority = task.Priority ?? existingTask.Priority;
                existingTask.DueDate = task.DueDate;
                existingTask.EstimatedHours = task.EstimatedHours;
                existingTask.ActualHours = task.ActualHours;
                existingTask.AssignedToId = task.AssignedToId;
                existingTask.UpdatedAt = DateTime.UtcNow;

                try
                {
                    await _context.SaveChangesAsync();                // Notify the newly assigned user if assignment has changed
                    if (task.AssignedToId != existingTask.AssignedToId && _hubContext != null)
                    {
                        await _hubContext.Clients.User(task.AssignedToId).SendAsync("ReceiveNotification",
                            new { type = "TaskAssigned", message = $"Une tâche vous a été assignée : {task.Title}" });
                    }

                    return Ok(existingTask);
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!await TaskExists(id))
                    {
                        return NotFound(new { message = "Tâche non trouvée" });
                    }
                    else
                    {
                        throw;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating task: {Message}", ex.Message);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la mise à jour de la tâche" });
            }
        }

        private async Task<bool> TaskExists(int id)
        {
            return await _context.Tasks.AnyAsync(e => e.Id == id);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Utilisateur non authentifié" });
                }                var task = await _context.Tasks.FindAsync(id);
                if (task == null)
                {
                    return NotFound(new { message = "Tâche non trouvée" });
                }                // Check if the user has permission (creator or admin)
                if (_userManager != null)
                {
                    var user = await _userManager.FindByIdAsync(userId);
                    if (user == null)
                    {
                        return Unauthorized(new { message = "Utilisateur non trouvé" });
                    }
                    var userRoles = await _userManager.GetRolesAsync(user);
                    if (task.CreatedById != userId && !userRoles.Contains("Admin"))
                    {
                        return StatusCode(403, new { message = "Vous n'avez pas la permission de supprimer cette tâche" });
                    }
                }
                else if (task.CreatedById != userId)
                {
                    return StatusCode(403, new { message = "Vous n'avez pas la permission de supprimer cette tâche" });
                }

                // Soft delete
                task.IsDeleted = true;
                task.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting task {TaskId}", id);
                return StatusCode(500, new { message = "Une erreur s'est produite lors de la suppression de la tâche" });
            }
        }
    }
}
