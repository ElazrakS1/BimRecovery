using System.Text.RegularExpressions;
using System.IO;
using Bim.Server.Models;
using Microsoft.Extensions.Logging;

namespace Bim.Server.Services
{
    public interface IIfcAnalysisService
    {
        System.Threading.Tasks.Task<IfcMetadata> ExtractMetadataAsync(string filePath);
    }

    public class IfcAnalysisService : IIfcAnalysisService
    {
        private readonly ILogger<IfcAnalysisService> _logger;

        public IfcAnalysisService(ILogger<IfcAnalysisService> logger)
        {
            _logger = logger;
        }

        public async System.Threading.Tasks.Task<IfcMetadata> ExtractMetadataAsync(string filePath)
        {
            var metadata = new IfcMetadata();
            
            if (!File.Exists(filePath))
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
                var content = await File.ReadAllTextAsync(filePath);
                
                // Extract IFC schema version
                var schemaMatch = Regex.Match(content, @"FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'", RegexOptions.IgnoreCase);
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
                var projectMatch = Regex.Match(content, @"IFCPROJECT\s*\(\s*'([^']*)'[^,]*,\s*'([^']*)'[^,]*,\s*'([^']*)'", RegexOptions.IgnoreCase);
                if (projectMatch.Success)
                {
                    metadata.ProjectName = projectMatch.Groups[2].Value;
                    metadata.ProjectDescription = projectMatch.Groups[3].Value;
                    _logger.LogInformation("Found project name: {ProjectName}", metadata.ProjectName);
                }

                // Extract organization information
                var orgMatch = Regex.Match(content, @"IFCORGANIZATION\s*\(\s*[^,]*,\s*'([^']*)'", RegexOptions.IgnoreCase);
                if (orgMatch.Success)
                {
                    metadata.Organization = orgMatch.Groups[1].Value;
                }

                // Extract person information (author)
                var personMatch = Regex.Match(content, @"IFCPERSON\s*\(\s*[^,]*,\s*'([^']*)'", RegexOptions.IgnoreCase);
                if (personMatch.Success)
                {
                    metadata.Author = personMatch.Groups[1].Value;
                }

                // Count IFC elements
                metadata.ElementCount = await CountIfcElementsAsync(content);
                _logger.LogInformation("Found {ElementCount} IFC elements", metadata.ElementCount);

                return metadata;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting IFC metadata from {FilePath}", filePath);
                return metadata;
            }
        }

        private System.Threading.Tasks.Task<int> CountIfcElementsAsync(string content)
        {
            try
            {
                // Count all IFC entities (lines starting with #number = IFC)
                var ifcEntityPattern = @"^#\d+\s*=\s*IFC\w+";
                var matches = Regex.Matches(content, ifcEntityPattern, RegexOptions.Multiline | RegexOptions.IgnoreCase);
                
                var totalElements = matches.Count;
                _logger.LogInformation("Counted {TotalElements} total IFC entities", totalElements);
                
                // Alternative count for building elements only
                var buildingElementPattern = @"^#\d+\s*=\s*IFC(WALL|SLAB|BEAM|COLUMN|DOOR|WINDOW|ROOF|STAIR|RAILING|SPACE|BUILDINGSTOREY|BUILDING)";
                var buildingMatches = Regex.Matches(content, buildingElementPattern, RegexOptions.Multiline | RegexOptions.IgnoreCase);
                
                var buildingElements = buildingMatches.Count;
                _logger.LogInformation("Counted {BuildingElements} building elements", buildingElements);
                
                // Return total elements if > 0, otherwise return building elements
                return System.Threading.Tasks.Task.FromResult(totalElements > 0 ? totalElements : buildingElements);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error counting IFC elements");
                return System.Threading.Tasks.Task.FromResult(0);
            }
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
}
