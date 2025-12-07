import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBookingTypeFields1733571000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add bookingType column
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'bookingType',
        type: 'varchar',
        length: '20',
        default: "'PRE_BOOKING'",
      }),
    );

    // Add checkInTime column
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'checkInTime',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add noShow column
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'noShow',
        type: 'boolean',
        default: false,
      }),
    );

    // Add gracePeriodExpiresAt column
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'gracePeriodExpiresAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('bookings', 'gracePeriodExpiresAt');
    await queryRunner.dropColumn('bookings', 'noShow');
    await queryRunner.dropColumn('bookings', 'checkInTime');
    await queryRunner.dropColumn('bookings', 'bookingType');
  }
}
