using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bim.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddPdfPathToIFCFile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ajout de la colonne PdfPath à la table IFCFiles
            migrationBuilder.AddColumn<string>(
                name: "PdfPath",
                table: "IFCFiles",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Suppression de la colonne PdfPath
            migrationBuilder.DropColumn(
                name: "PdfPath",
                table: "IFCFiles");
        }
    }
}
