import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePromotionsTable1704289200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "promotions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "title",
            type: "varchar",
            length: "255",
          },
          {
            name: "subtitle",
            type: "varchar",
            length: "255",
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "type",
            type: "enum",
            enum: [
              "charger_discount",
              "brand_partnership",
              "marketplace_deal",
              "service_offer",
              "local_business",
            ],
            default: "'charger_discount'",
          },
          {
            name: "status",
            type: "enum",
            enum: ["active", "scheduled", "expired", "draft"],
            default: "'draft'",
          },
          {
            name: "startDate",
            type: "timestamp",
          },
          {
            name: "endDate",
            type: "timestamp",
          },
          {
            name: "targetAudience",
            type: "jsonb",
            default: "'[]'",
          },
          {
            name: "iconName",
            type: "varchar",
            length: "100",
            default: "'electric_bolt'",
          },
          {
            name: "gradientColors",
            type: "jsonb",
            default: '\'["#1E4DB7", "#2F6FED"]\'',
          },
          {
            name: "badgeText",
            type: "varchar",
            length: "50",
            isNullable: true,
          },
          {
            name: "actionUrl",
            type: "varchar",
            length: "500",
          },
          {
            name: "impressions",
            type: "int",
            default: 0,
          },
          {
            name: "clicks",
            type: "int",
            default: 0,
          },
          {
            name: "conversions",
            type: "int",
            default: 0,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
      true,
    );

    // Add indexes for better query performance
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_PROMOTIONS_STATUS" ON "promotions" ("status")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_PROMOTIONS_DATES" ON "promotions" ("startDate", "endDate")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_PROMOTIONS_TYPE" ON "promotions" ("type")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("promotions");
  }
}
