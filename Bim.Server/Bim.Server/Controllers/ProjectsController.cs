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

namespace Bim.Server.Controllers
{
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
        public async Task<ActionResult<IEnumerable<Project>>> GetProjects()
        {
            return await _context.Projects
                .Include(p => p.IFCFiles)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Project>> GetProject(int id)
        {
            var project = await _context.Projects
                .Include(p => p.IFCFiles)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
            {
                return NotFound();
            }

            return project;
        }

        [HttpPost]
        public async Task<ActionResult<Project>> CreateProject(Project project)
        {
            try
            {
                // Validation explicite
                if (project == null)
                {
                    return BadRequest(new { message = "Les données du projet sont requises" });
                }

                if (string.IsNullOrWhiteSpace(project.Name))
                {
                    return BadRequest(new { message = "Le nom du projet est requis" });
                }

                // Nettoyer les données
                project.Name = project.Name.Trim();
                project.Description = project.Description?.Trim() ?? string.Empty;
                project.CreatedDate = DateTime.UtcNow;
                
                // Initialisation explicite de la collection
                project.IFCFiles = new List<IFCFile>();
                
                // Obtenir l'ID de l'utilisateur connecté
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                
                // Si l'utilisateur est authentifié, associer l'utilisateur au projet
                if (!string.IsNullOrEmpty(userId))
                {
                    project.CreatedById = userId;
                }
                // Si la relation CreatedById est obligatoire mais qu'aucun utilisateur n'est connecté
                else if (_context.Model.FindEntityType(typeof(Project))?.FindProperty("CreatedById")?.IsNullable == false)
                {
                    // Si la colonne CreatedById n'est pas nullable, nous devons retourner une erreur
                    return BadRequest(new { message = "Utilisateur non authentifié. La création de projet nécessite une authentification." });
                }
                
                // Vérifier si un projet avec le même nom existe déjà
                var projectExists = await _context.Projects.AnyAsync(p => p.Name == project.Name);
                if (projectExists)
                {
                    return BadRequest(new { message = "Un projet avec ce nom existe déjà" });
                }
                
                // Création du répertoire uploads si nécessaire
                var uploadsPath = Path.Combine(_environment.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsPath))
                {
                    Directory.CreateDirectory(uploadsPath);
                }
                
                // Traçage des opérations
                _logger.LogInformation("Tentative de création du projet: {ProjectName}, Créateur: {UserId}", project.Name, userId ?? "Anonymous");
                
                // Ajout du projet à la base de données
                _context.Projects.Add(project);
                
                try
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Projet créé avec succès: {ProjectId}, {ProjectName}, CreatedById: {UserId}", project.Id, project.Name, project.CreatedById);
                    return CreatedAtAction(nameof(GetProject), new { id = project.Id }, project);
                }
                catch (DbUpdateException dbEx)
                {
                    _logger.LogError(dbEx, "Erreur de base de données lors de la création du projet: {Message}", 
                        dbEx.InnerException?.Message ?? dbEx.Message);
                    
                    // Messages d'erreur spécifiques pour les problèmes de base de données courants
                    var errorMessage = "Erreur de base de données lors de la création du projet";
                    
                    if (dbEx.InnerException?.Message.Contains("FK_Projects_Users_CreatedById") == true)
                    {
                        return BadRequest(new { message = "L'utilisateur associé au projet n'existe pas. Veuillez vous reconnecter." });
                    }
                    
                    if (dbEx.InnerException?.Message.Contains("duplicate") == true || 
                        dbEx.InnerException?.Message.Contains("unique constraint") == true)
                    {
                        return BadRequest(new { message = "Un projet avec ce nom existe déjà" });
                    }
                    
                    return StatusCode(500, new { 
                        message = errorMessage, 
                        error = dbEx.InnerException?.Message ?? dbEx.Message,
                        stackTrace = _environment.IsDevelopment() ? dbEx.StackTrace : null
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception non gérée lors de la création du projet: {Message}", ex.Message);
                return StatusCode(500, new { 
                    message = "Une erreur inattendue s'est produite lors de la création du projet", 
                    error = ex.Message,
                    stackTrace = _environment.IsDevelopment() ? ex.StackTrace : null
                });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProject(int id, Project project)
        {
            if (id != project.Id)
            {
                return BadRequest();
            }

            project.LastModifiedDate = DateTime.UtcNow;
            _context.Entry(project).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProjectExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        [HttpPost("{id}/files")]
        public async Task<ActionResult<IFCFile>> AddFileToProject(int id, IFormFile file)
        {
            try
            {
                var project = await _context.Projects.FindAsync(id);
                if (project == null)
                {
                    return NotFound("Project not found");
                }

                if (file == null || file.Length == 0)
                {
                    return BadRequest("No file uploaded");
                }

                if (!file.FileName.EndsWith(".ifc", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("Only IFC files are allowed");
                }

                // Generate unique filename
                var fileName = $"{Guid.NewGuid()}_{file.FileName}";
                var relativePath = Path.Combine("uploads", fileName);
                var absolutePath = Path.Combine(_environment.WebRootPath, relativePath);

                // Create uploads directory if it doesn't exist
                var uploadsPath = Path.Combine(_environment.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsPath))
                {
                    Directory.CreateDirectory(uploadsPath);
                }

                // Save file
                using (var stream = new FileStream(absolutePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Extract IFC schema version from file name or default to "IFC2X3"
                var schemaVersion = ExtractSchemaVersion(file.FileName);

                // Create IFC file record
                var ifcFile = new IFCFile
                {
                    FileName = file.FileName,
                    FilePath = relativePath,
                    FileSize = file.Length,
                    UploadDate = DateTime.UtcNow,
                    ProjectId = project.Id,
                    Project = project,
                    ProjectName = project.Name,
                    Description = $"IFC file uploaded for project {project.Name}",
                    IfcSchemaVersion = schemaVersion,
                    IfcProjectName = project.Name,
                    IfcProjectDescription = project.Description,
                    Author = User.Identity?.Name ?? "Unknown",
                    Organization = "SmartBIM"
                };

                _context.IFCFiles.Add(ifcFile);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetProject), new { id = project.Id }, ifcFile);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error uploading file", error = ex.Message });
            }
        }

        [HttpGet("{projectId}/ifc-pdf")]
        public async Task<IActionResult> GetIFCAsPdf(int projectId)
        {
            try
            {
                var project = await _context.Projects
                    .Include(p => p.IFCFiles)
                    .FirstOrDefaultAsync(p => p.Id == projectId);

                if (project == null || !project.IFCFiles.Any())
                {
                    return NotFound("Project not found or no IFC files available");
                }

                using (var memoryStream = new MemoryStream())
                {
                    using (var pdfWriter = new PdfWriter(memoryStream))
                    using (var pdfDocument = new PdfDocument(pdfWriter))
                    using (var document = new Document(pdfDocument))
                    {
                        // Set up fonts
                        var helvetica = PdfFontFactory.CreateFont(StandardFonts.HELVETICA);
                        var helveticaBold = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_BOLD);

                        // Add document title
                        document.Add(new Paragraph($"IFC Report - {project.Name}")
                            .SetFont(helveticaBold)
                            .SetFontSize(16)
                            .SetTextAlignment(TextAlignment.CENTER)
                            .SetMarginBottom(20));

                        // Add project metadata table
                        var metadataTable = new Table(2).UseAllAvailableWidth();
                        AddMetadataRow(metadataTable, "Project Name", project.Name, helveticaBold, helvetica);
                        AddMetadataRow(metadataTable, "Created Date", project.CreatedDate.ToString("yyyy-MM-dd HH:mm:ss"), helveticaBold, helvetica);
                        AddMetadataRow(metadataTable, "Number of IFC Files", project.IFCFiles.Count.ToString(), helveticaBold, helvetica);
                        document.Add(metadataTable);
                        document.Add(new Paragraph("\n"));

                        foreach (var ifcFile in project.IFCFiles)
                        {
                            document.Add(new Paragraph($"File: {ifcFile.FileName}")
                                .SetFont(helveticaBold)
                                .SetFontSize(14)
                                .SetMarginTop(15));

                            var filePath = Path.Combine(_environment.ContentRootPath, "Uploads", ifcFile.FilePath);
                            if (!System.IO.File.Exists(filePath))
                            {
                                document.Add(new Paragraph("File not found on server")
                                    .SetFont(helvetica)
                                    .SetFontColor(ColorConstants.RED));
                                continue;
                            }

                            const int chunkSize = 500;
                            var lines = new List<string>(chunkSize);
                            var lineCount = 0;

                            using (var fileStream = new StreamReader(filePath))
                            {
                                string? line;
                                while ((line = await fileStream.ReadLineAsync()) is not null)
                                {
                                    lines.Add(line);
                                    lineCount++;

                                    if (lines.Count >= chunkSize)
                                    {
                                        // Process chunk
                                        document.Add(new Paragraph(string.Join("\n", lines))
                                            .SetFont(helvetica)
                                            .SetFontSize(9));
                                        lines.Clear();

                                        // Force garbage collection for large files
                                        if (lineCount % (chunkSize * 10) == 0)
                                        {
                                            GC.Collect();
                                        }
                                    }
                                }

                                // Process remaining lines
                                if (lines.Any())
                                {
                                    document.Add(new Paragraph(string.Join("\n", lines))
                                        .SetFont(helvetica)
                                        .SetFontSize(9));
                                }
                            }

                            document.Add(new Paragraph($"Total lines processed: {lineCount}")
                                .SetFont(helvetica)
                                .SetFontSize(10)
                                .SetMarginTop(10));
                        }
                    }

                    var pdfBytes = memoryStream.ToArray();
                    return File(pdfBytes, "application/pdf", $"IFC_Report_{project.Name}_{DateTime.Now:yyyyMMdd}.pdf");
                }
            }
            catch (OutOfMemoryException ex)
            {
                _logger.LogError(ex, "Out of memory while generating PDF");
                return StatusCode(500, "The file is too large to process. Please try with a smaller file.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating PDF");
                return StatusCode(500, "An error occurred while generating the PDF");
            }
        }

        [HttpPost]
        [Route("{projectId:int}/files/{fileId:int}/convert-xml")]
        public async Task<IActionResult> ConvertToXml(int projectId, int fileId)
        {
            try
            {
                var ifcFile = await _context.IFCFiles
                    .FirstOrDefaultAsync(f => f.Id == fileId && f.ProjectId == projectId);

                if (ifcFile == null)
                {
                    return NotFound("IFC file not found");
                }

                var ifcFilePath = Path.Combine(_environment.WebRootPath, ifcFile.FilePath);
                if (!System.IO.File.Exists(ifcFilePath))
                {
                    return NotFound("IFC file not found on disk");
                }

                // Create XML document
                var xmlDoc = new XDocument(
                    new XElement("IFCFile",
                        new XElement("Metadata",
                            new XElement("FileName", ifcFile.FileName),
                            new XElement("ProjectName", ifcFile.ProjectName),
                            new XElement("UploadDate", ifcFile.UploadDate),
                            new XElement("SchemaVersion", ifcFile.IfcSchemaVersion),
                            new XElement("Author", ifcFile.Author),
                            new XElement("Organization", ifcFile.Organization)
                        ),
                        new XElement("Content", await System.IO.File.ReadAllTextAsync(ifcFilePath))
                    )
                );

                // Convert to string and return as XML file
                var xmlString = xmlDoc.ToString();
                var xmlBytes = System.Text.Encoding.UTF8.GetBytes(xmlString);
                var xmlFileName = Path.ChangeExtension(ifcFile.FileName, ".xml");

                return File(xmlBytes, "application/xml", xmlFileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error converting IFC to XML", error = ex.Message });
            }
        }

        [HttpPost("{id}/share")]
        public async Task<IActionResult> ShareProjectByEmail(int id, [FromBody] ShareProjectRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.EmailTo) || string.IsNullOrEmpty(request.ProjectUrl))
                {
                    return BadRequest("Email and project URL are required");
                }

                var project = await _context.Projects
                    .Include(p => p.IFCFiles)
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (project == null)
                {
                    return NotFound("Projet non trouvé");
                }

                var smtpSettings = _configuration.GetSection("SmtpSettings");
                var host = smtpSettings["Host"] ?? throw new InvalidOperationException("SMTP host not configured");
                var port = int.Parse(smtpSettings["Port"] ?? "587");
                var email = smtpSettings["Email"] ?? throw new InvalidOperationException("SMTP email not configured");
                var password = smtpSettings["Password"] ?? throw new InvalidOperationException("SMTP password not configured");
                var displayName = smtpSettings["DisplayName"] ?? "SmartBIM";

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(displayName, email));
                message.To.Add(new MailboxAddress("", request.EmailTo));
                message.Subject = $"Partage du projet : {project.Name}";

                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <h2>Un projet a été partagé avec vous</h2>
                        <p>Nom du projet : {project.Name}</p>
                        <p>Description : {project.Description}</p>
                        <p>Nombre de fichiers : {project.IFCFiles?.Count ?? 0}</p>
                        <p>Pour accéder au projet, <a href='{request.ProjectUrl}'>cliquez ici</a></p>"
                };

                message.Body = builder.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(email, password);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                return Ok(new { message = "Email envoyé avec succès" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'envoi de l'email: {Message}", ex.Message);
                var errorMessage = ex.Message.Contains("5.7.0") 
                    ? "Erreur d'authentification SMTP. Veuillez vérifier les paramètres de connexion et le mot de passe d'application."
                    : "Une erreur s'est produite lors de l'envoi de l'email";
                
                return StatusCode(500, new { 
                    message = errorMessage,
                    error = ex.Message 
                });
            }
        }

        public class ShareProjectRequest
        {
            [Required]
            public required string EmailTo { get; set; }
            
            [Required]
            public required string ProjectUrl { get; set; }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(int id)
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
                // Supprimer les fichiers IFC physiquement
                foreach (var ifcFile in project.IFCFiles)
                {
                    var filePath = Path.Combine(_environment.WebRootPath, ifcFile.FilePath);
                    if (System.IO.File.Exists(filePath))
                    {
                        System.IO.File.Delete(filePath);
                    }

                    // Supprimer aussi le PDF s'il existe
                    var pdfPath = Path.Combine(_environment.WebRootPath, "pdfs", 
                        Path.ChangeExtension(Path.GetFileName(ifcFile.FilePath), ".pdf"));
                    if (System.IO.File.Exists(pdfPath))
                    {
                        System.IO.File.Delete(pdfPath);
                    }
                }

                _context.Projects.Remove(project);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Projet supprimé avec succès" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la suppression du projet", error = ex.Message });
            }
        }

        [HttpDelete("{projectId}/files/{fileId}")]
        public async Task<IActionResult> DeleteFile(int projectId, int fileId)
        {
            try
            {
                var ifcFile = await _context.IFCFiles
                    .FirstOrDefaultAsync(f => f.Id == fileId && f.ProjectId == projectId);

                if (ifcFile == null)
                {
                    return NotFound("IFC file not found");
                }

                var filePath = Path.Combine(_environment.WebRootPath, ifcFile.FilePath);
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }

                // Delete PDF if it exists
                var pdfPath = Path.Combine(_environment.WebRootPath, "pdfs", 
                    Path.ChangeExtension(Path.GetFileName(ifcFile.FilePath), ".pdf"));
                if (System.IO.File.Exists(pdfPath))
                {
                    System.IO.File.Delete(pdfPath);
                }

                _context.IFCFiles.Remove(ifcFile);
                await _context.SaveChangesAsync();

                return Ok(new { message = "File deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting file", error = ex.Message });
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
    }
}