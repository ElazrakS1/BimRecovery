using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Bim.Server.Data;
using Bim.Server.Data.Database;
using Bim.Server.Models;
using Bim.Server.Models.DTOs;
using Bim.Server.Services;
using Microsoft.AspNetCore.Identity;

namespace Bim.Server.Controllers
{    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CollaborationTasksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IUserValidationService _userValidationService;
        private readonly ILogger<CollaborationTasksController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;

        public CollaborationTasksController(
            ApplicationDbContext context,
            INotificationService notificationService,
            IUserValidationService userValidationService,
            ILogger<CollaborationTasksController> logger,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _notificationService = notificationService;
            _userValidationService = userValidationService;
            _logger = logger;
            _userManager = userManager;
        }

        /// <summary>
        /// Obtenir toutes les tâches collaboratives
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<TaskDto>>> GetAllTasks()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var tasks = await _context.CollaborationTasks
                    .Include(t => t.Project)
                    .Include(t => t.CreatedBy)
                    .Include(t => t.AssignedTo)
                    .Include(t => t.Comments)
                        .ThenInclude(c => c.Author)
                    .OrderByDescending(t => t.CreatedAt)
                    .Select(t => new TaskDto
                    {
                        Id = t.Id,
                        Title = t.Title,
                        Description = t.Description,
                        ProjectId = t.ProjectId,
                        ProjectName = t.Project.Name,
                        CreatedById = t.CreatedById,
                        CreatedByName = $"{t.CreatedBy.FirstName} {t.CreatedBy.LastName}".Trim(),
                        AssignedToId = t.AssignedToId,
                        AssignedToName = t.AssignedTo != null ? $"{t.AssignedTo.FirstName} {t.AssignedTo.LastName}".Trim() : null,
                        AssignedToEmail = t.AssignedTo != null ? t.AssignedTo.Email : null,
                        Status = t.Status,
                        Priority = t.Priority,
                        CreatedAt = t.CreatedAt,
                        UpdatedAt = t.UpdatedAt,
                        DueDate = t.DueDate,
                        CompletedAt = t.CompletedAt,
                        RelatedAnnotationId = t.RelatedAnnotationId,
                        TargetElementId = t.TargetElementId,
                        PositionX = t.PositionX,
                        PositionY = t.PositionY,
                        PositionZ = t.PositionZ,
                        Tags = t.Tags,
                        Progress = t.Progress,
                        Comments = t.Comments.Select(c => new TaskCommentDto
                        {
                            Id = c.Id,
                            Content = c.Content,
                            TaskId = c.TaskId,
                            AuthorId = c.AuthorId,
                            AuthorName = $"{c.Author.FirstName} {c.Author.LastName}".Trim(),
                            AuthorEmail = c.Author.Email ?? "",
                            CreatedAt = c.CreatedAt,
                            UpdatedAt = c.UpdatedAt,
                            ParentCommentId = c.ParentCommentId
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all collaboration tasks");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Obtenir toutes les tâches d'un projet
        /// </summary>
        [HttpGet("project/{projectId}")]
        public async Task<ActionResult<List<TaskDto>>> GetProjectTasks(int projectId)
        {
            try
            {
                var tasks = await _context.CollaborationTasks
                    .Where(t => t.ProjectId == projectId)
                    .Include(t => t.Project)
                    .Include(t => t.CreatedBy)
                    .Include(t => t.AssignedTo)
                    .Include(t => t.Comments)
                        .ThenInclude(c => c.Author)
                    .OrderByDescending(t => t.CreatedAt)
                    .Select(t => new TaskDto
                    {
                        Id = t.Id,
                        Title = t.Title,
                        Description = t.Description,
                        ProjectId = t.ProjectId,
                        ProjectName = t.Project.Name,
                        CreatedById = t.CreatedById,
                        CreatedByName = $"{t.CreatedBy.FirstName} {t.CreatedBy.LastName}".Trim(),
                        AssignedToId = t.AssignedToId,
                        AssignedToName = t.AssignedTo != null ? $"{t.AssignedTo.FirstName} {t.AssignedTo.LastName}".Trim() : null,
                        AssignedToEmail = t.AssignedTo != null ? t.AssignedTo.Email : null,
                        Status = t.Status,
                        Priority = t.Priority,
                        CreatedAt = t.CreatedAt,
                        UpdatedAt = t.UpdatedAt,
                        DueDate = t.DueDate,
                        CompletedAt = t.CompletedAt,
                        RelatedAnnotationId = t.RelatedAnnotationId,
                        TargetElementId = t.TargetElementId,
                        PositionX = t.PositionX,
                        PositionY = t.PositionY,
                        PositionZ = t.PositionZ,
                        Tags = t.Tags,
                        Progress = t.Progress,
                        Comments = t.Comments.Select(c => new TaskCommentDto
                        {
                            Id = c.Id,
                            Content = c.Content,
                            TaskId = c.TaskId,
                            AuthorId = c.AuthorId,
                            AuthorName = $"{c.Author.FirstName} {c.Author.LastName}".Trim(),
                            AuthorEmail = c.Author.Email ?? "",
                            CreatedAt = c.CreatedAt,
                            UpdatedAt = c.UpdatedAt,
                            ParentCommentId = c.ParentCommentId
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving tasks for project {ProjectId}", projectId);
                return StatusCode(500, new { message = "Erreur lors de la récupération des tâches" });
            }
        }

        /// <summary>
        /// Obtenir les tâches assignées à l'utilisateur connecté
        /// </summary>
        [HttpGet("my-tasks")]
        public async Task<ActionResult<List<TaskDto>>> GetMyTasks()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var tasks = await _context.CollaborationTasks
                    .Where(t => t.AssignedToId == userId)
                    .Include(t => t.Project)
                    .Include(t => t.CreatedBy)
                    .Include(t => t.AssignedTo)
                    .Include(t => t.Comments)
                        .ThenInclude(c => c.Author)
                    .OrderByDescending(t => t.CreatedAt)
                    .Select(t => new TaskDto
                    {
                        Id = t.Id,
                        Title = t.Title,
                        Description = t.Description,
                        ProjectId = t.ProjectId,
                        ProjectName = t.Project.Name,
                        CreatedById = t.CreatedById,
                        CreatedByName = $"{t.CreatedBy.FirstName} {t.CreatedBy.LastName}".Trim(),
                        AssignedToId = t.AssignedToId,
                        AssignedToName = t.AssignedTo != null ? $"{t.AssignedTo.FirstName} {t.AssignedTo.LastName}".Trim() : null,
                        AssignedToEmail = t.AssignedTo != null ? t.AssignedTo.Email : null,
                        Status = t.Status,
                        Priority = t.Priority,
                        CreatedAt = t.CreatedAt,
                        UpdatedAt = t.UpdatedAt,
                        DueDate = t.DueDate,
                        CompletedAt = t.CompletedAt,
                        RelatedAnnotationId = t.RelatedAnnotationId,
                        TargetElementId = t.TargetElementId,
                        PositionX = t.PositionX,
                        PositionY = t.PositionY,
                        PositionZ = t.PositionZ,
                        Tags = t.Tags,
                        Progress = t.Progress,
                        Comments = t.Comments.Select(c => new TaskCommentDto
                        {
                            Id = c.Id,
                            Content = c.Content,
                            TaskId = c.TaskId,
                            AuthorId = c.AuthorId,
                            AuthorName = $"{c.Author.FirstName} {c.Author.LastName}".Trim(),
                            AuthorEmail = c.Author.Email ?? "",
                            CreatedAt = c.CreatedAt,
                            UpdatedAt = c.UpdatedAt,
                            ParentCommentId = c.ParentCommentId
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user tasks");
                return StatusCode(500, new { message = "Erreur lors de la récupération de vos tâches" });
            }
        }

        /// <summary>
        /// Obtenir une tâche spécifique
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskDto>> GetTask(int id)
        {
            try
            {
                var task = await _context.CollaborationTasks
                    .Include(t => t.Project)
                    .Include(t => t.CreatedBy)
                    .Include(t => t.AssignedTo)
                    .Include(t => t.Comments)
                        .ThenInclude(c => c.Author)
                    .Where(t => t.Id == id)
                    .Select(t => new TaskDto
                    {
                        Id = t.Id,
                        Title = t.Title,
                        Description = t.Description,
                        ProjectId = t.ProjectId,
                        ProjectName = t.Project.Name,
                        CreatedById = t.CreatedById,
                        CreatedByName = $"{t.CreatedBy.FirstName} {t.CreatedBy.LastName}".Trim(),
                        AssignedToId = t.AssignedToId,
                        AssignedToName = t.AssignedTo != null ? $"{t.AssignedTo.FirstName} {t.AssignedTo.LastName}".Trim() : null,
                        AssignedToEmail = t.AssignedTo != null ? t.AssignedTo.Email : null,
                        Status = t.Status,
                        Priority = t.Priority,
                        CreatedAt = t.CreatedAt,
                        UpdatedAt = t.UpdatedAt,
                        DueDate = t.DueDate,
                        CompletedAt = t.CompletedAt,
                        RelatedAnnotationId = t.RelatedAnnotationId,
                        TargetElementId = t.TargetElementId,
                        PositionX = t.PositionX,
                        PositionY = t.PositionY,
                        PositionZ = t.PositionZ,
                        Tags = t.Tags,
                        Progress = t.Progress,
                        Comments = t.Comments.OrderBy(c => c.CreatedAt).Select(c => new TaskCommentDto
                        {
                            Id = c.Id,
                            Content = c.Content,
                            TaskId = c.TaskId,
                            AuthorId = c.AuthorId,
                            AuthorName = $"{c.Author.FirstName} {c.Author.LastName}".Trim(),
                            AuthorEmail = c.Author.Email ?? "",
                            CreatedAt = c.CreatedAt,
                            UpdatedAt = c.UpdatedAt,
                            ParentCommentId = c.ParentCommentId
                        }).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (task == null)
                {
                    return NotFound(new { message = "Tâche non trouvée" });
                }

                return Ok(task);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving task {TaskId}", id);
                return StatusCode(500, new { message = "Erreur lors de la récupération de la tâche" });
            }
        }

        /// <summary>
        /// Créer une nouvelle tâche
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<TaskDto>> CreateTask([FromBody] CreateTaskDto createDto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                // Vérifier que le projet existe
                var project = await _context.Projects.FindAsync(createDto.ProjectId);
                if (project == null)
                {
                    return NotFound(new { message = "Projet non trouvé" });
                }

                // Valider les utilisateurs assignés (support both single and multiple assignment)
                var assignedUserIds = new List<string>();
                
                // Nouveau système: utiliser AssignedToIds si fourni
                if (createDto.AssignedToIds != null && createDto.AssignedToIds.Count > 0)
                {
                    assignedUserIds = createDto.AssignedToIds.Where(id => !string.IsNullOrWhiteSpace(id)).ToList();
                }
                // Fallback: utiliser AssignedToId pour compatibilité
                else if (!string.IsNullOrEmpty(createDto.AssignedToId) && !string.IsNullOrWhiteSpace(createDto.AssignedToId))
                {
                    assignedUserIds.Add(createDto.AssignedToId);
                }

                // Utiliser le service de validation amélioré
                var userValidationResult = await _userValidationService.ValidateUsersWithDetailedInfoAsync(assignedUserIds);
                
                // Si il y a des utilisateurs invalides ou inactifs, retourner une erreur détaillée
                if (!userValidationResult.IsValid)
                {
                    var errorResponse = new
                    {
                        message = "Erreur dans l'assignation des utilisateurs",
                        errors = userValidationResult.ErrorMessages,
                        details = new
                        {
                            invalidUserIds = userValidationResult.InvalidUserIds,
                            inactiveUserIds = userValidationResult.InactiveUserIds,
                            validUserIds = userValidationResult.ValidUserIds,
                            userDetails = userValidationResult.UserDetails.Values.ToList()
                        },
                        suggestions = GetUserAssignmentSuggestions(userValidationResult)
                    };
                    
                    _logger.LogWarning("Task creation failed due to invalid user assignments. ProjectId: {ProjectId}, InvalidUsers: {InvalidUsers}, InactiveUsers: {InactiveUsers}", 
                        createDto.ProjectId, 
                        string.Join(", ", userValidationResult.InvalidUserIds),
                        string.Join(", ", userValidationResult.InactiveUserIds));
                    
                    return BadRequest(errorResponse);
                }

                var validUserIds = userValidationResult.ValidUserIds;

                var task = new Models.Task
                {
                    Title = createDto.Title,
                    Description = createDto.Description,
                    ProjectId = createDto.ProjectId,
                    CreatedById = userId,
                    AssignedToId = validUserIds.FirstOrDefault(), // Pour compatibilité, premier assigné
                    Priority = createDto.Priority,
                    DueDate = createDto.DueDate,
                    RelatedAnnotationId = createDto.RelatedAnnotationId,
                    TargetElementId = createDto.TargetElementId,
                    PositionX = createDto.PositionX,
                    PositionY = createDto.PositionY,
                    PositionZ = createDto.PositionZ,
                    Tags = createDto.Tags,
                    CreatedAt = DateTime.UtcNow,
                    Status = "pending",
                    Progress = 0
                };

                _context.CollaborationTasks.Add(task);
                await _context.SaveChangesAsync();

                // Créer les assignations multiples
                if (validUserIds.Count > 0)
                {
                    var assignments = validUserIds.Select(assignedUserId => new TaskAssignment
                    {
                        TaskId = task.Id,
                        UserId = assignedUserId,
                        AssignedById = userId,
                        AssignedAt = DateTime.UtcNow,
                        Status = "active"
                    }).ToList();

                    _context.TaskAssignments.AddRange(assignments);
                    await _context.SaveChangesAsync();

                    // Envoyer des notifications à tous les utilisateurs assignés
                    foreach (var assignedUserId in validUserIds)
                    {
                        try
                        {
                            await _notificationService.SendNotificationAsync(new CreateNotificationDto
                            {
                                UserId = assignedUserId,
                                Type = "task",
                                Title = "Nouvelle tâche assignée",
                                Message = $"Vous avez été assigné(e) à la tâche: {task.Title}",
                                Data = System.Text.Json.JsonSerializer.Serialize(new { 
                                    TaskId = task.Id,
                                    ProjectId = task.ProjectId,
                                    TriggeredById = userId,
                                    ActionUrl = $"/projects/{task.ProjectId}/tasks/{task.Id}"
                                })
                            });
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to send notification to user {UserId} for task {TaskId}", assignedUserId, task.Id);
                        }
                    }
                }

                // Charger la tâche avec les données complètes incluant les assignés
                var createdTask = await GetTaskWithAssignments(task.Id);
                if (createdTask == null)
                {
                    return StatusCode(500, new { message = "Erreur lors de la récupération de la tâche créée" });
                }

                _logger.LogInformation("Task created successfully: {TaskId} by user {UserId} with {AssigneeCount} assignees", 
                    task.Id, userId, validUserIds.Count);

                return CreatedAtAction(nameof(GetTask), new { id = task.Id }, createdTask);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task");
                return StatusCode(500, new { message = "Erreur lors de la création de la tâche" });
            }
        }

                /// <summary>
        /// Mettre à jour une tâche
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<TaskDto>> UpdateTask(int id, [FromBody] UpdateTaskDto updateDto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }                var task = await _context.CollaborationTasks
                    .Include(t => t.Project)
                    .Include(t => t.CreatedBy)
                    .Include(t => t.AssignedTo)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (task == null)
                {
                    return NotFound(new { message = "Tâche non trouvée" });
                }

                // Sauvegarder les anciennes valeurs pour les notifications
                var oldAssignedToId = task.AssignedToId;
                var oldStatus = task.Status;

                // Mettre à jour les champs fournis
                if (!string.IsNullOrEmpty(updateDto.Title))
                    task.Title = updateDto.Title;

                if (!string.IsNullOrEmpty(updateDto.Description))
                    task.Description = updateDto.Description;

                if (updateDto.AssignedToId != null)
                {
                    if (!string.IsNullOrEmpty(updateDto.AssignedToId))
                    {
                        var assignedUser = await _context.Users.FindAsync(updateDto.AssignedToId);
                        if (assignedUser == null)
                        {
                            return BadRequest(new { message = "Utilisateur assigné non trouvé" });
                        }
                    }
                    task.AssignedToId = string.IsNullOrEmpty(updateDto.AssignedToId) ? null : updateDto.AssignedToId;
                }

                if (!string.IsNullOrEmpty(updateDto.Status))
                {
                    task.Status = updateDto.Status;
                    if (updateDto.Status == "completed" && task.CompletedAt == null)
                    {
                        task.CompletedAt = DateTime.UtcNow;
                        task.Progress = 100;
                    }
                }

                if (!string.IsNullOrEmpty(updateDto.Priority))
                    task.Priority = updateDto.Priority;

                if (updateDto.DueDate.HasValue)
                    task.DueDate = updateDto.DueDate.Value;

                if (updateDto.Progress.HasValue)
                    task.Progress = Math.Max(0, Math.Min(100, updateDto.Progress.Value));

                if (!string.IsNullOrEmpty(updateDto.Tags))
                    task.Tags = updateDto.Tags;

                task.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Envoyer des notifications si nécessaire
                if (oldAssignedToId != task.AssignedToId && !string.IsNullOrEmpty(task.AssignedToId))
                {
                    // await _notificationService.NotifyTaskAssignedAsync(task.Id, task.AssignedToId, userId);
                }
                else if (oldStatus != task.Status)
                {
                    if (task.Status == "completed")
                    {
                        // await _notificationService.NotifyTaskCompletedAsync(task.Id, userId);
                    }
                    else if (!string.IsNullOrEmpty(task.AssignedToId))
                    {
                        // await _notificationService.NotifyTaskUpdatedAsync(task.Id, userId, task.AssignedToId);
                    }
                }                // Retourner la tâche mise à jour
                var updatedTask = await _context.CollaborationTasks
                    .Include(t => t.Project)
                    .Include(t => t.CreatedBy)
                    .Include(t => t.AssignedTo)
                    .Include(t => t.Comments)
                        .ThenInclude(c => c.Author)
                    .Where(t => t.Id == id)
                    .Select(t => new TaskDto
                    {
                        Id = t.Id,
                        Title = t.Title,
                        Description = t.Description,
                        ProjectId = t.ProjectId,
                        ProjectName = t.Project.Name,
                        CreatedById = t.CreatedById,
                        CreatedByName = $"{t.CreatedBy.FirstName} {t.CreatedBy.LastName}".Trim(),
                        AssignedToId = t.AssignedToId,
                        AssignedToName = t.AssignedTo != null ? $"{t.AssignedTo.FirstName} {t.AssignedTo.LastName}".Trim() : null,
                        AssignedToEmail = t.AssignedTo != null ? t.AssignedTo.Email : null,
                        Status = t.Status,
                        Priority = t.Priority,
                        CreatedAt = t.CreatedAt,
                        UpdatedAt = t.UpdatedAt,
                        DueDate = t.DueDate,
                        CompletedAt = t.CompletedAt,
                        RelatedAnnotationId = t.RelatedAnnotationId,
                        TargetElementId = t.TargetElementId,
                        PositionX = t.PositionX,
                        PositionY = t.PositionY,
                        PositionZ = t.PositionZ,
                        Tags = t.Tags,
                        Progress = t.Progress,
                        Comments = t.Comments.OrderBy(c => c.CreatedAt).Select(c => new TaskCommentDto
                        {
                            Id = c.Id,
                            Content = c.Content,
                            TaskId = c.TaskId,
                            AuthorId = c.AuthorId,
                            AuthorName = $"{c.Author.FirstName} {c.Author.LastName}".Trim(),
                            AuthorEmail = c.Author.Email ?? "",
                            CreatedAt = c.CreatedAt,
                            UpdatedAt = c.UpdatedAt,
                            ParentCommentId = c.ParentCommentId
                        }).ToList()
                    })
                    .FirstAsync();

                _logger.LogInformation("Task updated successfully: {TaskId} by user {UserId}", id, userId);

                return Ok(updatedTask);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating task {TaskId}", id);
                return StatusCode(500, new { message = "Erreur lors de la mise à jour de la tâche" });
            }
        }

                /// <summary>
        /// Supprimer une tâche
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteTask(int id)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }                var task = await _context.CollaborationTasks.FindAsync(id);
                if (task == null)
                {
                    return NotFound(new { message = "Tâche non trouvée" });
                }

                // Vérifier que l'utilisateur est le créateur ou un admin
                var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value);
                if (task.CreatedById != userId && !userRoles.Contains("Admin"))
                {
                    return Forbid("Vous n'êtes pas autorisé à supprimer cette tâche");
                }

                _context.CollaborationTasks.Remove(task);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Task deleted successfully: {TaskId} by user {UserId}", id, userId);

                return Ok(new { message = "Tâche supprimée avec succès" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting task {TaskId}", id);
                return StatusCode(500, new { message = "Erreur lors de la suppression de la tâche" });
            }
        }

                /// <summary>
        /// Ajouter un commentaire à une tâche
        /// </summary>
        [HttpPost("{taskId}/comments")]
        public async Task<ActionResult<TaskCommentDto>> AddTaskComment(int taskId, [FromBody] CreateTaskCommentDto createDto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }                // Vérifier que la tâche existe
                var task = await _context.CollaborationTasks.FindAsync(taskId);
                if (task == null)
                {
                    return NotFound(new { message = "Tâche non trouvée" });
                }

                var comment = new TaskComment
                {
                    Content = createDto.Content,
                    TaskId = taskId,
                    AuthorId = userId,
                    ParentCommentId = createDto.ParentCommentId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.TaskComments.Add(comment);
                await _context.SaveChangesAsync();

                // Charger le commentaire avec les données de l'auteur
                var createdComment = await _context.TaskComments
                    .Include(c => c.Author)
                    .Where(c => c.Id == comment.Id)
                    .Select(c => new TaskCommentDto
                    {
                        Id = c.Id,
                        Content = c.Content,
                        TaskId = c.TaskId,
                        AuthorId = c.AuthorId,
                        AuthorName = $"{c.Author.FirstName} {c.Author.LastName}".Trim(),
                        AuthorEmail = c.Author.Email ?? "",
                        CreatedAt = c.CreatedAt,
                        UpdatedAt = c.UpdatedAt,
                        ParentCommentId = c.ParentCommentId,
                        Replies = new List<TaskCommentDto>()
                    })
                    .FirstAsync();                _logger.LogInformation("Task comment created successfully: {CommentId} by user {UserId}", comment.Id, userId);

                return Ok(createdComment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task comment");
                return StatusCode(500, new { message = "Erreur lors de l'ajout du commentaire" });
            }
        }

        /// <summary>
        /// Méthode helper pour récupérer une tâche avec ses assignés
        /// </summary>
        private async Task<TaskDto?> GetTaskWithAssignments(int taskId)
        {
            var task = await _context.CollaborationTasks
                .Include(t => t.Project)
                .Include(t => t.CreatedBy)
                .Include(t => t.AssignedTo)
                .Include(t => t.Assignments)
                    .ThenInclude(a => a.User)
                .Include(t => t.Assignments)
                    .ThenInclude(a => a.AssignedBy)
                .Include(t => t.Comments)
                    .ThenInclude(c => c.Author)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null)
                return null;

            var activeAssignments = task.Assignments
                .Where(a => a.Status == "active")
                .OrderBy(a => a.AssignedAt)
                .ToList();

            return new TaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                ProjectId = task.ProjectId,
                ProjectName = task.Project.Name,
                CreatedById = task.CreatedById,
                CreatedByName = $"{task.CreatedBy.FirstName} {task.CreatedBy.LastName}".Trim(),
                AssignedToId = task.AssignedToId, // Compatibilité
                AssignedToName = task.AssignedTo != null ? $"{task.AssignedTo.FirstName} {task.AssignedTo.LastName}".Trim() : null,
                AssignedToEmail = task.AssignedTo != null ? task.AssignedTo.Email : null,
                Assignees = activeAssignments.Select(a => new UserAssignmentDto
                {
                    UserId = a.UserId,
                    Name = $"{a.User.FirstName} {a.User.LastName}".Trim(),
                    Email = a.User.Email ?? "",
                    AssignedAt = a.AssignedAt,
                    AssignedById = a.AssignedById,
                    AssignedByName = $"{a.AssignedBy.FirstName} {a.AssignedBy.LastName}".Trim(),
                    Status = a.Status
                }).ToList(),
                Status = task.Status,
                Priority = task.Priority,
                CreatedAt = task.CreatedAt,
                UpdatedAt = task.UpdatedAt,
                DueDate = task.DueDate,
                CompletedAt = task.CompletedAt,
                RelatedAnnotationId = task.RelatedAnnotationId,
                TargetElementId = task.TargetElementId,
                PositionX = task.PositionX,
                PositionY = task.PositionY,
                PositionZ = task.PositionZ,
                Tags = task.Tags,
                Progress = task.Progress,
                Comments = task.Comments.Select(c => new TaskCommentDto
                {
                    Id = c.Id,
                    Content = c.Content,
                    TaskId = c.TaskId,
                    AuthorId = c.AuthorId,
                    AuthorName = $"{c.Author.FirstName} {c.Author.LastName}".Trim(),
                    AuthorEmail = c.Author.Email ?? "",
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,
                    ParentCommentId = c.ParentCommentId
                }).ToList()            };
        }

        /// <summary>
        /// Ajouter un utilisateur à une tâche
        /// </summary>
        [HttpPost("{taskId}/assignments")]
        public async Task<ActionResult> AddUserToTask(int taskId, [FromBody] AddUserToTaskDto addUserDto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var task = await _context.CollaborationTasks.FindAsync(taskId);
                if (task == null)
                {
                    return NotFound(new { message = "Tâche non trouvée" });
                }

                // Valider l'utilisateur avant assignation
                var userValidationResult = await _userValidationService.ValidateUsersWithDetailedInfoAsync(new[] { addUserDto.UserId });
                
                if (!userValidationResult.IsValid)
                {
                    var errorResponse = new
                    {
                        message = "Erreur dans l'assignation de l'utilisateur",
                        errors = userValidationResult.ErrorMessages,
                        details = new
                        {
                            invalidUserIds = userValidationResult.InvalidUserIds,
                            inactiveUserIds = userValidationResult.InactiveUserIds,
                            userDetails = userValidationResult.UserDetails.Values.ToList()
                        },
                        suggestions = GetUserAssignmentSuggestions(userValidationResult)
                    };
                    
                    _logger.LogWarning("Task assignment failed for TaskId: {TaskId}, UserId: {UserId}, Errors: {Errors}", 
                        taskId, addUserDto.UserId, string.Join(", ", userValidationResult.ErrorMessages));
                    
                    return BadRequest(errorResponse);
                }

                var targetUser = userValidationResult.UserDetails[addUserDto.UserId];

                // Vérifier si l'utilisateur n'est pas déjà assigné
                var existingAssignment = await _context.TaskAssignments
                    .FirstOrDefaultAsync(ta => ta.TaskId == taskId && ta.UserId == addUserDto.UserId && ta.Status == "active");
                
                if (existingAssignment != null)
                {
                    return BadRequest(new { message = "Utilisateur déjà assigné à cette tâche" });
                }

                var assignment = new TaskAssignment
                {
                    TaskId = taskId,
                    UserId = addUserDto.UserId,
                    AssignedById = userId,
                    AssignedAt = DateTime.UtcNow,
                    Status = "active",
                    Notes = addUserDto.Notes
                };

                _context.TaskAssignments.Add(assignment);
                
                // Mettre à jour AssignedToId si c'est le premier assigné
                if (string.IsNullOrEmpty(task.AssignedToId))
                {
                    task.AssignedToId = addUserDto.UserId;
                    task.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                // Envoyer une notification
                try
                {
                    await _notificationService.SendNotificationAsync(new CreateNotificationDto
                    {
                        UserId = addUserDto.UserId,
                        Type = "task",
                        Title = "Assigné à une tâche",
                        Message = $"Vous avez été assigné(e) à la tâche: {task.Title}",
                        Data = System.Text.Json.JsonSerializer.Serialize(new {
                            TaskId = taskId,
                            ProjectId = task.ProjectId,
                            TriggeredById = userId,
                            ActionUrl = $"/projects/{task.ProjectId}/tasks/{taskId}"
                        })
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send notification to user {UserId} for task {TaskId}", addUserDto.UserId, taskId);
                }

                _logger.LogInformation("User {UserId} assigned to task {TaskId} by {AssignedById}", addUserDto.UserId, taskId, userId);

                return Ok(new { message = "Utilisateur assigné avec succès" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding user to task {TaskId}", taskId);
                return StatusCode(500, new { message = "Erreur lors de l'assignation de l'utilisateur" });
            }
        }

        /// <summary>
        /// Retirer un utilisateur d'une tâche
        /// </summary>
        [HttpDelete("{taskId}/assignments/{userId}")]
        public async Task<ActionResult> RemoveUserFromTask(int taskId, string userId)
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(currentUserId))
                {
                    return Unauthorized();
                }

                var assignment = await _context.TaskAssignments
                    .FirstOrDefaultAsync(ta => ta.TaskId == taskId && ta.UserId == userId && ta.Status == "active");
                
                if (assignment == null)
                {
                    return NotFound(new { message = "Assignation non trouvée" });
                }

                assignment.Status = "removed";
                
                var task = await _context.CollaborationTasks.FindAsync(taskId);
                if (task != null)
                {
                    task.UpdatedAt = DateTime.UtcNow;
                    
                    // Si c'était le seul assigné, vider AssignedToId
                    if (task.AssignedToId == userId)
                    {
                        var remainingAssignments = await _context.TaskAssignments
                            .Where(ta => ta.TaskId == taskId && ta.Status == "active" && ta.UserId != userId)
                            .FirstOrDefaultAsync();
                        
                        task.AssignedToId = remainingAssignments?.UserId;
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("User {UserId} removed from task {TaskId} by {CurrentUserId}", userId, taskId, currentUserId);

                return Ok(new { message = "Utilisateur retiré avec succès" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing user from task {TaskId}", taskId);
                return StatusCode(500, new { message = "Erreur lors du retrait de l'utilisateur" });
            }
        }

        /// <summary>
        /// Obtenir tous les utilisateurs disponibles pour l'assignation de tâches
        /// </summary>
        [HttpGet("available-users")]
        public async Task<ActionResult> GetAvailableUsers()
        {
            try
            {
                // Récupérer TOUS les utilisateurs avec leurs informations de base (actifs et inactifs)
                var users = await _context.Users
                    .OrderBy(u => u.FirstName)
                    .ThenBy(u => u.LastName)
                    .ToListAsync();
                    
                // Créer une liste pour contenir les utilisateurs avec leurs rôles
                var usersWithRoles = new List<object>();
                
                // Pour chaque utilisateur, récupérer ses rôles
                foreach (var user in users)
                {
                    // Récupérer les rôles de l'utilisateur via UserManager
                    var userRoles = await _userManager.GetRolesAsync(user);
                    
                    // Log détaillé des rôles pour déboguer
                    _logger.LogInformation("User {Email} has roles: {Roles}", 
                        user.Email, 
                        userRoles.Count > 0 ? string.Join(", ", userRoles) : "None");
                    
                    // Ajouter l'utilisateur avec ses rôles à la liste
                    usersWithRoles.Add(new
                    {
                        id = user.Id,
                        firstName = user.FirstName,
                        lastName = user.LastName,
                        email = user.Email,
                        company = user.Company,
                        position = user.Position,
                        isActive = user.IsActive, // Ajouter le statut actif/inactif
                        roles = userRoles.ToList() // Ajout des rôles à la réponse
                    });
                }
                
                _logger.LogInformation("Retrieved {UserCount} available users with roles for task assignment", usersWithRoles.Count);

                // Retourner la liste des utilisateurs avec leurs rôles
                return Ok(usersWithRoles);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting available users");
                return StatusCode(500, new { message = "Erreur lors de la récupération des utilisateurs" });
            }
        }
        
        /// <summary>
        /// Génère des suggestions pour résoudre les problèmes d'assignation d'utilisateurs
        /// </summary>
        private List<string> GetUserAssignmentSuggestions(UserValidationResult validationResult)
        {
            var suggestions = new List<string>();
            
            if (validationResult.HasInvalidUsers)
            {
                suggestions.Add("Vérifiez que les IDs utilisateurs existent dans la base de données");
                suggestions.Add("Utilisez l'endpoint /api/CollaborationTasks/users pour obtenir la liste des utilisateurs disponibles");
            }
            
            if (validationResult.HasInactiveUsers)
            {
                suggestions.Add("Activez les comptes utilisateurs inactifs ou retirez-les de l'assignation");
                suggestions.Add("Contactez l'administrateur pour réactiver les comptes si nécessaire");
            }
            
            if (validationResult.HasValidUsers)
            {
                suggestions.Add($"Vous pouvez créer la tâche avec seulement les {validationResult.ValidUserIds.Count} utilisateur(s) valide(s)");
            }
            else
            {
                suggestions.Add("Créez la tâche sans assignation initiale et assignez les utilisateurs ultérieurement");
            }
            
            return suggestions;
        }
    }
}
