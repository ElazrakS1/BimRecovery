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
    public class IntegrationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly ILogger<IntegrationController> _logger;
        private readonly IConfiguration _configuration;

        public IntegrationController(
            ApplicationDbContext context,
            INotificationService notificationService,
            ILogger<IntegrationController> logger,
            IConfiguration configuration)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
            _configuration = configuration;
        }

        // GET: api/integration/connectors
        [HttpGet("connectors")]
        public ActionResult<IEnumerable<object>> GetConnectors()
        {
            try
            {
                // Retourne les connecteurs disponibles
                var connectors = new[]
                {
                    new { id = 1, name = "Revit", type = "BIM", status = "active", description = "Connecteur Autodesk Revit" },
                    new { id = 2, name = "ArchiCAD", type = "BIM", status = "active", description = "Connecteur Graphisoft ArchiCAD" },
                    new { id = 3, name = "Tekla", type = "BIM", status = "inactive", description = "Connecteur Tekla Structures" },
                    new { id = 4, name = "Rhino", type = "CAD", status = "active", description = "Connecteur McNeel Rhino" },
                    new { id = 5, name = "AutoCAD", type = "CAD", status = "active", description = "Connecteur Autodesk AutoCAD" }
                };

                return Ok(connectors);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving connectors");
                return StatusCode(500, new { error = "Erreur lors de la récupération des connecteurs" });
            }
        }

        // GET: api/integration/formats
        [HttpGet("formats")]
        public ActionResult<IEnumerable<object>> GetFormats()
        {
            try
            {
                // Retourne les formats supportés
                var formats = new[]
                {
                    new { id = "ifc2x3", name = "IFC 2x3", extension = ".ifc", description = "Industry Foundation Classes 2x3" },
                    new { id = "ifc4", name = "IFC 4", extension = ".ifc", description = "Industry Foundation Classes 4.0" },
                    new { id = "dwg", name = "DWG", extension = ".dwg", description = "AutoCAD Drawing" },
                    new { id = "step", name = "STEP", extension = ".step", description = "Standard for Exchange of Product Data" },
                    new { id = "obj", name = "OBJ", extension = ".obj", description = "Wavefront OBJ" },
                    new { id = "fbx", name = "FBX", extension = ".fbx", description = "Filmbox" }
                };

                return Ok(formats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving formats");
                return StatusCode(500, new { error = "Erreur lors de la récupération des formats" });
            }
        }

        // GET: api/integration/history
        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<object>>> GetHistory()
        {
            try
            {
                // Récupère l'historique des imports/exports depuis la base de données
                var ifcFiles = await _context.IFCFiles
                    .Include(f => f.Project)
                    .OrderByDescending(f => f.UploadDate)
                    .Take(50)
                    .ToListAsync();

                var history = ifcFiles.Select(f => new
                {
                    id = f.Id,
                    type = "import",
                    fileName = f.FileName,
                    format = f.IfcSchemaVersion,
                    status = "completed",
                    date = f.UploadDate,
                    size = f.FileSize,
                    elements = f.ElementCount,
                    project = f.Project?.Name ?? "N/A",
                    details = new
                    {
                        projectName = f.IfcProjectName,
                        description = f.IfcProjectDescription,
                        author = f.Author,
                        organization = f.Organization,
                        elementCount = f.ElementCount
                    }
                });

                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving history");
                return StatusCode(500, new { error = "Erreur lors de la récupération de l'historique" });
            }
        }

        // GET: api/integration/apis
        [HttpGet("apis")]
        public ActionResult<IEnumerable<object>> GetExternalApis()
        {
            try
            {
                // Retourne les APIs externes disponibles
                var apis = new[]
                {
                    new { id = 1, name = "BIM360", provider = "Autodesk", status = "connected", description = "Plateforme collaborative BIM360" },
                    new { id = 2, name = "Forge", provider = "Autodesk", status = "connected", description = "Plateforme de développement Forge" },
                    new { id = 3, name = "Speckle", provider = "Speckle", status = "disconnected", description = "Plateforme d'interopérabilité Speckle" },
                    new { id = 4, name = "IFC.js", provider = "IFC.js", status = "connected", description = "Bibliothèque JavaScript IFC" }
                };

                return Ok(apis);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving external APIs");
                return StatusCode(500, new { error = "Erreur lors de la récupération des APIs externes" });
            }
        }

        // POST: api/integration/import
        [HttpPost("import")]
        [AllowAnonymous] // Temporarily remove auth for testing
        public async Task<ActionResult> ImportFile(IFormFile file, [FromForm] int projectId = 1, [FromForm] string? description = null)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { error = "Aucun fichier fourni" });
                }

                // Validation du projet (avec fallback si le projet n'existe pas)
                var project = await _context.Projects.FindAsync(projectId);
                if (project == null)
                {
                    // Créer un projet par défaut si aucun n'existe
                    project = new Project
                    {
                        Id = projectId,
                        Name = "Projet par défaut",
                        Description = "Projet créé automatiquement pour les imports",
                        CreatedDate = DateTime.UtcNow,
                        Status = "Actif"
                    };
                    _context.Projects.Add(project);
                    await _context.SaveChangesAsync();
                }

                // Validation du format de fichier
                var allowedExtensions = new[] { ".ifc", ".dwg", ".step", ".obj", ".fbx" };
                var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
                
                if (!allowedExtensions.Contains(fileExtension))
                {
                    return BadRequest(new { error = $"Format de fichier non supporté. Formats acceptés: {string.Join(", ", allowedExtensions)}" });
                }

                // Validation de la taille du fichier (50MB max)
                var maxSizeInBytes = 50 * 1024 * 1024;
                if (file.Length > maxSizeInBytes)
                {
                    return BadRequest(new { error = "Le fichier est trop volumineux (max 50MB)" });
                }

                // Création du répertoire d'upload s'il n'existe pas
                var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "ifc");
                if (!Directory.Exists(uploadsPath))
                {
                    Directory.CreateDirectory(uploadsPath);
                }

                // Génération d'un nom de fichier unique
                var fileName = $"{Guid.NewGuid()}{fileExtension}";
                var filePath = Path.Combine(uploadsPath, fileName);

                // Sauvegarde du fichier
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Extraction des métadonnées IFC si c'est un fichier IFC
                var elementCount = 0;
                var schemaVersion = "N/A";
                var projectName = project.Name;
                var projectDescription = description ?? "";
                var author = User.Identity?.Name ?? "Unknown";
                var organization = "BIM Recovery";

                if (fileExtension == ".ifc")
                {
                    try
                    {
                        _logger.LogInformation("Extracting IFC metadata from {FilePath}", filePath);
                        var ifcMetadata = await ExtractIfcMetadataAsync(filePath);
                        elementCount = ifcMetadata.ElementCount;
                        schemaVersion = ifcMetadata.SchemaVersion;
                        
                        _logger.LogInformation("IFC metadata extracted - ElementCount: {ElementCount}, Schema: {Schema}", 
                            elementCount, schemaVersion);
                        
                        if (!string.IsNullOrEmpty(ifcMetadata.ProjectName))
                            projectName = ifcMetadata.ProjectName;
                        if (!string.IsNullOrEmpty(ifcMetadata.ProjectDescription))
                            projectDescription = ifcMetadata.ProjectDescription;
                        if (!string.IsNullOrEmpty(ifcMetadata.Author))
                            author = ifcMetadata.Author;
                        if (!string.IsNullOrEmpty(ifcMetadata.Organization))
                            organization = ifcMetadata.Organization;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to extract IFC metadata from {FilePath}", filePath);
                        elementCount = 0;
                    }
                }

                // Création de l'enregistrement en base de données
                var ifcFile = new IFCFile
                {
                    FileName = file.FileName,
                    FilePath = filePath,
                    UploadDate = DateTime.UtcNow,
                    FileSize = file.Length,
                    ProjectId = projectId,
                    Description = description ?? "",
                    IfcSchemaVersion = schemaVersion,
                    IfcProjectName = projectName,
                    IfcProjectDescription = projectDescription,
                    Author = author,
                    Organization = organization,
                    ElementCount = elementCount
                };

                _context.IFCFiles.Add(ifcFile);
                await _context.SaveChangesAsync();

                // Envoi de la notification
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    await _notificationService.SendIntegrationNotificationAsync(
                        userId,
                        "integration_import",
                        "Import réussi",
                        $"Le fichier {file.FileName} a été importé avec succès",
                        JsonSerializer.Serialize(new { fileId = ifcFile.Id, fileName = file.FileName })
                    );
                }

                return Ok(new 
                { 
                    success = true, 
                    message = "Fichier importé avec succès",
                    fileId = ifcFile.Id,
                    fileName = file.FileName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing file {FileName}", file?.FileName);
                return StatusCode(500, new { error = "Erreur lors de l'import du fichier" });
            }
        }

        // POST: api/integration/export
        [HttpPost("export")]
        public async Task<ActionResult> ExportFile([FromBody] ExportRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { error = "Requête d'export invalide" });
                }

                // Validation du projet
                var project = await _context.Projects.FindAsync(request.ProjectId);
                if (project == null)
                {
                    return NotFound(new { error = "Projet non trouvé" });
                }

                // Validation du format
                var supportedFormats = new[] { "ifc2x3", "ifc4", "dwg", "step", "obj", "fbx" };
                if (!supportedFormats.Contains(request.Format))
                {
                    return BadRequest(new { error = $"Format non supporté. Formats disponibles: {string.Join(", ", supportedFormats)}" });
                }

                // Simulation de l'export (dans un vrai système, vous traiterez le fichier ici)
                var exportFileName = $"{project.Name}_{request.Format}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.{GetFileExtension(request.Format)}";
                var exportPath = Path.Combine(Directory.GetCurrentDirectory(), "exports", exportFileName);

                // Création du répertoire d'export s'il n'existe pas
                var exportsDir = Path.GetDirectoryName(exportPath);
                if (!Directory.Exists(exportsDir))
                {
                    Directory.CreateDirectory(exportsDir!);
                }

                // Simulation de la création du fichier d'export
                await System.IO.File.WriteAllTextAsync(exportPath, $"Export simulé pour le projet {project.Name} au format {request.Format}");

                // Envoi de la notification
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    await _notificationService.SendIntegrationNotificationAsync(
                        userId,
                        "integration_export",
                        "Export terminé",
                        $"L'export du projet {project.Name} au format {request.Format} est disponible",
                        JsonSerializer.Serialize(new { projectId = request.ProjectId, format = request.Format, fileName = exportFileName })
                    );
                }

                return Ok(new 
                { 
                    success = true, 
                    message = "Export terminé avec succès",
                    fileName = exportFileName,
                    downloadUrl = $"/api/integration/download/{exportFileName}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting file for project {ProjectId}", request?.ProjectId);
                return StatusCode(500, new { error = "Erreur lors de l'export du fichier" });
            }
        }

        // GET: api/integration/download/{fileName}
        [HttpGet("download/{fileName}")]
        public async Task<ActionResult> DownloadFile(string fileName)
        {
            try
            {
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "exports", fileName);
                
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(new { error = "Fichier non trouvé" });
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
                var contentType = GetContentType(fileName);

                return File(fileBytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading file {FileName}", fileName);
                return StatusCode(500, new { error = "Erreur lors du téléchargement" });
            }
        }

        // POST: api/integration/connectors/{id}/test
        [HttpPost("connectors/{id}/test")]
        public async Task<ActionResult> TestConnector(int id)
        {
            try
            {
                // Simulation du test de connecteur
                await System.Threading.Tasks.Task.Delay(1000); // Simulation d'un test

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    await _notificationService.SendIntegrationNotificationAsync(
                        userId,
                        "connector_test",
                        "Test de connecteur",
                        $"Le test du connecteur {id} a été effectué avec succès",
                        JsonSerializer.Serialize(new { connectorId = id, status = "success" })
                    );
                }

                return Ok(new { success = true, message = "Test de connecteur réussi" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing connector {ConnectorId}", id);
                return StatusCode(500, new { error = "Erreur lors du test du connecteur" });
            }
        }

        // GET: api/integration/test-ifc-analysis/{id}
        [HttpGet("test-ifc-analysis/{id}")]
        public async Task<ActionResult> TestIfcAnalysis(int id)
        {
            try
            {
                _logger.LogInformation("Testing IFC analysis for file ID: {Id}", id);
                
                // Récupérer le fichier de la base de données
                var ifcFile = await _context.IFCFiles.FindAsync(id);
                if (ifcFile == null)
                {
                    return NotFound(new { error = "Fichier IFC non trouvé" });
                }

                _logger.LogInformation("Found file: {FileName} at path: {FilePath}", ifcFile.FileName, ifcFile.FilePath);

                // Vérifier si le fichier physique existe
                if (!System.IO.File.Exists(ifcFile.FilePath))
                {
                    return NotFound(new { error = "Fichier physique non trouvé", path = ifcFile.FilePath });
                }

                // Analyser le fichier
                var metadata = await ExtractIfcMetadataAsync(ifcFile.FilePath);
                
                // Lire quelques lignes du fichier pour debug
                var lines = await System.IO.File.ReadAllLinesAsync(ifcFile.FilePath);
                var totalLines = lines.Length;
                var ifcLines = lines.Where(l => l.Trim().StartsWith("#") && l.Contains("IFC", StringComparison.OrdinalIgnoreCase)).Take(10).ToList();
                var sampleLines = lines.Take(20).ToList();

                _logger.LogInformation("File analysis complete - Elements: {ElementCount}, Total lines: {TotalLines}, IFC lines sample: {IfcLines}", 
                    metadata.ElementCount, totalLines, string.Join(" | ", ifcLines));

                return Ok(new
                {
                    fileInfo = new
                    {
                        id = ifcFile.Id,
                        fileName = ifcFile.FileName,
                        filePath = ifcFile.FilePath,
                        fileSize = ifcFile.FileSize,
                        currentElementCount = ifcFile.ElementCount,
                        uploadDate = ifcFile.UploadDate
                    },
                    analysis = new
                    {
                        elementCount = metadata.ElementCount,
                        schemaVersion = metadata.SchemaVersion,
                        projectName = metadata.ProjectName,
                        projectDescription = metadata.ProjectDescription,
                        author = metadata.Author,
                        organization = metadata.Organization
                    },
                    debug = new
                    {
                        totalLines = totalLines,
                        ifcLinesCount = ifcLines.Count,
                        sampleLines = sampleLines,
                        ifcLinesSample = ifcLines
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing IFC analysis for file ID: {Id}", id);
                return StatusCode(500, new { error = "Erreur lors de l'analyse IFC", details = ex.Message });
            }
        }

        // POST: api/integration/fix-element-count/{id}
        [HttpPost("fix-element-count/{id}")]
        public async Task<ActionResult> FixElementCount(int id)
        {
            try
            {
                _logger.LogInformation("Fixing element count for file ID: {Id}", id);
                
                // Récupérer le fichier de la base de données
                var ifcFile = await _context.IFCFiles.FindAsync(id);
                if (ifcFile == null)
                {
                    return NotFound(new { error = "Fichier IFC non trouvé" });
                }

                // Vérifier si le fichier physique existe
                if (!System.IO.File.Exists(ifcFile.FilePath))
                {
                    return NotFound(new { error = "Fichier physique non trouvé", path = ifcFile.FilePath });
                }

                // Analyser le fichier et mettre à jour le comptage
                var metadata = await ExtractIfcMetadataAsync(ifcFile.FilePath);
                
                var oldCount = ifcFile.ElementCount;
                ifcFile.ElementCount = metadata.ElementCount;
                ifcFile.IfcSchemaVersion = metadata.SchemaVersion;
                
                if (!string.IsNullOrEmpty(metadata.ProjectName))
                    ifcFile.IfcProjectName = metadata.ProjectName;
                if (!string.IsNullOrEmpty(metadata.ProjectDescription))
                    ifcFile.IfcProjectDescription = metadata.ProjectDescription;
                if (!string.IsNullOrEmpty(metadata.Author))
                    ifcFile.Author = metadata.Author;
                if (!string.IsNullOrEmpty(metadata.Organization))
                    ifcFile.Organization = metadata.Organization;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Element count updated from {OldCount} to {NewCount} for file {FileName}", 
                    oldCount, ifcFile.ElementCount, ifcFile.FileName);

                return Ok(new
                {
                    success = true,
                    message = "Comptage des éléments mis à jour",
                    oldCount = oldCount,
                    newCount = ifcFile.ElementCount,
                    fileName = ifcFile.FileName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fixing element count for file ID: {Id}", id);
                return StatusCode(500, new { error = "Erreur lors de la correction du comptage", details = ex.Message });
            }
        }

        // DELETE: api/integration/delete-file/{id}
        [HttpDelete("delete-file/{id}")]
        public async Task<ActionResult> DeleteFile(int id)
        {
            try
            {
                _logger.LogInformation("Deleting file with ID: {Id}", id);
                
                // Récupérer le fichier de la base de données
                var ifcFile = await _context.IFCFiles.FindAsync(id);
                if (ifcFile == null)
                {
                    return NotFound(new { error = "Fichier IFC non trouvé" });
                }

                var fileName = ifcFile.FileName;
                var filePath = ifcFile.FilePath;

                // Supprimer le fichier physique s'il existe
                if (System.IO.File.Exists(filePath))
                {
                    try
                    {
                        System.IO.File.Delete(filePath);
                        _logger.LogInformation("Physical file deleted: {FilePath}", filePath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to delete physical file: {FilePath}", filePath);
                        // Continue with database deletion even if physical file deletion fails
                    }
                }

                // Supprimer l'enregistrement de la base de données
                _context.IFCFiles.Remove(ifcFile);
                await _context.SaveChangesAsync();

                _logger.LogInformation("File deleted successfully - ID: {Id}, Name: {FileName}", id, fileName);

                return Ok(new
                {
                    success = true,
                    message = "Fichier supprimé avec succès",
                    fileName = fileName,
                    id = id
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file with ID: {Id}", id);
                return StatusCode(500, new { error = "Erreur lors de la suppression du fichier", details = ex.Message });
            }
        }

        // DELETE: api/integration/clear-history
        [HttpDelete("clear-history")]
        public async Task<ActionResult> ClearHistory()
        {
            try
            {
                _logger.LogInformation("Clearing all file history");
                
                // Récupérer tous les fichiers
                var allFiles = await _context.IFCFiles.ToListAsync();
                var fileCount = allFiles.Count;
                var deletedPhysicalFiles = 0;

                // Supprimer les fichiers physiques
                foreach (var ifcFile in allFiles)
                {
                    if (System.IO.File.Exists(ifcFile.FilePath))
                    {
                        try
                        {
                            System.IO.File.Delete(ifcFile.FilePath);
                            deletedPhysicalFiles++;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to delete physical file: {FilePath}", ifcFile.FilePath);
                        }
                    }
                }

                // Supprimer tous les enregistrements de la base de données
                _context.IFCFiles.RemoveRange(allFiles);
                await _context.SaveChangesAsync();

                _logger.LogInformation("History cleared - {FileCount} database records removed, {PhysicalFiles} physical files deleted", 
                    fileCount, deletedPhysicalFiles);

                return Ok(new
                {
                    success = true,
                    message = "Historique vidé avec succès",
                    deletedRecords = fileCount,
                    deletedPhysicalFiles = deletedPhysicalFiles
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing history");
                return StatusCode(500, new { error = "Erreur lors du vidage de l'historique", details = ex.Message });
            }
        }

        private string GetFileExtension(string format)
        {
            return format.ToLowerInvariant() switch
            {
                "ifc2x3" or "ifc4" => "ifc",
                "dwg" => "dwg",
                "step" => "step",
                "obj" => "obj",
                "fbx" => "fbx",
                _ => "txt"
            };
        }

        private string GetContentType(string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            return extension switch
            {
                ".ifc" => "application/octet-stream",
                ".dwg" => "application/octet-stream",
                ".step" => "application/octet-stream",
                ".obj" => "application/octet-stream",
                ".fbx" => "application/octet-stream",
                _ => "application/octet-stream"
            };
        }

        // IFC Metadata extraction methods
        private async Task<IfcMetadata> ExtractIfcMetadataAsync(string filePath)
        {
            var metadata = new IfcMetadata();
            
            if (!System.IO.File.Exists(filePath))
            {
                _logger.LogWarning("IFC file not found: {FilePath}", filePath);
                return metadata;
            }

            try
            {
                var fileExtension = Path.GetExtension(filePath).ToLowerInvariant();
                
                // Only process IFC files
                if (fileExtension != ".ifc")
                {
                    _logger.LogInformation("Non-IFC file, skipping analysis: {FilePath}", filePath);
                    return metadata;
                }

                // Read the file content
                var content = await System.IO.File.ReadAllTextAsync(filePath);
                
                // Extract IFC schema version
                var schemaMatch = System.Text.RegularExpressions.Regex.Match(content, @"FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (schemaMatch.Success)
                {
                    metadata.SchemaVersion = schemaMatch.Groups[1].Value;
                    _logger.LogInformation("Found IFC schema: {Schema}", metadata.SchemaVersion);
                }
                else
                {
                    // Fallback: try to detect from header
                    if (content.Contains("IFC4", StringComparison.OrdinalIgnoreCase))
                    {
                        metadata.SchemaVersion = "IFC4";
                    }
                    else if (content.Contains("IFC2X3", StringComparison.OrdinalIgnoreCase))
                    {
                        metadata.SchemaVersion = "IFC2X3";
                    }
                    else
                    {
                        metadata.SchemaVersion = "IFC4"; // Default
                    }
                }

                // Extract project information
                var projectMatch = System.Text.RegularExpressions.Regex.Match(content, @"IFCPROJECT\s*\(\s*'([^']*)'[^,]*,\s*'([^']*)'[^,]*,\s*'([^']*)'", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (projectMatch.Success)
                {
                    metadata.ProjectName = projectMatch.Groups[2].Value;
                    metadata.ProjectDescription = projectMatch.Groups[3].Value;
                    _logger.LogInformation("Found project name: {ProjectName}", metadata.ProjectName);
                }

                // Extract organization information
                var orgMatch = System.Text.RegularExpressions.Regex.Match(content, @"IFCORGANIZATION\s*\(\s*[^,]*,\s*'([^']*)'", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (orgMatch.Success)
                {
                    metadata.Organization = orgMatch.Groups[1].Value;
                }

                // Extract person information (author)
                var personMatch = System.Text.RegularExpressions.Regex.Match(content, @"IFCPERSON\s*\(\s*[^,]*,\s*'([^']*)'", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (personMatch.Success)
                {
                    metadata.Author = personMatch.Groups[1].Value;
                }

                // Count IFC elements
                metadata.ElementCount = CountIfcElements(content);
                _logger.LogInformation("Found {ElementCount} IFC elements", metadata.ElementCount);

                return metadata;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting IFC metadata from {FilePath}", filePath);
                return metadata;
            }
        }

        private int CountIfcElements(string content)
        {
            try
            {
                _logger.LogInformation("Starting IFC element count analysis");
                
                // Method 1: Count all IFC entities (lines starting with #number = IFC)
                var ifcEntityPattern = @"^#\d+\s*=\s*IFC\w+";
                var matches = System.Text.RegularExpressions.Regex.Matches(content, ifcEntityPattern, System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                
                var totalElements = matches.Count;
                _logger.LogInformation("Method 1 - Found {TotalElements} total IFC entities", totalElements);
                
                // Method 2: Count specific building elements
                var buildingElementPattern = @"^#\d+\s*=\s*IFC(WALL|SLAB|BEAM|COLUMN|DOOR|WINDOW|ROOF|STAIR|RAILING|SPACE|BUILDINGSTOREY|BUILDING|SITE|STOREY|ZONE|ELEMENT|COMPONENT|OBJECT|PRODUCT)";
                var buildingMatches = System.Text.RegularExpressions.Regex.Matches(content, buildingElementPattern, System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                
                var buildingElements = buildingMatches.Count;
                _logger.LogInformation("Method 2 - Found {BuildingElements} building elements", buildingElements);
                
                // Method 3: Count lines that start with # and contain IFC (more flexible)
                var flexiblePattern = @"^#\d+.*IFC";
                var flexibleMatches = System.Text.RegularExpressions.Regex.Matches(content, flexiblePattern, System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                
                var flexibleElements = flexibleMatches.Count;
                _logger.LogInformation("Method 3 - Found {FlexibleElements} flexible IFC entities", flexibleElements);
                
                // Method 4: Count total data lines (lines starting with #)
                var dataLinePattern = @"^#\d+";
                var dataLineMatches = System.Text.RegularExpressions.Regex.Matches(content, dataLinePattern, System.Text.RegularExpressions.RegexOptions.Multiline);
                
                var dataLines = dataLineMatches.Count;
                _logger.LogInformation("Method 4 - Found {DataLines} total data lines", dataLines);
                
                // Log some sample lines for debugging
                var lines = content.Split('\n');
                var sampleLines = lines.Where(l => l.Trim().StartsWith("#")).Take(5).ToList();
                _logger.LogInformation("Sample IFC lines: {SampleLines}", string.Join(" | ", sampleLines));
                
                // Choose the best count
                var finalCount = totalElements > 0 ? totalElements : 
                                flexibleElements > 0 ? flexibleElements : 
                                buildingElements > 0 ? buildingElements : 
                                0;
                
                _logger.LogInformation("Final element count: {FinalCount}", finalCount);
                
                return finalCount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error counting IFC elements");
                return 0;
            }
        }

        public class IfcMetadata
        {
            public string SchemaVersion { get; set; } = string.Empty;
            public string ProjectName { get; set; } = string.Empty;
            public string ProjectDescription { get; set; } = string.Empty;
            public string Author { get; set; } = string.Empty;
            public string Organization { get; set; } = string.Empty;
            public int ElementCount { get; set; } = 0;
        }

        public class ExportRequest
        {
            [Required]
            public int ProjectId { get; set; }
            
            [Required]
            public string Format { get; set; } = string.Empty;
            
            public string? Description { get; set; }
        }
    }
}
