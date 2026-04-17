import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddBookingTypeFields1733571000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const bookingsTable = await queryRunner.getTable("bookings");
    if (!bookingsTable) {
      return;
    }

    // Add bookingType column
    if (!bookingsTable.findColumnByName("bookingType")) {
      await queryRunner.addColumn(
        "bookings",
        new TableColumn({
          name: "bookingType",
          type: "varchar",
          length: "20",
          default: "'PRE_BOOKING'",
        }),
      );
    }

    // Add checkInTime column
    if (!bookingsTable.findColumnByName("checkInTime")) {
      await queryRunner.addColumn(
        "bookings",
        new TableColumn({
          name: "checkInTime",
          type: "timestamp",
          isNullable: true,
        }),
      );
    }

    // Add noShow column
    if (!bookingsTable.findColumnByName("noShow")) {
      await queryRunner.addColumn(
        "bookings",
        new TableColumn({
          name: "noShow",
          type: "boolean",
          default: false,
        }),
      );
    }

    // Add gracePeriodExpiresAt column
    if (!bookingsTable.findColumnByName("gracePeriodExpiresAt")) {
      await queryRunner.addColumn(
        "bookings",
        new TableColumn({
          name: "gracePeriodExpiresAt",
          type: "timestamp",
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const bookingsTable = await queryRunner.getTable("bookings");
    if (!bookingsTable) {
      return;
    }

    if (bookingsTable.findColumnByName("gracePeriodExpiresAt")) {
      await queryRunner.dropColumn("bookings", "gracePeriodExpiresAt");
    }
    if (bookingsTable.findColumnByName("noShow")) {
      await queryRunner.dropColumn("bookings", "noShow");
    }
    if (bookingsTable.findColumnByName("checkInTime")) {
      await queryRunner.dropColumn("bookings", "checkInTime");
    }
    if (bookingsTable.findColumnByName("bookingType")) {
      await queryRunner.dropColumn("bookings", "bookingType");
    }
  }
}
