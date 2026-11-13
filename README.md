# 🚀 ROUTELESS – THE LAST MILE
### Real-Time Intelligent Rural Transportation Platform

[![Node.js](https://img.shields.io/badge/Node.js-v22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-node:sqlite-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Supabase](https://img.shields.io/badge/Supabase%20%2F%20PostgreSQL-Compatible-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

---

## 🌟 Executive Summary

**ROUTELESS – THE LAST MILE** is an AI-powered, real-time rural transportation and safety monitoring platform designed to eliminate rural student commute dropouts, prevent bus overcrowding, provide live GPS tracking across remote village stops, and safeguard student transit with computer vision camera analysis and automated emergency rescue coordination.

Built for both **production deployment** and **high-impact hackathon evaluation**, ROUTELESS features a realistic **Demonstration Engine** that provides live moving buses, synthetic camera feeds with AI overlays, and instant 1-click emergency scenario injection.

---

## 🛠️ Complete Feature Matrix

### 1. 📍 Live GPS Bus Tracking
- **Interactive Live Map**: Leaflet and OpenStreetMap rendering full rural corridors and village junctions.
- **Real-Time Coordinates**: High-frequency updates via Socket.IO.
- **Dynamic Telemetry**: Bus number, driver profile, current speed (km/h), live heading arrow, route progress %, and dynamic ETA.
- **Driver Geolocation Sharing**: Browser Geolocation API (`navigator.geolocation.watchPosition`) integration with a prominent **START TRIP** activation button.
- **Traffic & Route Disruptions**: Active alerts for seasonal causeway flooding, single-lane bridge repairs, and landslide debris.

### 2. 📹 Live Camera Monitoring
- **Dedicated Camera Monitoring Dashboard**: Multi-stream grid supporting 2x2, 3x3, and single spotlight view.
- **Dual Camera Angles**:
  - **Inside Cabin View**: Passenger seating, aisle density, doorway safety.
  - **Road Dashcam View**: Windshield perspective, road corridor lanes, distance clearance.
- **Access Controls**: Toggle cameras, mute audio, capture and download timestamped frame snapshots, switch to full-screen spotlight.
- **Secure Media Gateway**: Masks RTSP/IP camera credentials; camera passwords and internal URLs are never exposed to the frontend.
- **Clear Demo Feed Labeling**: All synthetic demonstration feeds are explicitly watermarked with `[DEMO SIMULATED STREAM - HACKATHON MODE]`.

### 3. 🧠 AI Camera Analysis & Safety Compliance
- **Overcrowding Detection**: Continuous occupancy vs. capacity analysis; triggers visual and audible alerts when occupancy exceeds 90%.
- **Passenger Occupancy Estimation**: Real-time counter of seated vs. standing passengers and available seats.
- **Unsafe Situation Detection**:
  - Door ajar / footboard riding while bus in motion.
  - Driver fatigue and distraction detection.
  - Sudden deceleration / erratic braking near rural crossings.
- **Restricted Geofence Hazard Radar**: Proximity alerts for dangerous rural areas (e.g., Old Kalu River Causeway flood risk, Kanakumbi Ghat hairpin descent, Desur level crossing).
- **🛡️ Zero Facial Recognition Architecture**: Explicit privacy-by-design policy. Passenger estimation relies strictly on anonymous silhouette contour analysis; no facial recognition or student biometric profiles are captured or stored.

### 4. 📊 Live Student Transportation Dashboard
- Real-time KPI board updating on every socket tick:
  1. **Total Active Buses** (4 buses in fleet)
  2. **Buses Currently Moving** (3 in transit)
  3. **Students Currently Travelling** (109 students onboard)
  4. **Available Seats** (51 open seats)
  5. **Delayed Buses** (0)
  6. **Cancelled Routes** (0)
  7. **Active Camera Feeds** (8 streams)
  8. **Emergency Alerts** (0 active / real-time trigger)

### 5. 🗺️ Full-Screen Interactive Live Map
- Fullscreen Leaflet map with dark-mode contrast styling.
- Distinct color-coded status pins:
  - 🟢 **Green**: On Time / Smooth transit (38-45 km/h)
  - 🟡 **Amber**: Delayed / Rural road obstacle
  - 🔴 **Red**: Emergency SOS / Breakdown (pulsing halo)
  - ⚪ **Gray**: Idle / At Depot
- Detailed click popup with bus specifications, driver phone, speed gauge, occupancy bar, ETA, and 1-click "Open Live Camera" jump button.
- Layer overlays: Polylines with route colors, village pickup points with student counts, college destinations, alternative transport hubs (e-rickshaws, shared shuttles), and emergency services (clinics, police posts).

### 6. 🚨 Emergency Alert System & Automated Rescue Coordinator
- Immediate audible chime (Web Audio API) and visual pulsating banner when an emergency is triggered.
- **Automated Nearest Rescue Bus Recommendation**:
  - Pinpoints the affected vehicle's exact GPS coordinates and landmark.
  - Instantly searches the fleet for the nearest alternative bus with vacant seats.
  - Calculates distance (km) and intercept ETA (minutes).
  - One-click "Dispatch Rescue Bus" button.
- **Suggested Detour Route**: Auto-generates bypass route around the obstruction or flood zone.
- **Driver SOS Trigger**: Prominent emergency button with incident selector (Breakdown, Flood, Medical, Security).

### 7. 🗄️ Database Integration & Schema
All 5 required tables integrated with ACID compliance, plus 8 core rural transit tables:
1. `BUS_LOCATIONS` (`id`, `bus_id`, `latitude`, `longitude`, `speed`, `heading`, `updated_at`)
2. `CAMERAS` (`id`, `bus_id`, `camera_type`, `camera_url`, `connection_status`, `resolution`, `last_ping`)
3. `CAMERA_EVENTS` (`id`, `camera_id`, `event_type`, `description`, `confidence`, `timestamp`)
4. `BUS_ALERTS` (`id`, `bus_id`, `alert_type`, `location`, `description`, `status`, `created_at`, `resolved_at`)
5. `TRIP_HISTORY` (`id`, `bus_id`, `start_location`, `destination`, `start_time`, `end_time`, `trip_status`, `students_carried`)
6. `USERS` (`id`, `name`, `email`, `password_hash`, `role`, `phone`, `college_id_card`, `pickup_stop_id`)
7. `BUSES` (`id`, `bus_number`, `route_id`, `driver_id`, `driver_name`, `driver_phone`, `capacity`, `current_occupancy`, `status`, `model`)
8. `ROUTES` (`id`, `route_name`, `route_code`, `origin`, `destination`, `total_distance_km`, `estimated_duration_min`, `waypoints_json`)
9. `STOPS` (`id`, `route_id`, `stop_name`, `village_name`, `latitude`, `longitude`, `sequence_order`, `scheduled_time`, `student_count`)
10. `STUDENT_BOOKINGS` (`id`, `student_id`, `bus_id`, `route_id`, `pickup_stop_id`, `booking_date`, `seat_number`, `pass_code`, `status`)
11. `ALTERNATIVE_TRANSPORT` (`id`, `hub_name`, `transport_type`, `latitude`, `longitude`, `available_vehicles`)
12. `EMERGENCY_SERVICES` (`id`, `name`, `service_type`, `latitude`, `longitude`, `emergency_phone`)
13. `ROUTE_DISRUPTIONS` (`id`, `route_id`, `disruption_type`, `latitude`, `longitude`, `description`, `severity`, `is_active`)

*A complete, production-ready PostgreSQL / Supabase migration script is provided at `database/supabase_schema.sql`.*

### 8. 🎨 3 Dedicated User Role Interfaces
1. **Student Portal**:
   - "My Next Bus" Hero Card with live ETA countdown clock.
   - First-Mile Rural Pickup Point guidance (village shelter, landmark, walking distance).
   - Digital Student Bus Pass Card with graphic QR code, seat assignment, and unique pass code.
   - Student Safety SOS & delay notification button.
2. **Driver Cockpit**:
   - Digital Speedometer (km/h) and trip duration timer.
   - Large **START TRIP / END TRIP** button with Browser Geolocation API sharing.
   - Route waypoints checklist with 1-click stop completion checkmarks.
   - Student passenger manifest with boarding verification.
   - Large **EMERGENCY SOS** button with incident categorization.
   - In-cabin occupancy and door lock safety indicator.
3. **Transport Administrator Command Center**:
   - 8 Live KPI telemetry cards.
   - Fullscreen Fleet Map with multi-layer overlays.
   - Live Camera Monitoring Grid with AI overlay toggles and snapshot download.
   - AI Camera Analysis Center with overcrowding thresholds and hazard feed.
   - Emergency Alert Dispatch & Rescue Bus Coordinator.
   - Fleet & Rural Route Directory.
   - Hackathon Demo Control Center.

### 9. 🔒 Security & Privacy
- Password hashing with Node.js cryptographic `scrypt`.
- Role-based authorization middleware (`requireRole('admin')`, `requireRole('driver')`).
- Camera streams and `/api/cameras` routes restricted strictly to authorized administrators.
- RTSP credentials and internal camera URLs completely sanitized.

### 10. 🎮 Hackathon Demonstration Engine
- **Master DEMO MODE Switch**: Seamlessly toggle between simulated fleet dynamics and manual device GPS mode.
- **1-Click Instant Incident Injectors**:
  - 🚨 *Trigger Bus-102 Breakdown*: Simulates hydraulic failure, stops bus, sounds alarm, notifies admin, and locates rescue bus.
  - 👥 *Simulate Overcrowding*: Simulates student influx on Bus-101 (44/42 passengers) with AI doorway hazard alert.
  - 🛰️ *Simulate Geofence Alert*: Simulates Bus-101 approaching the Old Kalu River Causeway flood risk zone.
  - 🚪 *Trigger Door Hazard*: Simulates exit door open while bus is in motion.
  - 😴 *Trigger Driver Fatigue*: Simulates driver cabin drowsiness alert.
  - 🟢 *Resolve All Incidents*: Instantly clears active emergencies and restores fleet to normal.

---

## 🔑 Hackathon 1-Click Demo Accounts

Use the **⚡ Quick Switch Demo Account** dropdown in the top navigation bar, or log in manually:

| Role | Name | Email | Password | Access Details |
| :--- | :--- | :--- | :--- | :--- |
| **Transport Administrator** | Priya Sharma | `admin@routeless.org` | `admin123` | Full Fleet Map, Camera Grid, AI Analytics, Emergency Dispatch |
| **Driver** | Ramesh Kulkarni | `driver.ramesh@routeless.org` | `driver123` | Driver Cockpit, Start Trip, Live GPS, SOS Trigger, Passenger Manifest |
| **Student** | Ananya Hegde | `student@routeless.org` | `student123` | "My Next Bus", Live ETA Countdown, Digital QR Pass, First-Mile Guide |

---

## 🚀 How to Run the Application

### 1. Open Terminal in the Project Directory
```powershell
cd C:\Users\Sanvi\.gemini\antigravity\scratch\routeless
```

### 2. Start the Server
```powershell
node server.js
```
*(Or `npm start`)*

### 3. Open in Browser
Visit the URL displayed in the terminal:
👉 **`http://localhost:5000`** *(or automatic fallback port if 5000 is occupied)*

---

## 📂 Project Directory Structure

```
routeless/
├── database/
│   ├── database.js               # Native SQLite database engine, tables & seed data
│   ├── routeless.db              # SQLite relational database file
│   └── supabase_schema.sql       # PostgreSQL / Supabase migration schema
├── middleware/
│   └── auth.js                   # Scrypt token authentication & camera access control
├── routes/
│   ├── auth.js                   # Login, register, demo users endpoint
│   ├── buses.js                  # Fleet listing, bus details, status updates
│   ├── routes.js                 # Rural corridors, village stops, disruptions
│   ├── tracking.js               # GPS coordinates, driver location sharing
│   ├── cameras.js                # Administrator camera gateway & event stream
│   ├── ai_analysis.js            # Occupancy estimation, hazard detection, geofences
│   ├── alerts.js                 # Emergency alerts, rescue bus coordinator, SOS
│   ├── bookings.js               # Student seat booking, digital pass, manifest
│   └── demo.js                   # Demonstration mode toggle & incident injector
├── services/
│   ├── simulation.js             # Fleet simulation, waypoint interpolation, geofencing
│   ├── ai_vision.js              # Computer vision silhouette detection & hazard analytics
│   └── camera_gateway.js         # Sanitized media gateway (WebRTC & RTSP proxy)
├── public/
│   ├── index.html                # Single-page application entry point
│   ├── css/
│   │   └── style.css             # Cyber-cyan, navy & emerald design system
│   ├── js/
│   │   ├── app.js                # Root React component & Socket.IO client
│   │   ├── synthetic_stream.js   # 30 FPS synthetic canvas & WebRTC stream generator
│   │   └── components/
│   │       ├── Navbar.js         # Role switcher & demo toggle header
│   │       ├── KPICards.js       # 8 real-time transit telemetry metrics
│   │       ├── LiveMap.js        # Full-screen interactive Leaflet map
│   │       ├── CameraGrid.js     # Multi-stream camera monitoring dashboard
│   │       ├── AIAnalysisView.js # AI occupancy gauge & hazard feed
│   │       ├── EmergencyCenter.js# Emergency dispatch & rescue bus coordinator
│   │       ├── DriverView.js     # Driver cockpit, START TRIP, SOS & manifest
│   │       ├── StudentView.js    # "My Next Bus", ETA countdown & digital pass
│   │       ├── FleetDirectory.js # Bus records & rural timetable directory
│   │       └── DemoPanel.js      # Hackathon demonstration control center
│   └── vendor/                   # 100% offline standalone vendor assets
│       ├── react.production.min.js
│       ├── react-dom.production.min.js
│       ├── babel.min.js
│       ├── leaflet.js
│       ├── leaflet.css
│       └── images/
├── package.json                  # Dependencies & start scripts
└── README.md                     # Comprehensive project documentation
```

---

## 🏆 Hackathon Evaluation Highlights
- **100% End-to-End Functional**: Frontend, backend, database, and real-time Socket.IO are fully connected.
- **Zero Cloud or Network Dependency**: Operates 100% offline with pre-packaged vendor assets and Node native SQLite.
- **Ethical AI & Privacy**: Strict zero-facial-recognition architecture preserving student dignity and privacy.
- **Automated Emergency Rescue**: Not just an alert flag, but an intelligent rescue coordinator that identifies the nearest available alternative bus with vacant seats and distance ETA.
