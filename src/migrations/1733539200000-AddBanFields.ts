import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddBanFields1733539200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isBanned to chargers
    const chargersTable = await queryRunner.getTable("chargers");
    if (chargersTable && !chargersTable.findColumnByName("isBanned")) {
      await queryRunner.addColumn(
        "chargers",
        new TableColumn({
          name: "isBanned",
          type: "boolean",
          default: false,
        }),
      );
    }

    // Add isBanned to mechanics
    const mechanicsTable = await queryRunner.getTable("mechanics");
    if (mechanicsTable && !mechanicsTable.findColumnByName("isBanned")) {
      await queryRunner.addColumn(
        "mechanics",
        new TableColumn({
          name: "isBanned",
          type: "boolean",
          default: false,
        }),
      );
    }

    // Add isBanned to marketplace_listings
    const marketplaceTable = await queryRunner.getTable("marketplace_listings");
    if (marketplaceTable && !marketplaceTable.findColumnByName("isBanned")) {
      await queryRunner.addColumn(
        "marketplace_listings",
        new TableColumn({
          name: "isBanned",
          type: "boolean",
          default: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const chargersTable = await queryRunner.getTable("chargers");
    if (chargersTable?.findColumnByName("isBanned")) {
      await queryRunner.dropColumn("chargers", "isBanned");
    }

    const mechanicsTable = await queryRunner.getTable("mechanics");
    if (mechanicsTable?.findColumnByName("isBanned")) {
      await queryRunner.dropColumn("mechanics", "isBanned");
    }

    const marketplaceTable = await queryRunner.getTable("marketplace_listings");
    if (marketplaceTable?.findColumnByName("isBanned")) {
      await queryRunner.dropColumn("marketplace_listings", "isBanned");
    }
  }
}
