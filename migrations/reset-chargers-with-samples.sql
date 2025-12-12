-- Reset chargers and add sample data with correct schema
-- This script removes all existing chargers and adds new sample data

BEGIN;

-- Delete all existing data (cascades will handle related tables)
-- Delete bookings first to avoid foreign key constraint issues
DELETE FROM bookings;
DELETE FROM charger_sockets;
DELETE FROM chargers;
DELETE FROM charging_stations;

-- Get a sample owner user ID (assumes at least one user with owner role exists)
DO $$
DECLARE
    owner_user_id UUID;
BEGIN
    -- Get or create a sample owner user
    SELECT id INTO owner_user_id FROM users WHERE role = 'owner' LIMIT 1;
    
    IF owner_user_id IS NULL THEN
        -- If no owner exists, update first user to be owner
        UPDATE users SET role = 'owner' WHERE id = (SELECT id FROM users LIMIT 1) RETURNING id INTO owner_user_id;
    END IF;

    -- Insert sample charging stations
    INSERT INTO charging_stations (
        id, owner_id, station_name, location_url, station_type, lat, lng, address,
        parking_capacity, description, amenities, opening_hours, images, access_type, 
        verified, is_banned, created_at, updated_at
    ) VALUES
    -- Station 1: Colombo City Hub
    (
        '11111111-1111-1111-1111-111111111111',
        owner_user_id,
        'Colombo City Charging Hub',
        'https://maps.google.com/?q=6.9271,79.8612',
        'public',
        6.9271,
        79.8612,
        'Colombo Fort, Colombo 01, Sri Lanka',
        20,
        'Modern charging facility in the heart of Colombo with multiple high-speed chargers',
        '["wifi", "restrooms", "restaurant", "convenience_store", "parking"]'::jsonb,
        '{"is24Hours": true, "schedule": {}}'::jsonb,
        '[]'::jsonb,
        'public',
        true,
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- Station 2: Kandy Tourist Center
    (
        '22222222-2222-2222-2222-222222222222',
        owner_user_id,
        'Kandy EV Station',
        'https://maps.google.com/?q=7.2906,80.6337',
        'public',
        7.2906,
        80.6337,
        'Kandy City Centre, Kandy, Sri Lanka',
        15,
        'Convenient charging station near tourist attractions',
        '["wifi", "restrooms", "atm", "shopping"]'::jsonb,
        '{"is24Hours": false, "schedule": {"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "06:00", "close": "22:00"}, "sunday": {"open": "06:00", "close": "22:00"}}}'::jsonb,
        '[]'::jsonb,
        'public',
        true,
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Insert chargers for Station 1 (Colombo City Hub)
    INSERT INTO chargers (
        id, "ownerId", station_id, name, charger_identifier, charger_type, max_power_kw,
        lat, lng, address, "powerKw", "pricePerKwh", "speedType", "connectorType",
        "numberOfPlugs", "accessType", "openingHours", verified, status,
        booking_mode, current_status, "createdAt", "updatedAt"
    ) VALUES
    -- DC Fast Charger 1
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        owner_user_id,
        '11111111-1111-1111-1111-111111111111',
        'Colombo Hub - DC Fast Charger 1',
        'CLMB-DC-001',
        'dc',
        50.0,
        6.9271,
        79.8612,
        'Colombo Fort, Colombo 01, Sri Lanka',
        50.0,
        28.50,
        'dc_fast',
        'ccs2',
        2,
        'public',
        '{"is24Hours": true, "schedule": {}}'::jsonb,
        true,
        'available',
        'hybrid',
        'available',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- AC Charger 1
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        owner_user_id,
        '11111111-1111-1111-1111-111111111111',
        'Colombo Hub - AC Charger 1',
        'CLMB-AC-001',
        'ac',
        7.4,
        6.9271,
        79.8612,
        'Colombo Fort, Colombo 01, Sri Lanka',
        7.4,
        22.00,
        'ac_fast',
        'type2',
        2,
        'public',
        '{"is24Hours": true, "schedule": {}}'::jsonb,
        true,
        'available',
        'hybrid',
        'available',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Insert sockets for Colombo DC Fast Charger 1
    INSERT INTO charger_sockets (
        id, charger_id, socket_number, socket_label, connector_type, max_power_kw,
        price_per_kwh, price_per_hour, is_free, current_status, booking_mode,
        is_occupied, created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        1,
        'Socket 1',
        'ccs2',
        50.0,
        28.50,
        NULL,
        false,
        'available',
        'hybrid',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        2,
        'Socket 2',
        'ccs2',
        50.0,
        28.50,
        NULL,
        false,
        'available',
        'hybrid',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Insert sockets for Colombo AC Charger 1
    INSERT INTO charger_sockets (
        id, charger_id, socket_number, socket_label, connector_type, max_power_kw,
        price_per_kwh, price_per_hour, is_free, current_status, booking_mode,
        is_occupied, created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        1,
        'Socket 1',
        'type2',
        7.4,
        22.00,
        NULL,
        false,
        'available',
        'hybrid',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        2,
        'Socket 2',
        'type2',
        7.4,
        22.00,
        NULL,
        false,
        'available',
        'hybrid',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Insert chargers for Station 2 (Kandy)
    INSERT INTO chargers (
        id, "ownerId", station_id, name, charger_identifier, charger_type, max_power_kw,
        lat, lng, address, "powerKw", "pricePerKwh", "speedType", "connectorType",
        "numberOfPlugs", "accessType", "openingHours", verified, status,
        booking_mode, current_status, "createdAt", "updatedAt"
    ) VALUES
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        owner_user_id,
        '22222222-2222-2222-2222-222222222222',
        'Kandy Station - AC Charger',
        'KNDY-AC-001',
        'ac',
        11.0,
        7.2906,
        80.6337,
        'Kandy City Centre, Kandy, Sri Lanka',
        11.0,
        25.00,
        'ac_fast',
        'type2',
        3,
        'public',
        '{"is24Hours": false, "schedule": {"monday": {"open": "06:00", "close": "22:00"}}}'::jsonb,
        true,
        'available',
        'hybrid',
        'available',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Insert sockets for Kandy AC Charger
    INSERT INTO charger_sockets (
        id, charger_id, socket_number, socket_label, connector_type, max_power_kw,
        price_per_kwh, price_per_hour, is_free, current_status, booking_mode,
        is_occupied, created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        1,
        'Socket 1',
        'type2',
        11.0,
        25.00,
        NULL,
        false,
        'available',
        'hybrid',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        2,
        'Socket 2',
        'type2',
        11.0,
        25.00,
        NULL,
        false,
        'available',
        'hybrid',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        3,
        'Socket 3',
        'type2',
        11.0,
        25.00,
        NULL,
        false,
        'available',
        'hybrid',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Insert individual chargers (not part of any station)
    INSERT INTO chargers (
        id, "ownerId", station_id, name, charger_identifier, charger_type, max_power_kw,
        lat, lng, address, "powerKw", "pricePerKwh", "speedType", "connectorType",
        "numberOfPlugs", description, "accessType", "openingHours", verified, status,
        booking_mode, current_status, "createdAt", "updatedAt"
    ) VALUES
    -- Individual Charger 1: Galle
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        owner_user_id,
        NULL,
        'Galle Fort Charger',
        NULL,
        'ac',
        7.4,
        6.0367,
        80.2170,
        'Galle Fort, Galle, Sri Lanka',
        7.4,
        20.00,
        'ac_fast',
        'type2',
        1,
        'Convenient AC charging near historic Galle Fort',
        'public',
        '{"is24Hours": true, "schedule": {}}'::jsonb,
        true,
        'available',
        'walk_in_only',
        'available',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- Individual Charger 2: Negombo
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        owner_user_id,
        NULL,
        'Negombo Beach Charger',
        NULL,
        'dc',
        25.0,
        7.2008,
        79.8358,
        'Negombo Beach, Negombo, Sri Lanka',
        25.0,
        26.00,
        'dc_fast',
        'chademo',
        1,
        'Fast DC charging near Negombo beach area',
        'public',
        '{"is24Hours": false, "schedule": {"monday": {"open": "07:00", "close": "20:00"}, "tuesday": {"open": "07:00", "close": "20:00"}, "wednesday": {"open": "07:00", "close": "20:00"}, "thursday": {"open": "07:00", "close": "20:00"}, "friday": {"open": "07:00", "close": "20:00"}, "saturday": {"open": "07:00", "close": "20:00"}, "sunday": {"open": "07:00", "close": "20:00"}}}'::jsonb,
        true,
        'available',
        'pre_booking_required',
        'available',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- Individual Charger 3: Nuwara Eliya
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        owner_user_id,
        NULL,
        'Nuwara Eliya Hill Station Charger',
        NULL,
        'ac',
        11.0,
        6.9497,
        80.7891,
        'Nuwara Eliya Town, Nuwara Eliya, Sri Lanka',
        11.0,
        23.00,
        'ac_fast',
        'type2',
        2,
        'Mountain area charging station with scenic views',
        'semi-public',
        '{"is24Hours": false, "schedule": {"monday": {"open": "08:00", "close": "18:00"}}}'::jsonb,
        true,
        'available',
        'hybrid',
        'available',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Insert sockets for individual chargers
    -- Galle Fort Charger
    INSERT INTO charger_sockets (
        id, charger_id, socket_number, socket_label, connector_type, max_power_kw,
        price_per_kwh, price_per_hour, is_free, current_status, booking_mode,
        is_occupied, created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        1,
        'Main Socket',
        'type2',
        7.4,
        20.00,
        NULL,
        false,
        'available',
        'walk_in_only',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Negombo Beach Charger
    INSERT INTO charger_sockets (
        id, charger_id, socket_number, socket_label, connector_type, max_power_kw,
        price_per_kwh, price_per_hour, is_free, current_status, booking_mode,
        is_occupied, created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        1,
        'Fast DC Socket',
        'chademo',
        25.0,
        26.00,
        NULL,
        false,
        'available',
        'pre_booking_required',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Nuwara Eliya Charger
    INSERT INTO charger_sockets (
        id, charger_id, socket_number, socket_label, connector_type, max_power_kw,
        price_per_kwh, price_per_hour, is_free, current_status, booking_mode,
        is_occupied, created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        1,
        'Socket 1',
        'type2',
        11.0,
        23.00,
        NULL,
        false,
        'available',
        'hybrid',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        2,
        'Socket 2',
        'type2',
        11.0,
        23.00,
        NULL,
        false,
        'available',
        'hybrid',
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Refresh the materialized view
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_station_availability;

END $$;

COMMIT;

-- Display summary
SELECT 
    'Charging Stations' as type,
    COUNT(*) as count
FROM charging_stations
UNION ALL
SELECT 
    'Chargers (Station-based)' as type,
    COUNT(*) as count
FROM chargers WHERE station_id IS NOT NULL
UNION ALL
SELECT 
    'Chargers (Individual)' as type,
    COUNT(*) as count
FROM chargers WHERE station_id IS NULL
UNION ALL
SELECT 
    'Charger Sockets' as type,
    COUNT(*) as count
FROM charger_sockets;
