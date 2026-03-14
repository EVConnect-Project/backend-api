-- Comprehensive migration to ensure all tables exist
-- Run this to create any missing tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (base table)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    country_code VARCHAR(10) DEFAULT '+94',
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    is_verified BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    vehicle_type VARCHAR(50),
    vehicle_brand VARCHAR(100),
    vehicle_model VARCHAR(100),
    battery_capacity DECIMAL(10, 2),
    connector_type VARCHAR(50),
    accepted_terms BOOLEAN DEFAULT false,
    accepted_privacy_policy BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicle profiles table
CREATE TABLE IF NOT EXISTS vehicle_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "vehicleName" VARCHAR(255) NOT NULL,
    "vehicleType" VARCHAR(50) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT,
    "batteryCapacity" DECIMAL(10, 2) NOT NULL,
    "connectorType" VARCHAR(50) NOT NULL,
    "avgEfficiency" DECIMAL(5, 2),
    "isPrimary" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Charging stations table
CREATE TABLE IF NOT EXISTS charging_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    "totalChargers" INT DEFAULT 0,
    "availableChargers" INT DEFAULT 0,
    amenities TEXT[],
    "operatingHours" TEXT,
    "pricePerKwh" DECIMAL(10, 2),
    "googleMapUrl" TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chargers table
CREATE TABLE IF NOT EXISTS chargers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    "pricePerKwh" DECIMAL(10, 2) NOT NULL,
    "pricePerHour" DECIMAL(10, 2),
    verified BOOLEAN DEFAULT false,
    "isBanned" BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending',
    charger_type VARCHAR(50),
    max_power_kw DECIMAL(10, 2),
    "speedType" VARCHAR(50),
    "connectorType" VARCHAR(50),
    "numberOfPlugs" INT DEFAULT 1,
    "openingHours" TEXT,
    "accessType" VARCHAR(50) DEFAULT 'public',
    "requiresAuth" BOOLEAN DEFAULT false,
    "requiresPhysicalCheck" BOOLEAN DEFAULT false,
    "bookingGracePeriod" INT DEFAULT 10,
    "autoCancelAfter" INT DEFAULT 30,
    "lastPhysicalCheck" TIMESTAMP,
    "hasOccupancySensor" BOOLEAN DEFAULT false,
    "manualOverride" VARCHAR(50) DEFAULT 'none',
    "publicAccessWarning" BOOLEAN DEFAULT false,
    "chargeBoxIdentity" VARCHAR(255),
    metadata JSONB,
    "ocppStatus" VARCHAR(50),
    "isOnline" BOOLEAN DEFAULT false,
    "lastHeartbeat" TIMESTAMP,
    booking_mode VARCHAR(50) DEFAULT 'none',
    booking_settings JSONB,
    current_status VARCHAR(50) DEFAULT 'available',
    last_status_update TIMESTAMP,
    "paymentAccountId" UUID,
    station_id UUID REFERENCES charging_stations(id),
    "chargerIdentifier" VARCHAR(255),
    "phoneNumber" VARCHAR(20),
    amenities TEXT[],
    google_map_url TEXT,
    reliability_score DECIMAL(5, 2) DEFAULT 100.00,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Charger sockets table  
