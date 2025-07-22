using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Bim.Server.Data;
using Bim.Server.Models;
using Bim.Server.Services;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Bim.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class IFCController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly ILogger<IFCController> _logger;

        public IFCController(
            ApplicationDbContext context,
            INotificationService notificationService,
            ILogger<IFCController> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        // GET: api/ifc
        [HttpGet]
        public async Task<ActionResult<IEnumerable<IFCFile>>> GetIFCFiles()
        {
            try
            {
                var files = await _context.IFCFiles
                    .Include(f => f.Project)
                    .OrderByDescending(f => f.UploadDate)
                    .ToListAsync();

                return Ok(files);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving IFC files");
                return StatusCode(500, new { error = "Erreur lors de la récupération des fichiers IFC" });
            }
        }

        // GET: api/ifc/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<IFCFile>> GetIFCFile(int id)
        {
            try
            {
                var file = await _context.IFCFiles
                    .Include(f => f.Project)
                    .FirstOrDefaultAsync(f => f.Id == id);

                if (file == null)
                {
                    return NotFound(new { error = "Fichier IFC non trouvé" });
                }

                return Ok(file);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving IFC file {Id}", id);
                return StatusCode(500, new { error = "Erreur lors de la récupération du fichier IFC" });
            }
        }

        // POST: api/ifc/upload
        [HttpPost("upload")]
        public async Task<ActionResult> UploadIFCFile(IFormFile file, [FromForm] int projectId, [FromForm] string? description)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { error = "Aucun fichier fourni" });
                }

                // Validation du projet
                var project = await _context.Projects.FindAsync(projectId);
                if (project == null)
                {
                    return NotFound(new { error = "Projet non trouvé" });
                }

                // Validation du format de fichier IFC
                var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (fileExtension != ".ifc")
                {
                    return BadRequest(new { error = "Seuls les fichiers IFC (.ifc) sont acceptés" });
                }

                // Validation de la taille du fichier (100MB max pour IFC)
                var maxSizeInBytes = 100 * 1024 * 1024;
                if (file.Length > maxSizeInBytes)
                {
                    return BadRequest(new { error = "Le fichier est trop volumineux (max 100MB)" });
                }

                // Création du répertoire d'upload s'il n'existe pas
                var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "ifc");
                if (!Directory.Exists(uploadsPath))
                {
                    Directory.CreateDirectory(uploadsPath);
                }

                // Génération d'un nom de fichier unique
                var fileName = $"{Guid.NewGuid()}.ifc";
                var filePath = Path.Combine(uploadsPath, fileName);

                // Sauvegarde du fichier
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Analyse des métadonnées IFC (simulation)
                var ifcMetadata = await AnalyzeIFCFile(filePath);

                // Création de l'enregistrement en base de données
                var ifcFile = new IFCFile
                {
                    FileName = file.FileName,
                    FilePath = filePath,
                    UploadDate = DateTime.UtcNow,
                    FileSize = file.Length,
                    ProjectId = projectId,
                    Description = description ?? "",
                    IfcSchemaVersion = ifcMetadata.SchemaVersion,
                    IfcProjectName = ifcMetadata.ProjectName,
                    IfcProjectDescription = ifcMetadata.ProjectDescription,
                    Author = ifcMetadata.Author,
                    Organization = ifcMetadata.Organization
                };

                _context.IFCFiles.Add(ifcFile);
                await _context.SaveChangesAsync();

                // Envoi de la notification
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    await _notificationService.SendIntegrationNotificationAsync(
                        userId,
                        "ifc_upload",
                        "Upload IFC réussi",
                        $"Le fichier IFC {file.FileName} a été uploadé avec succès",
                        JsonSerializer.Serialize(new { fileId = ifcFile.Id, fileName = file.FileName, projectId = projectId })
                    );
                }

                return Ok(new 
                { 
                    success = true, 
                    message = "Fichier IFC uploadé avec succès",
                    fileId = ifcFile.Id,
                    fileName = file.FileName,
                    metadata = ifcMetadata
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading IFC file {FileName}", file?.FileName);
                return StatusCode(500, new { error = "Erreur lors de l'upload du fichier IFC" });
            }
        }

        // DELETE: api/ifc/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteIFCFile(int id)
        {
            try
            {
                var file = await _context.IFCFiles.FindAsync(id);
                if (file == null)
                {
                    return NotFound(new { error = "Fichier IFC non trouvé" });
                }

                // Suppression du fichier physique
                if (System.IO.File.Exists(file.FilePath))
                {
                    System.IO.File.Delete(file.FilePath);
                }

                // Suppression de l'enregistrement en base
                _context.IFCFiles.Remove(file);
                await _context.SaveChangesAsync();

                // Envoi de la notification
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    await _notificationService.SendIntegrationNotificationAsync(
                        userId,
                        "ifc_delete",
                        "Fichier IFC supprimé",
                        $"Le fichier IFC {file.FileName} a été supprimé",
                        JsonSerializer.Serialize(new { fileId = id, fileName = file.FileName })
                    );
                }

                return Ok(new { success = true, message = "Fichier IFC supprimé avec succès" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting IFC file {Id}", id);
                return StatusCode(500, new { error = "Erreur lors de la suppression du fichier IFC" });
            }
        }

        // GET: api/ifc/{id}/download
        [HttpGet("{id}/download")]
        public async Task<ActionResult> DownloadIFCFile(int id)
        {
            try
            {
                var file = await _context.IFCFiles.FindAsync(id);
                if (file == null)
                {
                    return NotFound(new { error = "Fichier IFC non trouvé" });
                }

                if (!System.IO.File.Exists(file.FilePath))
                {
                    return NotFound(new { error = "Fichier physique non trouvé" });
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(file.FilePath);
                return File(fileBytes, "application/octet-stream", file.FileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading IFC file {Id}", id);
                return StatusCode(500, new { error = "Erreur lors du téléchargement" });
            }
        }

        // GET: api/ifc/project/{projectId}
        [HttpGet("project/{projectId}")]
        public async Task<ActionResult<IEnumerable<IFCFile>>> GetIFCFilesByProject(int projectId)
        {
            try
            {
                var files = await _context.IFCFiles
                    .Include(f => f.Project)
                    .Where(f => f.ProjectId == projectId)
                    .OrderByDescending(f => f.UploadDate)
                    .ToListAsync();

                return Ok(files);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving IFC files for project {ProjectId}", projectId);
                return StatusCode(500, new { error = "Erreur lors de la récupération des fichiers IFC du projet" });
            }
        }

        // POST: api/ifc/{id}/generate-screenshot
        [HttpPost("{id}/generate-screenshot")]
        public async Task<ActionResult> GenerateScreenshot(int id)
        {
            try
            {
                var file = await _context.IFCFiles.FindAsync(id);
                if (file == null)
                {
                    return NotFound(new { error = "Fichier IFC non trouvé" });
                }

                // Simulation de la génération de capture d'écran
                await System.Threading.Tasks.Task.Delay(2000); // Simulation du traitement

                var screenshotPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "screenshots", $"{file.Id}_screenshot.png");
                var screenshotDir = Path.GetDirectoryName(screenshotPath);
                if (!Directory.Exists(screenshotDir))
                {
                    Directory.CreateDirectory(screenshotDir!);
                }

                // Simulation de la création d'une capture d'écran
                await System.IO.File.WriteAllTextAsync(screenshotPath, "Simulation de capture d'écran IFC");

                // Mise à jour du fichier avec le chemin de la capture
                file.ScreenshotPath = screenshotPath;
                _context.IFCFiles.Update(file);
                await _context.SaveChangesAsync();

                // Envoi de la notification
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    await _notificationService.SendIntegrationNotificationAsync(
                        userId,
                        "ifc_screenshot",
                        "Capture d'écran générée",
                        $"La capture d'écran du fichier IFC {file.FileName} a été générée",
                        JsonSerializer.Serialize(new { fileId = id, screenshotPath = screenshotPath })
                    );
                }

                return Ok(new { success = true, message = "Capture d'écran générée avec succès", screenshotPath = screenshotPath });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating screenshot for IFC file {Id}", id);
                return StatusCode(500, new { error = "Erreur lors de la génération de la capture d'écran" });
            }
        }

        private async Task<IFCMetadata> AnalyzeIFCFile(string filePath)
        {
            // Simulation d'analyse IFC (dans un vrai système, vous analyseriez le fichier IFC)
            await System.Threading.Tasks.Task.Delay(500); // Simulation du traitement

            return new IFCMetadata
            {
                SchemaVersion = "IFC4",
                ProjectName = "Projet BIM",
                ProjectDescription = "Projet importé depuis un fichier IFC",
                Author = User.Identity?.Name ?? "Unknown",
                Organization = "BIM Recovery"
            };
        }
    }

    public class IFCMetadata
    {
        public string SchemaVersion { get; set; } = string.Empty;
        public string ProjectName { get; set; } = string.Empty;
        public string ProjectDescription { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string Organization { get; set; } = string.Empty;
    }
}
