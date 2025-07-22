using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bim.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddElementCountToIFCFile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ElementCount",
                table: "IFCFiles",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ElementCount",
                table: "IFCFiles");
        }
    }
}
