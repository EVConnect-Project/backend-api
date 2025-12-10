import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateChatTables1763540000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create conversations table
    await queryRunner.createTable(
      new Table({
        name: 'conversations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['mechanic', 'marketplace'],
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'participant_id',
            type: 'uuid',
          },
          {
            name: 'reference_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reference_type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'last_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'last_message_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'unread_count_user',
            type: 'int',
            default: 0,
          },
          {
            name: 'unread_count_participant',
            type: 'int',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign keys for conversations
    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['participant_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create messages table
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'conversation_id',
            type: 'uuid',
          },
          {
            name: 'sender_id',
            type: 'uuid',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['text', 'image', 'location', 'system'],
            default: "'text'",
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'image_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'latitude',
            type: 'decimal',
            precision: 10,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'longitude',
            type: 'decimal',
            precision: 11,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'is_read',
            type: 'boolean',
            default: false,
          },
          {
            name: 'read_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign keys for messages
    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['conversation_id'],
        referencedTableName: 'conversations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['sender_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_conversations_user_id ON conversations(user_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_conversations_participant_id ON conversations(participant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_conversations_type ON conversations(type);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_messages_sender_id ON messages(sender_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('messages');
    await queryRunner.dropTable('conversations');
  }
}
