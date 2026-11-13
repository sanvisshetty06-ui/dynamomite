/**
 * ROUTELESS – Database Engine
 * High-performance standalone relational store with node:sqlite (native Node 22+)
 * Supports full PostgreSQL/Supabase schema parity.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const dbPath = path.join(__dirname, 'routeless.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Hash password with scrypt
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify password
 */
function verifyPassword(password, storedHash) {
  try {
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (e) {
    return false;
  }
}

/**
 * Initialize Tables
 */
function initDatabase() {
  // 1. Core Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'driver', 'admin')),
      phone TEXT,
      college_id_card TEXT,
      pickup_stop_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 2. Routes Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_name TEXT NOT NULL,
      route_code TEXT UNIQUE NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      total_distance_km REAL NOT NULL,
      estimated_duration_min INTEGER NOT NULL,
      waypoints_json TEXT NOT NULL,
      color TEXT DEFAULT '#06B6D4',
      status TEXT DEFAULT 'ACTIVE'
    );
  `);

  // 3. Stops Table (Rural pick-up points)
  db.exec(`
    CREATE TABLE IF NOT EXISTS stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      stop_name TEXT NOT NULL,
      village_name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      sequence_order INTEGER NOT NULL,
      scheduled_time TEXT NOT NULL,
      student_count INTEGER DEFAULT 0,
      landmark TEXT,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    );
  `);

  // 4. Buses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS buses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_number TEXT UNIQUE NOT NULL,
      route_id INTEGER NOT NULL,
      driver_id INTEGER,
      driver_name TEXT NOT NULL,
      driver_phone TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 40,
      current_occupancy INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'IN_TRANSIT' CHECK(status IN ('IN_TRANSIT', 'IDLE', 'DELAYED', 'EMERGENCY', 'BOARDING')),
      model TEXT DEFAULT 'Tata Starbus Ultra Rural',
      plate_number TEXT,
      rating REAL DEFAULT 4.8,
      FOREIGN KEY (route_id) REFERENCES routes(id)
    );
  `);

  // 5. REQUIRED TABLE: BUS_LOCATIONS (id, bus_id, latitude, longitude, speed, updated_at)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bus_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      speed REAL NOT NULL DEFAULT 0.0,
      heading REAL DEFAULT 0.0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE
    );
  `);

  // 6. REQUIRED TABLE: CAMERAS (id, bus_id, camera_type, camera_url, connection_status)
  db.exec(`
    CREATE TABLE IF NOT EXISTS cameras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_id INTEGER NOT NULL,
      camera_type TEXT NOT NULL CHECK(camera_type IN ('inside_cabin', 'road_view')),
      camera_url TEXT NOT NULL,
      connection_status TEXT NOT NULL CHECK(connection_status IN ('ONLINE', 'STREAMING', 'OFFLINE', 'STANDBY')),
      resolution TEXT DEFAULT '1080p @ 30fps',
      last_ping TEXT,
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE
    );
  `);

  // 7. REQUIRED TABLE: CAMERA_EVENTS (id, camera_id, event_type, description, timestamp)
  db.exec(`
    CREATE TABLE IF NOT EXISTS camera_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camera_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      confidence REAL DEFAULT 0.95,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
    );
  `);

  // 8. REQUIRED TABLE: BUS_ALERTS (id, bus_id, alert_type, location, description, status)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bus_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'DISPATCHED', 'RESOLVED')),
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE
    );
  `);

  // 9. REQUIRED TABLE: TRIP_HISTORY (id, bus_id, start_location, destination, start_time, end_time, trip_status)
  db.exec(`
    CREATE TABLE IF NOT EXISTS trip_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_id INTEGER NOT NULL,
      start_location TEXT NOT NULL,
      destination TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      trip_status TEXT NOT NULL CHECK(trip_status IN ('COMPLETED', 'IN_TRANSIT', 'ABORTED', 'DELAYED')),
      students_carried INTEGER DEFAULT 0,
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE
    );
  `);

  // 10. Student Bookings / Passes
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      bus_id INTEGER NOT NULL,
      route_id INTEGER NOT NULL,
      pickup_stop_id INTEGER NOT NULL,
      booking_date TEXT NOT NULL,
      seat_number TEXT NOT NULL,
      pass_code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'BOARDED', 'CANCELLED')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (bus_id) REFERENCES buses(id),
      FOREIGN KEY (route_id) REFERENCES routes(id),
      FOREIGN KEY (pickup_stop_id) REFERENCES stops(id)
    );
  `);

  // 11. Alternative Rural Transport Nodes (Auto stands, E-Rickshaw hubs, Panchayat Vans)
  db.exec(`
    CREATE TABLE IF NOT EXISTS alternative_transport (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hub_name TEXT NOT NULL,
      transport_type TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      contact_number TEXT,
      available_vehicles INTEGER DEFAULT 5,
      village_name TEXT
    );
  `);

  // 12. Emergency Services (Clinics, Police Outposts, Towing)
  db.exec(`
    CREATE TABLE IF NOT EXISTS emergency_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      service_type TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      emergency_phone TEXT NOT NULL,
      address TEXT
    );
  `);

  // 13. Route Disruptions (Roadwork, flooding, cattle, landslides)
  db.exec(`
    CREATE TABLE IF NOT EXISTS route_disruptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      disruption_type TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('HIGH', 'MEDIUM', 'LOW')),
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (route_id) REFERENCES routes(id)
    );
  `);

  // Seed sample data if empty
  seedData();
}

/**
 * Seed initial realistic rural transportation network data
 */
function seedData() {
  const userCheck = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCheck.count > 0) return;

  console.log('Seeding initial data for ROUTELESS rural transport network...');

  // 1. Users (Admin, Driver, Student)
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, college_id_card, pickup_stop_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const adminHash = hashPassword('admin123');
  const driverHash = hashPassword('driver123');
  const studentHash = hashPassword('student123');

  insertUser.run('Priya Sharma', 'admin@routeless.org', adminHash, 'admin', '+91 98765 43210', 'ADM-RIT-001', null);
  insertUser.run('Ramesh Kulkarni', 'driver.ramesh@routeless.org', driverHash, 'driver', '+91 94481 22334', 'DRV-KA-4412', null);
  insertUser.run('Basavaraj Patil', 'driver.basu@routeless.org', driverHash, 'driver', '+91 94482 77889', 'DRV-KA-9921', null);
  insertUser.run('Ananya Hegde', 'student@routeless.org', studentHash, 'student', '+91 91234 56789', 'RIT-CSE-2024-042', 2);
  insertUser.run('Rahul Gowda', 'rahul@routeless.org', studentHash, 'student', '+91 91234 56790', 'RIT-MECH-2024-019', 4);

  // 2. Rural Routes
  const insertRoute = db.prepare(`
    INSERT INTO routes (route_name, route_code, origin, destination, total_distance_km, estimated_duration_min, waypoints_json, color, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Route 1: Khanapur Rural Corridor (Khanapur Junction -> Kittur Village -> RIT Engineering Campus)
  const r1Waypoints = [
    [15.6320, 74.5150], // Khanapur Bus Depot
    [15.6450, 74.5420], // Malhar Gaon Stop
    [15.6620, 74.5750], // Bidi Panchayat Cross
    [15.6780, 74.6100], // Old Kalu River Bridge (Geofence hazard area nearby)
    [15.6980, 74.6520], // Kittur Fort Cross
    [15.7190, 74.7010], // Alnavar Bypass Junction
    [15.7350, 74.7550], // Kakati Toll Gate
    [15.7520, 74.8100]  // Rural Institute of Technology (RIT Campus)
  ];

  // Route 2: Ghat Hinterland Line (Jamboti Valley -> Belagavi Rural Campus)
  const r2Waypoints = [
    [15.6700, 74.3800], // Jamboti Forest Junction
    [15.6820, 74.4250], // Kanakumbi Ghat Bend
    [15.6950, 74.4700], // Parishwad Rural Stop
    [15.7120, 74.5300], // Halaga Village Cross
    [15.7300, 74.6200], // Desur Rural Station
    [15.7520, 74.8100]  // Rural Institute of Technology (RIT Campus)
  ];

  // Route 3: Eastern Agro Belt (Saundatti Village -> Bailhongal -> RIT Campus)
  const r3Waypoints = [
    [15.7650, 75.1100], // Saundatti Agro Depot
    [15.7820, 74.9900], // Bailhongal Town Bus Stop
    [15.7700, 74.9200], // Nesargi Crossroads
    [15.7600, 74.8500], // Marihal Village Stop
    [15.7520, 74.8100]  // Rural Institute of Technology (RIT Campus)
  ];

  insertRoute.run('Khanapur Rural Corridor', 'RT-101', 'Khanapur Bus Depot', 'RIT Rural Campus', 32.5, 50, JSON.stringify(r1Waypoints), '#00F0FF', 'ACTIVE');
  insertRoute.run('Jamboti Ghat Hinterland', 'RT-102', 'Jamboti Valley Junction', 'RIT Rural Campus', 44.0, 65, JSON.stringify(r2Waypoints), '#10B981', 'ACTIVE');
  insertRoute.run('Eastern Agro Feeder', 'RT-103', 'Saundatti Agro Depot', 'RIT Rural Campus', 38.0, 55, JSON.stringify(r3Waypoints), '#F59E0B', 'ACTIVE');

  // 3. Rural Stops (Pickup points for students)
  const insertStop = db.prepare(`
    INSERT INTO stops (route_id, stop_name, village_name, latitude, longitude, sequence_order, scheduled_time, student_count, landmark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Route 1 Stops
  insertStop.run(1, 'Khanapur Rural Depot', 'Khanapur', 15.6320, 74.5150, 1, '07:15 AM', 8, 'Opposite Milk Union');
  insertStop.run(1, 'Malhar Gaon Shelter', 'Malhar', 15.6450, 74.5420, 2, '07:25 AM', 12, 'Banyan Tree Chawl');
  insertStop.run(1, 'Bidi Panchayat Cross', 'Bidi', 15.6620, 74.5750, 3, '07:35 AM', 9, 'Panchayat Bhavan');
  insertStop.run(1, 'Kittur Fort Junction', 'Kittur', 15.6980, 74.6520, 4, '07:50 AM', 11, 'Kittur Rani Chennamma Circle');
  insertStop.run(1, 'Alnavar Rural Cross', 'Alnavar', 15.7190, 74.7010, 5, '08:05 AM', 6, 'Gramin Bank Stop');
  insertStop.run(1, 'RIT Campus Main Gate', 'Belgaum Rural', 15.7520, 74.8100, 6, '08:25 AM', 0, 'Central College Portico');

  // Route 2 Stops
  insertStop.run(2, 'Jamboti Valley Point', 'Jamboti', 15.6700, 74.3800, 1, '07:00 AM', 7, 'Forest Checkpost');
  insertStop.run(2, 'Parishwad Rural Stop', 'Parishwad', 15.6950, 74.4700, 2, '07:20 AM', 14, 'Near Rural High School');
  insertStop.run(2, 'Desur Village Junction', 'Desur', 15.7300, 74.6200, 3, '07:45 AM', 10, 'Railway Gate Chowk');
  insertStop.run(2, 'RIT Campus Main Gate', 'Belgaum Rural', 15.7520, 74.8100, 4, '08:15 AM', 0, 'Engineering Complex');

  // 4. Buses
  const insertBus = db.prepare(`
    INSERT INTO buses (bus_number, route_id, driver_id, driver_name, driver_phone, capacity, current_occupancy, status, model, plate_number, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBus.run('KA-22-RT-101', 1, 2, 'Ramesh Kulkarni', '+91 94481 22334', 42, 31, 'IN_TRANSIT', 'Tata Starbus Ultra Rural', 'KA-22-F-8812', 4.9);
  insertBus.run('KA-22-RT-102', 1, 3, 'Basavaraj Patil', '+91 94482 77889', 38, 36, 'IN_TRANSIT', 'Ashok Leyland Falcon', 'KA-22-F-4401', 4.7);
  insertBus.run('KA-22-RT-103', 2, 2, 'Sanjay Deshmukh', '+91 94483 11223', 40, 24, 'IN_TRANSIT', 'Eicher Skyline Pro Rural', 'KA-22-F-9104', 4.8);
  insertBus.run('KA-22-RT-104', 3, 3, 'Manjunath Naik', '+91 94484 55667', 42, 18, 'IDLE', 'Force Traveller Rural Shuttle', 'KA-22-F-1288', 4.6);

  // 5. Initial Bus Locations
  const insertLoc = db.prepare(`
    INSERT INTO bus_locations (bus_id, latitude, longitude, speed, heading, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  insertLoc.run(1, 15.6780, 74.6100, 38.5, 45.0, now);
  insertLoc.run(2, 15.6450, 74.5420, 42.0, 52.0, now);
  insertLoc.run(3, 15.6950, 74.4700, 34.0, 68.0, now);
  insertLoc.run(4, 15.7650, 75.1100, 0.0, 0.0, now);

  // 6. Cameras (Inside Cabin & Road View)
  const insertCam = db.prepare(`
    INSERT INTO cameras (bus_id, camera_type, camera_url, connection_status, resolution, last_ping)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertCam.run(1, 'inside_cabin', 'rtsp://internal-gateway.routeless.lan/bus101/cabin', 'ONLINE', '1080p @ 30fps', now);
  insertCam.run(1, 'road_view', 'rtsp://internal-gateway.routeless.lan/bus101/road', 'ONLINE', '1080p @ 30fps', now);
  insertCam.run(2, 'inside_cabin', 'rtsp://internal-gateway.routeless.lan/bus102/cabin', 'ONLINE', '1080p @ 30fps', now);
  insertCam.run(2, 'road_view', 'rtsp://internal-gateway.routeless.lan/bus102/road', 'ONLINE', '1080p @ 30fps', now);
  insertCam.run(3, 'inside_cabin', 'rtsp://internal-gateway.routeless.lan/bus103/cabin', 'ONLINE', '1080p @ 30fps', now);
  insertCam.run(3, 'road_view', 'rtsp://internal-gateway.routeless.lan/bus103/road', 'ONLINE', '1080p @ 30fps', now);
  insertCam.run(4, 'inside_cabin', 'rtsp://internal-gateway.routeless.lan/bus104/cabin', 'STANDBY', '1080p @ 30fps', now);
  insertCam.run(4, 'road_view', 'rtsp://internal-gateway.routeless.lan/bus104/road', 'STANDBY', '1080p @ 30fps', now);

  // 7. Initial Camera Events
  const insertEvent = db.prepare(`
    INSERT INTO camera_events (camera_id, event_type, description, confidence, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertEvent.run(1, 'occupancy_scan', 'Cabin Occupancy: 31/42 seats occupied (73.8%). Normal seating condition.', 0.96, now);
  insertEvent.run(2, 'road_clear', 'Forward road clear. High visibility on SH-31 rural stretch.', 0.98, now);
  insertEvent.run(3, 'overcrowding_warning', 'High passenger density near front exit doors detected.', 0.89, now);

  // 8. Trip History
  const insertTrip = db.prepare(`
    INSERT INTO trip_history (bus_id, start_location, destination, start_time, end_time, trip_status, students_carried)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertTrip.run(1, 'Khanapur Bus Depot', 'RIT Rural Campus', '2026-11-13T07:15:00Z', null, 'IN_TRANSIT', 31);
  insertTrip.run(2, 'Khanapur Bus Depot', 'RIT Rural Campus', '2026-11-13T07:25:00Z', null, 'IN_TRANSIT', 36);
  insertTrip.run(3, 'Jamboti Valley Junction', 'RIT Rural Campus', '2026-11-13T07:00:00Z', null, 'IN_TRANSIT', 24);

  // 9. Student Bookings
  const insertBooking = db.prepare(`
    INSERT INTO student_bookings (student_id, bus_id, route_id, pickup_stop_id, booking_date, seat_number, pass_code, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBooking.run(4, 1, 1, 2, '2026-11-13', '14A', 'RTL-PASS-8891', 'CONFIRMED');
  insertBooking.run(5, 1, 1, 4, '2026-11-13', '08B', 'RTL-PASS-9102', 'CONFIRMED');

  // 10. Alternative Rural Transport Nodes
  const insertAlt = db.prepare(`
    INSERT INTO alternative_transport (hub_name, transport_type, latitude, longitude, contact_number, available_vehicles, village_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertAlt.run('Kittur Panchayat Feeder Stand', 'Shared Rural Shuttle', 15.6990, 74.6540, '+91 98451 00234', 6, 'Kittur');
  insertAlt.run('Bidi Rural E-Rickshaw Hub', 'E-Rickshaw Hub', 15.6630, 74.5760, '+91 98451 55678', 8, 'Bidi');
  insertAlt.run('Khanapur Last-Mile Van Point', 'Panchayat Feeder Van', 15.6330, 74.5170, '+91 98451 99123', 4, 'Khanapur');

  // 11. Emergency Services
  const insertEmerg = db.prepare(`
    INSERT INTO emergency_services (name, service_type, latitude, longitude, emergency_phone, address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertEmerg.run('Kittur Community Health Centre', 'Primary Health Centre', 15.7010, 74.6580, '108 / +91 8288 234108', 'Kittur Main Road, Opp Police Station');
  insertEmerg.run('Khanapur Rural Police Station', 'Police Outpost', 15.6350, 74.5180, '112 / +91 8288 222100', 'Depot Road, Khanapur');
  insertEmerg.run('Highway Rapid Breakdown Towing Unit', 'Highway Breakdown Towing', 15.7250, 74.7200, '+91 94480 99999', 'Kakati Bypass Highway Post');

  // 12. Route Disruptions
  const insertDisrupt = db.prepare(`
    INSERT INTO route_disruptions (route_id, disruption_type, latitude, longitude, description, severity, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertDisrupt.run(1, 'WATERLOGGING', 15.6790, 74.6120, 'Seasonal puddle runoff near Old Kalu Causeway. Heavy vehicles caution advised.', 'MEDIUM', 1);
  insertDisrupt.run(2, 'ROADWORK', 15.6880, 74.4450, 'Single-lane culvert resurfacing in progress. 5-8 min intermittent delay.', 'LOW', 1);

  console.log('Seeding completed successfully!');
}

// Initialize on require
initDatabase();

module.exports = {
  db,
  hashPassword,
  verifyPassword
};