CREATE TABLE IF NOT EXISTS charger_sockets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charger_id UUID NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
    socket_number INT NOT NULL,
    socket_label VARCHAR(100),
    connector_type VARCHAR(50) NOT NULL,
    max_power_kw DECIMAL(10, 2) NOT NULL,
    price_per_kwh DECIMAL(10, 2),
    price_per_hour DECIMAL(10, 2),
    is_free BOOLEAN DEFAULT false,
    booking_mode VARCHAR(50) DEFAULT 'none',
    current_status VARCHAR(50) DEFAULT 'available',
    occupied_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(charger_id, socket_number)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "chargerId" UUID NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
    "socketId" UUID REFERENCES charger_sockets(id),
    "startTime" TIMESTAMP NOT NULL,
    "endTime" TIMESTAMP NOT NULL,
    "estimatedEnergy" DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'pending',
    "totalCost" DECIMAL(10, 2),
    "paymentStatus" VARCHAR(50) DEFAULT 'pending',
    "cancelledAt" TIMESTAMP,
    "cancelReason" TEXT,
    "checkedInAt" TIMESTAMP,
    "gracePeriodEndsAt" TIMESTAMP,
    "autoCheckInEnabled" BOOLEAN DEFAULT false,
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status VARCHAR(50) DEFAULT 'sent',
    "sentAt" TIMESTAMP DEFAULT NOW(),
    "readAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- FCM tokens table
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_type VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    "bookingReminders" BOOLEAN DEFAULT true,
    "chargingUpdates" BOOLEAN DEFAULT true,
    "promotions" BOOLEAN DEFAULT true,
    "systemNotifications" BOOLEAN DEFAULT true,
    "emergencyAlerts" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "chargerId" UUID NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    "helpfulCount" INT DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "chargerId" UUID NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE("userId", "chargerId")
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "bookingId" UUID REFERENCES bookings(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'LKR',
    status VARCHAR(50) DEFAULT 'pending',
    "paymentMethod" VARCHAR(50),
    "stripePaymentIntentId" VARCHAR(255),
    "refundAmount" DECIMAL(10, 2),
    "refundedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "stripePaymentMethodId" VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    "lastFour" VARCHAR(4),
    brand VARCHAR(50),
    "expiryMonth" INT,
    "expiryYear" INT,
    "isDefault" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Payment settings table
CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    "autoPayEnabled" BOOLEAN DEFAULT false,
    "pinEnabled" BOOLEAN DEFAULT false,
    "pinHash" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Owner payment accounts table
CREATE TABLE IF NOT EXISTS owner_payment_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "accountHolderName" VARCHAR(255) NOT NULL,
    "bankName" VARCHAR(255) NOT NULL,
    "accountNumber" VARCHAR(50) NOT NULL,
    "branchCode" VARCHAR(50),
    "isPrimary" BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Support reports table
CREATE TABLE IF NOT EXISTS support_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "chargerId" UUID REFERENCES chargers(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    "assignedTo" UUID REFERENCES users(id),
    "resolvedAt" TIMESTAMP,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Marketplace listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    status VARCHAR(50) DEFAULT 'pending',
    "isSold" BOOLEAN DEFAULT false,
    "soldAt" TIMESTAMP,
    "isBanned" BOOLEAN DEFAULT false,
    "viewCount" INT DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Marketplace images table
CREATE TABLE IF NOT EXISTS marketplace_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "listingId" UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    "imageUrl" TEXT NOT NULL,
    "publicId" VARCHAR(255),
    "isPrimary" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Marketplace chats table
CREATE TABLE IF NOT EXISTS marketplace_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "listingId" UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    "buyerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "lastMessageAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE("listingId", "buyerId")
);

-- Chat messages table (marketplace)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "chatId" UUID NOT NULL REFERENCES marketplace_chats(id) ON DELETE CASCADE,
    "senderId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Mechanics table
CREATE TABLE IF NOT EXISTS mechanics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    services TEXT[] DEFAULT '{}',
    specialization VARCHAR(255),
    "yearsOfExperience" INT DEFAULT 0,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    phone VARCHAR(20),
    description TEXT,
    available BOOLEAN DEFAULT true,
    "isBanned" BOOLEAN DEFAULT false,
    "pricePerHour" DECIMAL(10, 2),
    "completedJobs" INT DEFAULT 0,
    "licenseNumber" VARCHAR(100),
    certifications TEXT,
    "currentLocationLat" DECIMAL(10, 7),
    "currentLocationLng" DECIMAL(10, 7),
    "isOnJob" BOOLEAN DEFAULT false,
    "lastOnlineAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Mechanic applications table
CREATE TABLE IF NOT EXISTS mechanic_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT NOT NULL,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    services TEXT[] NOT NULL,
    "yearsOfExperience" INT NOT NULL,
    "licenseNumber" VARCHAR(100),
    certifications TEXT,
    description TEXT,
    "pricePerHour" DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    "reviewedBy" UUID REFERENCES users(id),
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Emergency requests table  
CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "mechanicId" UUID REFERENCES mechanics(id) ON DELETE SET NULL,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    "problemType" VARCHAR(50),
    "problemDescription" TEXT,
    "urgencyLevel" VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    "userPhone" VARCHAR(20),
    "vehicleInfo" TEXT,
    "estimatedCost" DECIMAL(10, 2),
    "actualCost" DECIMAL(10, 2),
    "completionNotes" TEXT,
    "completedAt" TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Mechanic responses table
CREATE TABLE IF NOT EXISTS mechanic_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "emergencyRequestId" UUID NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    "mechanicId" UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    "estimatedArrival" TIMESTAMP,
    "estimatedCost" DECIMAL(10, 2),
    message TEXT,
    "aiScore" DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Emergency feedback table
CREATE TABLE IF NOT EXISTS emergency_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "mechanicId" UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
    "emergencyRequestId" UUID NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    overall_rating INT NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    response_time_rating INT NOT NULL CHECK (response_time_rating >= 1 AND response_time_rating <= 5),
    service_quality_rating INT NOT NULL CHECK (service_quality_rating >= 1 AND service_quality_rating <= 5),
    professionalism_rating INT NOT NULL CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    value_rating INT NOT NULL CHECK (value_rating >= 1 AND value_rating <= 5),
    comment TEXT,
    positive_aspects TEXT[] DEFAULT '{}',
    negative_aspects TEXT[] DEFAULT '{}',
    would_recommend BOOLEAN DEFAULT true,
    had_issues BOOLEAN DEFAULT false,
    issue_types TEXT[] DEFAULT '{}',
    issue_description TEXT,
    ai_recommendation_helpful BOOLEAN,
    ai_eta_accurate BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE("emergencyRequestId")
);

