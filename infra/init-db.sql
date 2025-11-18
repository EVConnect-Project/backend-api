-- EVConnect Database Initialization Script
-- This script sets up the initial database schema with PostGIS support

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search optimization

-- Create initial users table (if not exists from TypeORM migrations)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create vehicle_profiles table
CREATE TABLE IF NOT EXISTS vehicle_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
    "batteryCapacity" DECIMAL(10, 2) NOT NULL CHECK ("batteryCapacity" > 0),
    "connectorType" VARCHAR(50) NOT NULL,
    "rangeKm" DECIMAL(10, 2) NOT NULL CHECK ("rangeKm" > 0),
    "isPrimary" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on vehicle_profiles
CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_user_id ON vehicle_profiles("userId");
CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_is_primary ON vehicle_profiles("isPrimary");

-- Function to update the updatedAt timestamp for vehicle_profiles
CREATE OR REPLACE FUNCTION update_vehicle_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updatedAt for vehicle_profiles
CREATE TRIGGER trigger_update_vehicle_profiles_updated_at
    BEFORE UPDATE ON vehicle_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_profiles_updated_at();

-- Create chargers table with PostGIS geometry
CREATE TABLE IF NOT EXISTS chargers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOMETRY(Point, 4326),  -- PostGIS point with WGS84 coordinate system
  status VARCHAR(20) DEFAULT 'available',
  connector_type VARCHAR(50),
  power_output DECIMAL(10, 2),
  price_per_kwh DECIMAL(10, 2),
  operator_id UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT chk_status CHECK (status IN ('available', 'in-use', 'offline', 'maintenance'))
);

-- Create spatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_chargers_location ON chargers USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_chargers_status ON chargers(status);

-- Create trigger to auto-populate location from lat/lng
CREATE OR REPLACE FUNCTION update_charger_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_charger_location
  BEFORE INSERT OR UPDATE ON chargers
  FOR EACH ROW
  EXECUTE FUNCTION update_charger_location();

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  charger_id UUID NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  total_cost DECIMAL(10, 2),
  energy_consumed DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT chk_booking_status CHECK (status IN ('pending', 'active', 'completed', 'cancelled'))
);

-- Create indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_charger_id ON bookings(charger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);

-- Insert sample admin user (password: admin123 - should be changed in production)
-- Password hash is bcrypt hash of "admin123"
INSERT INTO users (id, name, email, password, role) 
VALUES (
  uuid_generate_v4(),
  'Admin User',
  'admin@evconnect.com',
  '$2b$10$rW3KqxqN9qN3xPGKlZ3xf.8QZ9nZqN3xPGKlZ3xf8QZ9nZqN3xPGK',  -- admin123
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample chargers for testing
INSERT INTO chargers (id, name, address, latitude, longitude, status, connector_type, power_output, price_per_kwh)
VALUES 
  (
    uuid_generate_v4(),
    'Downtown EV Station',
    '123 Main St, San Francisco, CA 94102',
    37.7749,
    -122.4194,
    'available',
    'CCS',
    150.00,
    0.35
  ),
  (
    uuid_generate_v4(),
    'Airport Charging Hub',
    'San Francisco International Airport, CA 94128',
    37.6213,
    -122.3790,
    'available',
    'CHAdeMO',
    100.00,
    0.30
  ),
  (
    uuid_generate_v4(),
    'Shopping Mall Station',
    '456 Market St, San Francisco, CA 94103',
    37.7893,
    -122.4039,
    'available',
    'Tesla Supercharger',
    250.00,
    0.40
  )
ON CONFLICT (id) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_chargers_updated_at
  BEFORE UPDATE ON chargers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO evconnect;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO evconnect;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO evconnect;
