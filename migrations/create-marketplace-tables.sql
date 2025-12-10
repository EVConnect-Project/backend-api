-- Create marketplace tables
-- This migration creates all necessary tables for the marketplace feature

-- Create enums
CREATE TYPE marketplace_listings_condition_enum AS ENUM('new', 'used');
CREATE TYPE marketplace_listings_status_enum AS ENUM('pending', 'approved', 'rejected', 'sold');

-- Create marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    condition marketplace_listings_condition_enum NOT NULL,
    city VARCHAR,
    lat FLOAT,
    long FLOAT,
    status marketplace_listings_status_enum DEFAULT 'pending',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "sellerId" UUID NOT NULL,
    CONSTRAINT "FK_marketplace_listings_seller" FOREIGN KEY ("sellerId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create marketplace_images table
CREATE TABLE IF NOT EXISTS marketplace_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "imageUrl" VARCHAR NOT NULL,
    "listingId" UUID NOT NULL,
    CONSTRAINT "FK_marketplace_images_listing" FOREIGN KEY ("listingId") REFERENCES marketplace_listings(id) ON DELETE CASCADE
);

-- Create marketplace_chats table
CREATE TABLE IF NOT EXISTS marketplace_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "listingId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "lastMessage" VARCHAR,
    "lastMessageAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    CONSTRAINT "FK_marketplace_chats_listing" FOREIGN KEY ("listingId") REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    CONSTRAINT "FK_marketplace_chats_buyer" FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT "FK_marketplace_chats_seller" FOREIGN KEY ("sellerId") REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE("listingId", "buyerId")
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "chatId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    message TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    CONSTRAINT "FK_chat_messages_chat" FOREIGN KEY ("chatId") REFERENCES marketplace_chats(id) ON DELETE CASCADE,
    CONSTRAINT "FK_chat_messages_sender" FOREIGN KEY ("senderId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings("sellerId");
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created ON marketplace_listings("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_images_listing ON marketplace_images("listingId");
CREATE INDEX IF NOT EXISTS idx_marketplace_chats_listing ON marketplace_chats("listingId");
CREATE INDEX IF NOT EXISTS idx_marketplace_chats_buyer ON marketplace_chats("buyerId");
CREATE INDEX IF NOT EXISTS idx_marketplace_chats_seller ON marketplace_chats("sellerId");
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages("chatId");
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages("createdAt" DESC);
