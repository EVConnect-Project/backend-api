import { MigrationInterface, QueryRunner, TableColumn, Table } from "typeorm";

export class AddPhoneAuthFields1704000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if phoneNumber column exists before adding
    const table = await queryRunner.getTable("users");
    const hasPhoneNumber = table?.columns.find(
      (col) => col.name === "phoneNumber",
    );

    if (!hasPhoneNumber) {
      await queryRunner.addColumn(
        "users",
        new TableColumn({
          name: "phoneNumber",
          type: "varchar",
          length: "20",
          isNullable: true,
          isUnique: true,
        }),
      );
    }

    // Check if otp_verifications table exists before creating
    const otpTableExists = await queryRunner.hasTable("otp_verifications");

    if (!otpTableExists) {
      await queryRunner.createTable(
        new Table({
          name: "otp_verifications",
          columns: [
            {
              name: "id",
              type: "int",
              isPrimary: true,
              isGenerated: true,
              generationStrategy: "increment",
            },
            {
              name: "phoneNumber",
              type: "varchar",
              length: "20",
            },
            {
              name: "otp",
              type: "varchar",
              length: "6",
            },
            {
              name: "expiresAt",
              type: "timestamp",
            },
            {
              name: "isUsed",
              type: "boolean",
              default: false,
            },
            {
              name: "createdAt",
              type: "timestamp",
              default: "CURRENT_TIMESTAMP",
            },
          ],
          indices: [
            {
              name: "IDX_OTP_PHONE",
              columnNames: ["phoneNumber"],
            },
            {
              name: "IDX_OTP_CREATED",
              columnNames: ["createdAt"],
            },
          ],
        }),
        true,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop otp_verifications table
    await queryRunner.dropTable("otp_verifications");

    // Remove phoneNumber column from users table
    await queryRunner.dropColumn("users", "phoneNumber");
  }
}
