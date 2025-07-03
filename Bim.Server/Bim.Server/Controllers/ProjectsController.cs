using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Bim.Server.Models;
using Bim.Server.Data;
using Microsoft.AspNetCore.Authorization;
using System.Text.RegularExpressions;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using System.Xml.Linq;
using iText.Kernel.Font;
using iText.IO.Font.Constants;
using iText.Layout.Borders;
using iText.Kernel.Colors;
using System.ComponentModel.DataAnnotations;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using System.Net;
using System.Security.Claims;

namespace Bim.Server.Controllers
{
    // Modèles pour les requêtes
    public class ShareProjectRequest
    {
        [Required]
        public required string EmailTo { get; set; }
        
        [Required]
        public required string ProjectUrl { get; set; }
    }
    
    // Modèle pour la mise à jour du statut
    public class ProjectStatusUpdateModel
    {
        public string Status { get; set; } = string.Empty;
    }

    public class CreateProjectRequest
    {
        [Required(ErrorMessage = "Le nom du projet est requis")]
        public string Name { get; set; } = string.Empty;
        
        public string? Description { get; set; }
    }

    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ProjectsController> _logger;

        public ProjectsController(
            ApplicationDbContext context, 
            IWebHostEnvironment environment,
            IConfiguration configuration,
            ILogger<ProjectsController> logger)
        {
            _context = context;
            _environment = environment;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpGet]        
        public async Task<ActionResult<IEnumerable<object>>> GetProjects()
        {
            try
            {
                _logger.LogInformation("Récupération des projets");
                
                var projects = await _context.Projects
                    .Include(p => p.IFCFiles)
                    .ToListAsync();
                
                _logger.LogInformation("Projets trouvés: {Count}", projects.Count);
                
                var result = new List<object>();
                
                // S'assurer que tous les projets ont un statut défini
                foreach (var project in projects)
                {
                    // Si la propriété Status est nulle ou vide, on définit une valeur par défaut
                    if (string.IsNullOrEmpty(project.Status))
                    {
                        project.Status = "En attente";
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Statut mis à jour pour le projet {ProjectId}", project.Id);
                    }
                
                    // Formater les données pour le frontend (utiliser des noms de propriétés en minuscules)
                    result.Add(new
                    {
                        id = project.Id,
                        name = project.Name,
                        description = project.Description,
                        createdDate = project.CreatedDate,
                        lastModifiedDate = project.LastModifiedDate,
                        status = project.Status,
                        files = project.IFCFiles?.Select(f => new
                        {
                            id = f.Id,
                            fileName = f.FileName,
                            filePath = f.FilePath,
                            uploadDate = f.UploadDate
                        }).ToList(),
                        createdById = project.CreatedById
                    });
                }
                
                return Ok(result);
            }
            catch(Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des projets");
                return StatusCode(500, new { message = "Erreur lors de la récupération des projets" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetProject(int id)
        {
            var project = await _context.Projects
                .Include(p => p.IFCFiles)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
            {
                return NotFound(new { message = "Projet non trouvé" });
            }

            try
            {
                // Si la propriété Status est nulle ou vide, on définit une valeur par défaut
                if (string.IsNullOrEmpty(project.Status))
                {
                    project.Status = "En attente";
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Statut mis à jour pour le projet {ProjectId}", project.Id);
                }

                var result = new
                {
                    id = project.Id,
                    name = project.Name,
                    description = project.Description,
                    createdDate = project.CreatedDate,
                    lastModifiedDate = project.LastModifiedDate,
                    status = project.Status,
                    files = project.IFCFiles?.Select(f => new
                    {
                        id = f.Id,
                        fileName = f.FileName,
                        filePath = f.FilePath,
                        uploadDate = f.UploadDate
                    }).ToList(),
                    createdById = project.CreatedById
                };
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving project {ProjectId}: {Message}", id, ex.Message);
                return StatusCode(500, new { 
                    message = "An error occurred while retrieving the project", 
                    error = ex.Message,
                    details = _environment.IsDevelopment() ? ex.ToString() : null
                });
            }
        }

        // Endpoint pour mettre à jour le statut d'un projet (actif/en attente)
        [HttpPut("{id}/status")]
        public async Task<ActionResult<Project>> UpdateProjectStatus(int id, [FromBody] ProjectStatusUpdateModel model)
        {
            _logger.LogInformation("Updating project status: Project ID = {ProjectId}, New Status = {Status}", id, model.Status);
            
            var project = await _context.Projects
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
            {
                _logger.LogWarning("Project not found: {ProjectId}", id);
                return NotFound(new { message = "Projet non trouvé" });
            }
            
            // Validation du statut
            if (string.IsNullOrWhiteSpace(model.Status))
            {
                _logger.LogWarning("Invalid status update attempt: Status is empty, Project ID = {ProjectId}", id);
                return BadRequest(new { message = "Le statut ne peut pas être vide" });
            }
            
            // Mettre à jour le statut
            project.Status = model.Status;
            project.LastModifiedDate = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Project status updated successfully: Project ID = {ProjectId}, New Status = {Status}", id, model.Status);
                return Ok(project);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating project status: Project ID = {ProjectId}, Status = {Status}", id, model.Status);
                return StatusCode(500, new { message = "Une erreur s'est produite lors de la mise à jour du statut" });
            }
        }        [HttpPost("{id}/files")]
        public async Task<ActionResult<IFCFile>> UploadFile(int id, IFormFile file)
        {
            string? tempFilePath = null;
            
            try
            {
                _logger.LogInformation("Starting file upload for project {ProjectId}, thread: {ThreadId}", 
                    id, Thread.CurrentThread.ManagedThreadId);

                if (file == null)
                {
                    _logger.LogWarning("No file was provided for project {ProjectId}", id);
                    return BadRequest(new { message = "Aucun fichier n'a été fourni" });
                }

                _logger.LogInformation("File details - Name: {FileName}, Size: {FileSize} MB, ContentType: {ContentType}", 
                    file.FileName, Math.Round(file.Length / (1024.0 * 1024.0), 2), file.ContentType);

                // Récupérer le projet avec ses fichiers pour vérifier les doublons
                var project = await _context.Projects
                    .Include(p => p.IFCFiles)
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (project == null)
                {
                    _logger.LogWarning("Project not found: {ProjectId}", id);
                    return NotFound(new { message = "Projet non trouvé" });
                }

                // Vérification stricte des doublons
                if (project.IFCFiles != null && 
                    project.IFCFiles.Any(f => f.FileName.Equals(file.FileName, StringComparison.OrdinalIgnoreCase)))
                {
                    _logger.LogWarning("File with name {FileName} already exists in project {ProjectId}", file.FileName, id);
                    return BadRequest(new { 
                        message = $"Un fichier nommé '{file.FileName}' existe déjà dans ce projet. " +
                                 "Veuillez renommer le fichier avant de le télécharger." 
                    });
                }

                // Validation du fichier
                if (file.Length == 0)
                {
                    _logger.LogWarning("Empty file uploaded for project {ProjectId}", id);
                    return BadRequest(new { message = "Le fichier est vide" });
                }

                if (!file.FileName.ToLower().EndsWith(".ifc"))
                {
                    _logger.LogWarning("Invalid file type uploaded for project {ProjectId}: {FileName}", id, file.FileName);
                    return BadRequest(new { message = "Seuls les fichiers IFC sont autorisés" });
                }

                // Vérification de la taille du fichier (max 1GB)
                const long maxFileSize = 1_073_741_824L; // Exactly 1GB in bytes
                if (file.Length > maxFileSize)
                {
                    _logger.LogWarning("File size {FileSize} bytes exceeds maximum allowed size of {MaxSize} bytes", 
                        file.Length, maxFileSize);
                    return BadRequest(new { message = "La taille du fichier ne doit pas dépasser 1 GB" });
                }

                // Création et vérification du répertoire uploads
                var uploadsPath = Path.Combine(_environment.WebRootPath, "uploads");
                try {
                    Directory.CreateDirectory(uploadsPath);
                    // Vérifier si le répertoire est accessible en écriture
                    var testFile = Path.Combine(uploadsPath, ".write_test");
                    System.IO.File.WriteAllText(testFile, "test");
                    System.IO.File.Delete(testFile);
                }
                catch (Exception ex) {
                    _logger.LogError(ex, "Failed to verify uploads directory access: {Path}", uploadsPath);
                    return StatusCode(500, new { 
                        message = "Erreur de configuration du serveur - Le répertoire de téléchargement n'est pas accessible" 
                    });
                }

                // Génération d'un nom de fichier unique avec timestamp
                var uniqueFileName = $"{DateTime.UtcNow:yyyyMMdd}_{Guid.NewGuid()}_{file.FileName}";
                var finalFilePath = Path.Combine(uploadsPath, uniqueFileName);
                tempFilePath = Path.Combine(uploadsPath, $"temp_{uniqueFileName}");

                // Sauvegarde dans un fichier temporaire d'abord
                using (var stream = new FileStream(tempFilePath, FileMode.Create))
                {
                    _logger.LogInformation("Saving file to temporary location: {TempPath}", tempFilePath);
                    await file.CopyToAsync(stream);
                }

                // Vérification du fichier temporaire
                var fileInfo = new FileInfo(tempFilePath);
                if (!fileInfo.Exists || fileInfo.Length != file.Length)
                {
                    throw new IOException($"File verification failed after upload. Expected: {file.Length}, actual: {fileInfo.Length}");
                }

                // Déplacement vers l'emplacement final
                System.IO.File.Move(tempFilePath, finalFilePath, true);
                _logger.LogInformation("File moved to final location: {FilePath}", finalFilePath);

                // Création de l'enregistrement dans la base de données
                var ifcFile = new IFCFile
                {
                    FileName = file.FileName,
                    FilePath = uniqueFileName,
                    ProjectId = id,
                    FileSize = file.Length,
                    UploadDate = DateTime.UtcNow,
                    ProjectName = project.Name,
                    Description = $"Uploaded on {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}"
                };

                _context.IFCFiles.Add(ifcFile);

                // Mise à jour de la date de modification du projet
                project.LastModifiedDate = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();

                _logger.LogInformation("File successfully uploaded and recorded for project {ProjectId}: {FileName}", 
                    id, file.FileName);

                return Ok(new
                {
                    id = ifcFile.Id,
                    fileName = ifcFile.FileName,
                    filePath = ifcFile.FilePath,
                    uploadDate = ifcFile.UploadDate,
                    fileSize = ifcFile.FileSize
                });
            }
            catch (IOException ex)
            {
                _logger.LogError(ex, "IO Error during file upload for project {ProjectId}: {Message}", id, ex.Message);
                return StatusCode(500, new { 
                    message = "Erreur lors de l'enregistrement du fichier",
                    details = _environment.IsDevelopment() ? ex.Message : null 
                });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error during file upload for project {ProjectId}: {Message}", id, ex.Message);
                return StatusCode(500, new { 
                    message = "Erreur lors de l'enregistrement des informations du fichier",
                    details = _environment.IsDevelopment() ? ex.Message : null 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during file upload for project {ProjectId}: {Message}", id, ex.Message);
                return StatusCode(500, new { 
                    message = "Une erreur inattendue s'est produite lors du téléchargement du fichier",
                    details = _environment.IsDevelopment() ? ex.Message : null 
                });
            }
            finally
            {
                // Nettoyage : suppression du fichier temporaire s'il existe
                if (!string.IsNullOrEmpty(tempFilePath) && System.IO.File.Exists(tempFilePath))
                {
                    try
                    {
                        System.IO.File.Delete(tempFilePath);
                        _logger.LogInformation("Temporary file cleaned up: {TempPath}", tempFilePath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to cleanup temporary file: {TempPath}", tempFilePath);
                    }
                }
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteProject(int id)
        {
            try
            {
                _logger.LogInformation("Attempting to delete project {ProjectId}", id);
                
                var project = await _context.Projects
                    .Include(p => p.IFCFiles)
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (project == null)
                {
                    _logger.LogWarning("Project not found for deletion: {ProjectId}", id);
                    return NotFound(new { message = "Projet non trouvé" });
                }

                // Delete associated files from the file system
                if (project.IFCFiles != null)
                {
                    foreach (var file in project.IFCFiles)
                    {
                        var filePath = Path.Combine(_environment.WebRootPath, "uploads", file.FilePath);
                        if (System.IO.File.Exists(filePath))
                        {
                            try
                            {
                                System.IO.File.Delete(filePath);
                                _logger.LogInformation("Deleted file: {FilePath}", filePath);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Error deleting file {FilePath}", filePath);
                                // Continue with deletion even if file delete fails
                            }
                        }
                    }
                }

                _context.Projects.Remove(project);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Project {ProjectId} successfully deleted", id);
                return Ok(new { message = "Projet supprimé avec succès" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting project {ProjectId}", id);
                return StatusCode(500, new { 
                    message = "Une erreur s'est produite lors de la suppression du projet",
                    details = _environment.IsDevelopment() ? ex.Message : null 
                });
            }
        }

        [HttpDelete("{projectId}/files/{fileId}")]
        public async Task<ActionResult> DeleteFile(int projectId, int fileId)
        {
            try
            {
                _logger.LogInformation("Attempting to delete file {FileId} from project {ProjectId}", fileId, projectId);
                
                var file = await _context.IFCFiles
                    .FirstOrDefaultAsync(f => f.Id == fileId && f.ProjectId == projectId);

                if (file == null)
                {
                    _logger.LogWarning("File not found: FileId = {FileId}, ProjectId = {ProjectId}", fileId, projectId);
                    return NotFound(new { message = "Fichier non trouvé" });
                }

                // Delete the physical file
                var filePath = Path.Combine(_environment.WebRootPath, "uploads", file.FilePath);
                if (System.IO.File.Exists(filePath))
                {
                    try
                    {
                        System.IO.File.Delete(filePath);
                        _logger.LogInformation("Deleted physical file: {FilePath}", filePath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error deleting physical file {FilePath}", filePath);
                        // Continue with database deletion even if file delete fails
                    }
                }

                _context.IFCFiles.Remove(file);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("File {FileId} successfully deleted from project {ProjectId}", fileId, projectId);
                return Ok(new { message = "Fichier supprimé avec succès" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file {FileId} from project {ProjectId}", fileId, projectId);
                return StatusCode(500, new { 
                    message = "Une erreur s'est produite lors de la suppression du fichier",
                    details = _environment.IsDevelopment() ? ex.Message : null 
                });
            }
        }

        [HttpGet("{projectId}/files/{fileId}/xml")]
        public async Task<ActionResult> ConvertToXml(int projectId, int fileId)
        {
            try
            {
                _logger.LogInformation("Starting XML conversion: ProjectId = {ProjectId}, FileId = {FileId}", 
                    projectId, fileId);

                var file = await _context.IFCFiles
                    .FirstOrDefaultAsync(f => f.Id == fileId && f.ProjectId == projectId);

                if (file == null)
                {
                    _logger.LogWarning("File not found for XML conversion: FileId = {FileId}", fileId);
                    return NotFound(new { message = "Fichier non trouvé" });
                }

                var ifcFilePath = Path.Combine(_environment.WebRootPath, "uploads", file.FilePath);
                if (!System.IO.File.Exists(ifcFilePath))
                {
                    _logger.LogError("Physical IFC file not found: {FilePath}", ifcFilePath);
                    return NotFound(new { message = "Fichier IFC non trouvé sur le serveur" });
                }

                // Generate XML filename
                var xmlFileName = Path.GetFileNameWithoutExtension(file.FileName) + ".xml";
                var xmlFilePath = Path.Combine(_environment.WebRootPath, "uploads", 
                    $"{DateTime.UtcNow:yyyyMMdd}_{Guid.NewGuid()}_{xmlFileName}");

                // TODO: Implement actual IFC to XML conversion here
                // For now, create a simple XML with file metadata
                var xmlDoc = new XDocument(
                    new XElement("IFCFile",
                        new XElement("FileName", file.FileName),
                        new XElement("FileSize", file.FileSize),
                        new XElement("UploadDate", file.UploadDate),
                        new XElement("SchemaVersion", ExtractSchemaVersion(file.FileName))
                    )
                );

                xmlDoc.Save(xmlFilePath);
                _logger.LogInformation("XML file created: {XmlPath}", xmlFilePath);

                // Return the XML file
                var xmlBytes = System.IO.File.ReadAllBytes(xmlFilePath);
                try
                {
                    System.IO.File.Delete(xmlFilePath); // Clean up temporary file
                }
                catch
                {
                    // Ignore cleanup errors
                }

                return File(xmlBytes, "application/xml", xmlFileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during XML conversion: FileId = {FileId}", fileId);
                return StatusCode(500, new { 
                    message = "Une erreur s'est produite lors de la conversion en XML",
                    details = _environment.IsDevelopment() ? ex.Message : null 
                });
            }
        }

        [HttpGet("{projectId}/files/{fileId}/pdf")]
        public async Task<ActionResult> ConvertToPdf(int projectId, int fileId)
        {
            try
            {
                _logger.LogInformation("Starting PDF conversion: ProjectId = {ProjectId}, FileId = {FileId}", 
                    projectId, fileId);

                var file = await _context.IFCFiles
                    .Include(f => f.Project)
                    .FirstOrDefaultAsync(f => f.Id == fileId && f.ProjectId == projectId);

                if (file == null)
                {
                    _logger.LogWarning("File not found for PDF conversion: FileId = {FileId}", fileId);
                    return NotFound(new { message = "Fichier non trouvé" });
                }

                var ifcFilePath = Path.Combine(_environment.WebRootPath, "uploads", file.FilePath);
                if (!System.IO.File.Exists(ifcFilePath))
                {
                    _logger.LogError("Physical IFC file not found: {FilePath}", ifcFilePath);
                    return NotFound(new { message = "Fichier IFC non trouvé sur le serveur" });
                }

                // Generate PDF filename
                var pdfFileName = Path.GetFileNameWithoutExtension(file.FileName) + ".pdf";
                var pdfFilePath = Path.Combine(_environment.WebRootPath, "uploads", 
                    $"{DateTime.UtcNow:yyyyMMdd}_{Guid.NewGuid()}_{pdfFileName}");

                // Create PDF document
                using (var pdfWriter = new PdfWriter(pdfFilePath))
                using (var pdf = new PdfDocument(pdfWriter))
                using (var document = new Document(pdf))
                {
                    // Set fonts
                    var labelFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_BOLD);
                    var valueFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA);

                    // Add title
                    document.Add(new Paragraph("IFC File Report")
                        .SetFont(labelFont)
                        .SetFontSize(20)
                        .SetTextAlignment(TextAlignment.CENTER)
                        .SetMarginBottom(20));

                    // Create metadata table
                    var table = new Table(2)
                        .SetWidth(UnitValue.CreatePercentValue(100))
                        .SetMarginBottom(20);

                    // Add metadata
                    AddMetadataRow(table, "Project Name", file.Project?.Name ?? "N/A", labelFont, valueFont);
                    AddMetadataRow(table, "File Name", file.FileName, labelFont, valueFont);
                    AddMetadataRow(table, "Upload Date", file.UploadDate.ToString("yyyy-MM-dd HH:mm:ss"), labelFont, valueFont);
                    AddMetadataRow(table, "File Size", $"{Math.Round(file.FileSize / 1024.0 / 1024.0, 2)} MB", labelFont, valueFont);
                    AddMetadataRow(table, "Schema Version", ExtractSchemaVersion(file.FileName), labelFont, valueFont);

                    document.Add(table);

                    // TODO: Add more IFC-specific information here
                    document.Add(new Paragraph("Note: This is a basic PDF report. For full IFC visualization, please use an IFC viewer.")
                        .SetFont(valueFont)
                        .SetFontSize(10)
                        .SetTextAlignment(TextAlignment.CENTER)
                        .SetMarginTop(20));
                }

                // Return the PDF file
                var pdfBytes = System.IO.File.ReadAllBytes(pdfFilePath);
                try
                {
                    System.IO.File.Delete(pdfFilePath); // Clean up temporary file
                }
                catch
                {
                    // Ignore cleanup errors
                }

                return File(pdfBytes, "application/pdf", pdfFileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during PDF conversion: FileId = {FileId}", fileId);
                return StatusCode(500, new { 
                    message = "Une erreur s'est produite lors de la conversion en PDF",
                    details = _environment.IsDevelopment() ? ex.Message : null 
                });
            }
        }

        private bool ProjectExists(int id)
        {
            return _context.Projects.Any(e => e.Id == id);
        }

        private string ExtractSchemaVersion(string fileName)
        {
            // Try to extract schema version from filename (e.g., "model_IFC2X3.ifc")
            var match = Regex.Match(fileName, @"IFC(\d+X?\d*)", RegexOptions.IgnoreCase);
            return match.Success ? match.Value : "IFC2X3"; // Default to IFC2X3 if not found
        }

        private void AddMetadataRow(Table table, string label, string value, PdfFont labelFont, PdfFont valueFont)
        {
            table.AddCell(new Cell()
                .Add(new Paragraph(label)
                    .SetFont(labelFont)
                    .SetFontSize(11))
                .SetBackgroundColor(ColorConstants.LIGHT_GRAY)
                .SetPadding(5));

            table.AddCell(new Cell()
                .Add(new Paragraph(value ?? "N/A")
                    .SetFont(valueFont)
                    .SetFontSize(11))
                .SetPadding(5));
        }

        [HttpPost]
        public async Task<ActionResult<Project>> CreateProject([FromBody] CreateProjectRequest request)
        {
            try
            {
                _logger.LogInformation("Creating new project: {ProjectName}", request.Name);

                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    _logger.LogWarning("Project creation failed: Name is required");
                    return BadRequest(new { message = "Le nom du projet est requis" });
                }

                var project = new Project
                {
                    Name = request.Name,
                    Description = request.Description ?? string.Empty,
                    CreatedDate = DateTime.UtcNow,
                    LastModifiedDate = DateTime.UtcNow,
                    Status = "En attente",
                    CreatedById = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                };

                // Add the project to the context
                _context.Projects.Add(project);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Project created successfully: {ProjectId}", project.Id);

                // Return the created project
                return Ok(new
                {
                    id = project.Id,
                    name = project.Name,
                    description = project.Description,
                    createdDate = project.CreatedDate,
                    lastModifiedDate = project.LastModifiedDate,
                    status = project.Status,
                    files = new List<object>(), // New project has no files
                    createdById = project.CreatedById
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating project: {Message}", ex.Message);
                return StatusCode(500, new { 
                    message = "Erreur lors de la création du projet",
                    details = _environment.IsDevelopment() ? ex.Message : null
                });
            }
        }
    }
}