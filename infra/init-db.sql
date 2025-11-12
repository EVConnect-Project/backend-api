-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chargers table
CREATE TABLE IF NOT EXISTS chargers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    power_kw DOUBLE PRECISION NOT NULL,
    price_per_kwh DOUBLE PRECISION NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    owner_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for faster geospatial queries
CREATE INDEX IF NOT EXISTS idx_chargers_location ON chargers USING GIST(location);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    charger_id INTEGER REFERENCES chargers(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    price DOUBLE PRECISION,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create mechanics table
CREATE TABLE IF NOT EXISTS mechanics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    services TEXT[] NOT NULL,
    rating DOUBLE PRECISION DEFAULT 0,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for mechanics
CREATE INDEX IF NOT EXISTS idx_mechanics_location ON mechanics USING GIST(location);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id),
    user_id INTEGER REFERENCES users(id),
    amount DOUBLE PRECISION NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email, password) VALUES 
('John Doe', 'john@example.com', '$2b$10$hashedpassword'),
('Jane Smith', 'jane@example.com', '$2b$10$hashedpassword')
ON CONFLICT (email) DO NOTHING;

-- Insert sample chargers (San Francisco area)
INSERT INTO chargers (name, latitude, longitude, location, power_kw, price_per_kwh, available) VALUES
('Downtown Charger', 37.7749, -122.4194, ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography, 150, 0.45, true),
('Airport Station', 37.6213, -122.3790, ST_SetSRID(ST_MakePoint(-122.3790, 37.6213), 4326)::geography, 250, 0.55, true),
('Mall Parking', 37.7939, -122.3947, ST_SetSRID(ST_MakePoint(-122.3947, 37.7939), 4326)::geography, 50, 0.35, true)
ON CONFLICT DO NOTHING;

-- Insert sample mechanics
INSERT INTO mechanics (name, phone, email, latitude, longitude, location, services, rating, available) VALUES
('EV Repair Pro', '+1-555-0101', 'repair@evpro.com', 37.7849, -122.4094, ST_SetSRID(ST_MakePoint(-122.4094, 37.7849), 4326)::geography, ARRAY['Battery Repair', 'Motor Service', 'Diagnostics'], 4.5, true),
('Quick EV Fix', '+1-555-0102', 'quick@evfix.com', 37.7649, -122.4294, ST_SetSRID(ST_MakePoint(-122.4294, 37.7649), 4326)::geography, ARRAY['Roadside Assistance', 'Towing', 'Emergency Repair'], 4.2, true)
ON CONFLICT DO NOTHING;