-- Mechanic analytics table
CREATE TABLE IF NOT EXISTS mechanic_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mechanic_id UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE UNIQUE,
    total_completed_jobs INT DEFAULT 0,
    total_feedback_count INT DEFAULT 0,
    average_overall_rating DECIMAL(3, 2) DEFAULT 0.00,
    average_response_time_rating DECIMAL(3, 2) DEFAULT 0.00,
    average_service_quality_rating DECIMAL(3, 2) DEFAULT 0.00,
    average_professionalism_rating DECIMAL(3, 2) DEFAULT 0.00,
    average_value_rating DECIMAL(3, 2) DEFAULT 0.00,
    average_response_time_minutes INT DEFAULT 0,
    completion_rate DECIMAL(5, 2) DEFAULT 0.00,
    recommendation_rate DECIMAL(5, 2) DEFAULT 0.00,
    total_issues_reported INT DEFAULT 0,
    pricing_issues_count INT DEFAULT 0,
    service_quality_issues_count INT DEFAULT 0,
    professionalism_issues_count INT DEFAULT 0,
    other_issues_count INT DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    ai_recommendation_accuracy DECIMAL(5, 2) DEFAULT 0.00,
    ai_eta_accuracy DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin actions table
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "adminId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    "targetType" VARCHAR(50),
    "targetId" UUID,
    details JSONB,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Conversations table (for chat system)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "mechanicId" UUID NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
    "lastMessageAt" TIMESTAMP,
    "userUnreadCount" INT DEFAULT 0,
    "mechanicUnreadCount" INT DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE("userId", "mechanicId")
);

-- Messages table (for chat system)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "conversationId" UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    "senderId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Trip plans table
CREATE TABLE IF NOT EXISTS trip_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin_lat DECIMAL(10, 7) NOT NULL,
    origin_lng DECIMAL(10, 7) NOT NULL,
    destination_lat DECIMAL(10, 7) NOT NULL,
    destination_lng DECIMAL(10, 7) NOT NULL,
    "vehicleProfileId" UUID REFERENCES vehicle_profiles(id),
    "startBatteryLevel" DECIMAL(5, 2) NOT NULL,
    "targetArrivalBattery" DECIMAL(5, 2) DEFAULT 20.00,
    route_data JSONB,
    "totalDistance" DECIMAL(10, 2),
    "estimatedDuration" INT,
    status VARCHAR(50) DEFAULT 'planned',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Trip segments table
CREATE TABLE IF NOT EXISTS trip_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tripPlanId" UUID NOT NULL REFERENCES trip_plans(id) ON DELETE CASCADE,
    "segmentOrder" INT NOT NULL,
    start_lat DECIMAL(10, 7) NOT NULL,
    start_lng DECIMAL(10, 7) NOT NULL,
    end_lat DECIMAL(10, 7) NOT NULL,
    end_lng DECIMAL(10, 7) NOT NULL,
    distance DECIMAL(10, 2) NOT NULL,
    duration INT NOT NULL,
    "chargerId" UUID REFERENCES chargers(id),
    "requiredCharge" DECIMAL(5, 2),
    "chargingTime" INT,
    "batteryStart" DECIMAL(5, 2),
    "batteryEnd" DECIMAL(5, 2),
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_user_id ON vehicle_profiles("userId");
CREATE INDEX IF NOT EXISTS idx_chargers_owner_id ON chargers("ownerId");
CREATE INDEX IF NOT EXISTS idx_chargers_location ON chargers(lat, lng);
CREATE INDEX IF NOT EXISTS idx_chargers_status ON chargers(status);
CREATE INDEX IF NOT EXISTS idx_chargers_station_id ON chargers(station_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings("userId");
CREATE INDEX IF NOT EXISTS idx_bookings_charger_id ON bookings("chargerId");
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs("userId");
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_reviews_charger_id ON reviews("chargerId");
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites("userId");
CREATE INDEX IF NOT EXISTS idx_favorites_charger_id ON favorites("chargerId");
CREATE INDEX IF NOT EXISTS idx_mechanics_user_id ON mechanics(user_id);
CREATE INDEX IF NOT EXISTS idx_mechanics_location ON mechanics(lat, lng);
CREATE INDEX IF NOT EXISTS idx_mechanics_available ON mechanics(available);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_user_id ON emergency_requests("userId");
CREATE INDEX IF NOT EXISTS idx_emergency_requests_mechanic_id ON emergency_requests("mechanicId");
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_mechanic_responses_emergency_id ON mechanic_responses("emergencyRequestId");
CREATE INDEX IF NOT EXISTS idx_mechanic_responses_mechanic_id ON mechanic_responses("mechanicId");
CREATE INDEX IF NOT EXISTS idx_emergency_feedback_mechanic_id ON emergency_feedback("mechanicId");
CREATE INDEX IF NOT EXISTS idx_emergency_feedback_user_id ON emergency_feedback("userId");
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON marketplace_listings("sellerId");
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_chats_listing_id ON marketplace_chats("listingId");
CREATE INDEX IF NOT EXISTS idx_marketplace_chats_buyer_id ON marketplace_chats("buyerId");
CREATE INDEX IF NOT EXISTS idx_trip_plans_user_id ON trip_plans("userId");
CREATE INDEX IF NOT EXISTS idx_trip_segments_trip_id ON trip_segments("tripPlanId");

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO evrs_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO evrs_user;
