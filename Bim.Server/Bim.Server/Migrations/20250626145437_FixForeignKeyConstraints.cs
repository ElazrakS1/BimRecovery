using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bim.Server.Migrations
{
    /// <inheritdoc />
    public partial class FixForeignKeyConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Annotations_Users_AuthorId",
                table: "Annotations");

            migrationBuilder.DropForeignKey(
                name: "FK_CollaborationTasks_Users_CreatedById",
                table: "CollaborationTasks");

            migrationBuilder.AddForeignKey(
                name: "FK_Annotations_Users_AuthorId",
                table: "Annotations",
                column: "AuthorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CollaborationTasks_Users_CreatedById",
                table: "CollaborationTasks",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Annotations_Users_AuthorId",
                table: "Annotations");

            migrationBuilder.DropForeignKey(
                name: "FK_CollaborationTasks_Users_CreatedById",
                table: "CollaborationTasks");

            migrationBuilder.AddForeignKey(
                name: "FK_Annotations_Users_AuthorId",
                table: "Annotations",
                column: "AuthorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_CollaborationTasks_Users_CreatedById",
                table: "CollaborationTasks",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
