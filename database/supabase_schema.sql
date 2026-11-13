-- ====================================================================
-- ROUTELESS: REAL-TIME INTELLIGENT RURAL TRANSPORTATION PLATFORM
-- PostgreSQL / Supabase Migration Schema
-- Compatible with PostgreSQL 14+, Supabase Realtime, and PostGIS
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & PROFILES
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(512) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'driver', 'admin')),
    phone VARCHAR(50),
    college_id_card VARCHAR(100),
    pickup_stop_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ROUTES
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    route_code VARCHAR(50) UNIQUE NOT NULL,
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    total_distance_km NUMERIC(6, 2) NOT NULL,
    estimated_duration_min INTEGER NOT NULL,
    waypoints_json JSONB NOT NULL,
    color VARCHAR(20) DEFAULT '#06B6D4',
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- 3. STOPS (Rural Pick-up Points)
CREATE TABLE IF NOT EXISTS stops (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(255) NOT NULL,
    village_name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    sequence_order INTEGER NOT NULL,
    scheduled_time VARCHAR(50) NOT NULL,
    student_count INTEGER DEFAULT 0,
    landmark TEXT
);

-- 4. BUSES
CREATE TABLE IF NOT EXISTS buses (
    id SERIAL PRIMARY KEY,
    bus_number VARCHAR(50) UNIQUE NOT NULL,
    route_id INTEGER NOT NULL REFERENCES routes(id),
    driver_id INTEGER REFERENCES users(id),
    driver_name VARCHAR(255) NOT NULL,
    driver_phone VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 40,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_TRANSIT' CHECK (status IN ('IN_TRANSIT', 'IDLE', 'DELAYED', 'EMERGENCY', 'BOARDING')),
    model VARCHAR(100) DEFAULT 'Tata Starbus Ultra Rural',
    plate_number VARCHAR(50),
    rating NUMERIC(3, 1) DEFAULT 4.8
);

-- 5. REQUIRED TABLE: BUS_LOCATIONS
-- (id, bus_id, latitude, longitude, speed, updated_at)
CREATE TABLE IF NOT EXISTS bus_locations (
    id SERIAL PRIMARY KEY,
    bus_id INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    heading NUMERIC(5, 2) DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 6. REQUIRED TABLE: CAMERAS
-- (id, bus_id, camera_type, camera_url, connection_status)
CREATE TABLE IF NOT EXISTS cameras (
    id SERIAL PRIMARY KEY,
    bus_id INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    camera_type VARCHAR(50) NOT NULL CHECK (camera_type IN ('inside_cabin', 'road_view')),
    camera_url TEXT NOT NULL,
    connection_status VARCHAR(50) NOT NULL CHECK (connection_status IN ('ONLINE', 'STREAMING', 'OFFLINE', 'STANDBY')),
    resolution VARCHAR(50) DEFAULT '1080p @ 30fps',
    last_ping TIMESTAMP WITH TIME ZONE
);

-- 7. REQUIRED TABLE: CAMERA_EVENTS
-- (id, camera_id, event_type, description, timestamp)
CREATE TABLE IF NOT EXISTS camera_events (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    confidence NUMERIC(4, 2) DEFAULT 0.95,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 8. REQUIRED TABLE: BUS_ALERTS
-- (id, bus_id, alert_type, location, description, status)
CREATE TABLE IF NOT EXISTS bus_alerts (
    id SERIAL PRIMARY KEY,
    bus_id INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISPATCHED', 'RESOLVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 9. REQUIRED TABLE: TRIP_HISTORY
-- (id, bus_id, start_location, destination, start_time, end_time, trip_status)
CREATE TABLE IF NOT EXISTS trip_history (
    id SERIAL PRIMARY KEY,
    bus_id INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    start_location VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    trip_status VARCHAR(50) NOT NULL CHECK (trip_status IN ('COMPLETED', 'IN_TRANSIT', 'ABORTED', 'DELAYED')),
    students_carried INTEGER DEFAULT 0
);

-- 10. STUDENT BOOKINGS & PASSES
CREATE TABLE IF NOT EXISTS student_bookings (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id),
    bus_id INTEGER NOT NULL REFERENCES buses(id),
    route_id INTEGER NOT NULL REFERENCES routes(id),
    pickup_stop_id INTEGER NOT NULL REFERENCES stops(id),
    booking_date DATE NOT NULL,
    seat_number VARCHAR(20) NOT NULL,
    pass_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'BOARDED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. ALTERNATIVE RURAL TRANSPORTATION
CREATE TABLE IF NOT EXISTS alternative_transport (
    id SERIAL PRIMARY KEY,
    hub_name VARCHAR(255) NOT NULL,
    transport_type VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    contact_number VARCHAR(50),
    available_vehicles INTEGER DEFAULT 5,
    village_name VARCHAR(255)
);

-- 12. EMERGENCY SERVICES
CREATE TABLE IF NOT EXISTS emergency_services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    emergency_phone VARCHAR(50) NOT NULL,
    address TEXT
);

-- 13. ROUTE DISRUPTIONS
CREATE TABLE IF NOT EXISTS route_disruptions (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(id),
    disruption_type VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
    is_active INTEGER DEFAULT 1
);

-- INDEXES FOR MAXIMUM QUERY SPEED
CREATE INDEX IF NOT EXISTS idx_bus_locations_bus ON bus_locations(bus_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_camera_events_cam ON camera_events(camera_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bus_alerts_status ON bus_alerts(status);
CREATE INDEX IF NOT EXISTS idx_stops_route ON stops(route_id, sequence_order);
