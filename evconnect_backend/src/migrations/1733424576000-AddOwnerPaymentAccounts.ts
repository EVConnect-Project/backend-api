import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddOwnerPaymentAccounts1733424576000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create owner_payment_accounts table
    await queryRunner.createTable(
      new Table({
        name: 'owner_payment_accounts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'accountHolderName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'bankName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'accountNumber',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'iban',
            type: 'varchar',
            length: '34',
            isNullable: true,
          },
          {
            name: 'swiftCode',
            type: 'varchar',
            length: '11',
            isNullable: true,
          },
          {
            name: 'routingNumber',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'branchCode',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'accountType',
            type: 'enum',
            enum: ['savings', 'checking', 'business'],
            default: "'savings'",
          },
          {
            name: 'verificationStatus',
            type: 'enum',
            enum: ['pending', 'verified', 'rejected'],
            default: "'pending'",
          },
          {
            name: 'verificationNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isPrimary',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'owner_payment_accounts',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Add paymentAccountId to chargers table
    await queryRunner.query(`
      ALTER TABLE chargers 
      ADD COLUMN "paymentAccountId" uuid NULL
    `);

    // Add foreign key from chargers to owner_payment_accounts
    await queryRunner.createForeignKey(
      'chargers',
      new TableForeignKey({
        columnNames: ['paymentAccountId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'owner_payment_accounts',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key from chargers
    const chargersTable = await queryRunner.getTable('chargers');
    const paymentAccountForeignKey = chargersTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('paymentAccountId') !== -1,
    );
    if (paymentAccountForeignKey) {
      await queryRunner.dropForeignKey('chargers', paymentAccountForeignKey);
    }

    // Remove paymentAccountId column from chargers
    await queryRunner.dropColumn('chargers', 'paymentAccountId');

    // Drop owner_payment_accounts table (foreign key will be dropped automatically)
    await queryRunner.dropTable('owner_payment_accounts');
  }
}
