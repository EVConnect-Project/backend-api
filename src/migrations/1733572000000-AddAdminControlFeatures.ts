import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class AddAdminControlFeatures1733572000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin_actions table
    await queryRunner.createTable(
      new Table({
        name: 'admin_actions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'adminId',
            type: 'uuid',
          },
          {
            name: 'actionType',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'targetType',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'targetId',
            type: 'uuid',
          },
          {
            name: 'details',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['adminId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            columnNames: ['adminId'],
          },
          {
            columnNames: ['targetType', 'targetId'],
          },
          {
            columnNames: ['createdAt'],
          },
        ],
      }),
      true,
    );

    // Add admin message fields to messages table
    const messagesTable = await queryRunner.getTable('messages');
    if (messagesTable) {
      const hasIsAdminMessage = messagesTable.columns.find(col => col.name === 'is_admin_message');
      const hasPriorityLevel = messagesTable.columns.find(col => col.name === 'priority_level');

      if (!hasIsAdminMessage) {
        await queryRunner.addColumn(
          'messages',
          new TableColumn({
            name: 'is_admin_message',
            type: 'boolean',
            default: false,
          }),
        );
      }

      if (!hasPriorityLevel) {
        await queryRunner.addColumn(
          'messages',
          new TableColumn({
            name: 'priority_level',
            type: 'varchar',
            length: '20',
            default: "'normal'",
          }),
        );
      }
    }

    // Add metadata column to chargers if not exists
    const chargersTable = await queryRunner.getTable('chargers');
    if (chargersTable) {
      const hasMetadata = chargersTable.columns.find(col => col.name === 'metadata');

      if (!hasMetadata) {
        await queryRunner.addColumn(
          'chargers',
          new TableColumn({
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          }),
        );
      }
    }

    // Add metadata column to conversations if not exists
    const conversationsTable = await queryRunner.getTable('conversations');
    if (conversationsTable) {
      const hasMetadata = conversationsTable.columns.find(col => col.name === 'metadata');

      if (!hasMetadata) {
        await queryRunner.addColumn(
          'conversations',
          new TableColumn({
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admin_actions');
    
    const messagesTable = await queryRunner.getTable('messages');
    if (messagesTable) {
      await queryRunner.dropColumn('messages', 'is_admin_message');
      await queryRunner.dropColumn('messages', 'priority_level');
    }

    const chargersTable = await queryRunner.getTable('chargers');
    if (chargersTable) {
      const hasMetadata = chargersTable.columns.find(col => col.name === 'metadata');
      if (hasMetadata) {
        await queryRunner.dropColumn('chargers', 'metadata');
      }
    }

    const conversationsTable = await queryRunner.getTable('conversations');
    if (conversationsTable) {
      const hasMetadata = conversationsTable.columns.find(col => col.name === 'metadata');
      if (hasMetadata) {
        await queryRunner.dropColumn('conversations', 'metadata');
      }
    }
  }
}
