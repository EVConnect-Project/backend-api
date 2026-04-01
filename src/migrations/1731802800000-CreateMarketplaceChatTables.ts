import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarketplaceChatTables1731802800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create marketplace_chats table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS marketplace_chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "listingId" UUID NOT NULL,
        "buyerId" UUID NOT NULL,
        "sellerId" UUID NOT NULL,
        "lastMessage" TEXT,
        "lastMessageAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_marketplace_chats_listing" FOREIGN KEY ("listingId") REFERENCES marketplace_listings(id) ON DELETE CASCADE,
        CONSTRAINT "FK_marketplace_chats_buyer" FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT "FK_marketplace_chats_seller" FOREIGN KEY ("sellerId") REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT "UQ_marketplace_chats" UNIQUE ("listingId", "buyerId", "sellerId")
      )
    `);

    // Create chat_messages table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "chatId" UUID NOT NULL,
        "senderId" UUID NOT NULL,
        message TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_chat_messages_chat" FOREIGN KEY ("chatId") REFERENCES marketplace_chats(id) ON DELETE CASCADE,
        CONSTRAINT "FK_chat_messages_sender" FOREIGN KEY ("senderId") REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_marketplace_chats_buyer" ON marketplace_chats ("buyerId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_marketplace_chats_seller" ON marketplace_chats ("sellerId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_marketplace_chats_listing" ON marketplace_chats ("listingId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_chat" ON chat_messages ("chatId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_sender" ON chat_messages ("senderId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_unread" ON chat_messages ("isRead", "senderId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_messages_unread"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_messages_sender"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_messages_chat"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_marketplace_chats_listing"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_marketplace_chats_seller"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_marketplace_chats_buyer"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS chat_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS marketplace_chats`);
  }
}
