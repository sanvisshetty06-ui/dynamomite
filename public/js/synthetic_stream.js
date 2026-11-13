/**
 * ROUTELESS – Synthetic Camera Stream & Computer Vision Renderer
 * Generates realistic 30 FPS cabin and road streams with AI overlays,
 * dashcam HUDs, and prominent hackathon demo watermarks.
 * WebRTC MediaStream compatible via canvas.captureStream().
 */

class SyntheticCameraFeed {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.busNumber = options.busNumber || 'KA-22-RT-101';
    this.cameraType = options.cameraType || 'inside_cabin'; // 'inside_cabin' or 'road_view'
    this.cameraId = options.cameraId || 1;
    this.showAIOverlays = options.showAIOverlays !== false;
    this.occupancy = options.occupancy || 31;
    this.capacity = options.capacity || 42;
    this.speed = options.speed || 38;
    this.status = options.status || 'IN_TRANSIT';
    this.lat = options.lat || 15.6780;
    this.lng = options.lng || 74.6100;
    this.heading = options.heading || 45;

    this.frameIndex = 0;
    this.roadOffset = 0;
    this.isRunning = false;
    this.animId = null;

    // WebRTC MediaStream
    this.mediaStream = null;
    if (this.canvas.captureStream) {
      try {
        this.mediaStream = this.canvas.captureStream(30);
      } catch (e) {}
    }
  }

  updateMetrics(data) {
    if (data.speed !== undefined) this.speed = data.speed;
    if (data.occupancy !== undefined) this.occupancy = data.occupancy;
    if (data.capacity !== undefined) this.capacity = data.capacity;
    if (data.status !== undefined) this.status = data.status;
    if (data.lat !== undefined) this.lat = data.lat;
    if (data.lng !== undefined) this.lng = data.lng;
    if (data.heading !== undefined) this.heading = data.heading;
    if (data.showAIOverlays !== undefined) this.showAIOverlays = data.showAIOverlays;
  }

  start() {
    this.isRunning = true;
    const loop = () => {
      if (!this.isRunning) return;
      this.draw();
      this.frameIndex++;
      this.animId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    if (this.cameraType === 'inside_cabin') {
      this.drawCabinView(w, h, ctx);
    } else {
      this.drawRoadView(w, h, ctx);
    }

    // Common Overlays: DEMO Watermark & HUD
    this.drawHUD(w, h, ctx);
  }

  drawCabinView(w, h, ctx) {
    // 1. Bus Cabin Interior Background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0B1120');
    grad.addColorStop(1, '#030712');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Bus Roof & Ceiling Panels
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, w, 40);

    // Interior lights
    for (let i = 40; i < w; i += 80) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(i, 8, 30, 6);
    }

    // Center Aisle Perspective
    const aisleTop = w * 0.45;
    const aisleBottom = w * 0.4;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(aisleTop, 40);
    ctx.lineTo(w - aisleTop, 40);
    ctx.lineTo(w - aisleBottom, h);
    ctx.lineTo(aisleBottom, h);
    ctx.closePath();
    ctx.fill();

    // Floor anti-skid grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 60; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(aisleBottom - (y * 0.1), y);
      ctx.lineTo(w - aisleBottom + (y * 0.1), y);
      ctx.stroke();
    }

    // Bus Seats (Left and Right columns)
    const seatColor = '#1E3A8A';
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      const y = 60 + r * 50;
      const seatScale = 0.8 + (r * 0.15);

      // Left double seat
      ctx.fillStyle = seatColor;
      ctx.fillRect(15, y, 70 * seatScale, 30 * seatScale);
      // Right double seat
      ctx.fillRect(w - (15 + 70 * seatScale), y, 70 * seatScale, 30 * seatScale);
    }

    // 2. Passenger Silhouettes (NO FACES - Strict Privacy Silhouette Representation)
    const occ = this.occupancy;
    const maxVisible = Math.min(occ, 16);

    for (let i = 0; i < maxVisible; i++) {
      const isRight = i % 2 === 1;
      const row = Math.floor(i / 2);
      const isStanding = i > 11;

      let px, py, pw, ph;

      if (!isStanding) {
        // Seated passenger silhouette
        pw = 32;
        ph = 42;
        px = isRight ? w - 75 - (row * 6) : 35 + (row * 6);
        py = 55 + row * 45;
      } else {
        // Standing in aisle
        pw = 26;
        ph = 60;
        px = w * 0.45 + ((i % 3) - 1) * 22;
        py = 90 + ((i - 12) * 55);
      }

      // Draw silhouette
      ctx.fillStyle = isStanding ? 'rgba(245, 158, 11, 0.75)' : 'rgba(16, 185, 129, 0.7)';
      // Head (blank oval, zero facial features)
      ctx.beginPath();
      ctx.arc(px + pw / 2, py + 12, 10, 0, Math.PI * 2);
      ctx.fill();
      // Shoulders / Torso
      ctx.beginPath();
      ctx.roundRect(px, py + 22, pw, ph - 22, 6);
      ctx.fill();

      // 3. AI Computer Vision Bounding Box Overlay
      if (this.showAIOverlays) {
        const boxColor = isStanding ? '#FBBF24' : '#10B981';
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px - 4, py - 2, pw + 8, ph + 4);

        // Confidence badge
        ctx.fillStyle = boxColor;
        ctx.fillRect(px - 4, py - 16, pw + 8, 14);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(isStanding ? 'STAND 92%' : 'SEAT 97%', px - 2, py - 5);
      }
    }

    // Emergency or Hazard Overlay in Cabin
    if (this.status === 'EMERGENCY') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('🚨 VEHICLE HALT / EMERGENCY STOPPING DETECTED', 25, 45);
    } else if (this.occupancy >= this.capacity) {
      // Overcrowding banner
      ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.fillRect(w / 2 - 130, 15, 260, 24);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('⚠️ AI ALERT: OVERCROWDING THRESHOLD EXCEEDED', w / 2 - 120, 31);
    }
  }

  drawRoadView(w, h, ctx) {
    // 1. Sky & Horizon
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    skyGrad.addColorStop(0, '#0F172A');
    skyGrad.addColorStop(1, '#1E293B');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.45);

    // Distant rural hills
    ctx.fillStyle = '#111A38';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.45);
    ctx.lineTo(w * 0.25, h * 0.35);
    ctx.lineTo(w * 0.5, h * 0.42);
    ctx.lineTo(w * 0.75, h * 0.32);
    ctx.lineTo(w, h * 0.45);
    ctx.fill();

    // 2. Rural Road Ground & Asphalt
    ctx.fillStyle = '#064E3B'; // roadside rural vegetation
    ctx.fillRect(0, h * 0.45, w, h * 0.55);

    // Road Perspective (vanishing point at horizon)
    const vpX = w * 0.5;
    const vpY = h * 0.45;
    const roadBottomLeft = w * 0.1;
    const roadBottomRight = w * 0.9;

    ctx.fillStyle = '#1E293B'; // asphalt road
    ctx.beginPath();
    ctx.moveTo(vpX - 25, vpY);
    ctx.lineTo(vpX + 25, vpY);
    ctx.lineTo(roadBottomRight, h);
    ctx.lineTo(roadBottomLeft, h);
    ctx.closePath();
    ctx.fill();

    // Road Edge Markings (white lines)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(vpX - 25, vpY);
    ctx.lineTo(roadBottomLeft, h);
    ctx.moveTo(vpX + 25, vpY);
    ctx.lineTo(roadBottomRight, h);
    ctx.stroke();

    // Animated Center Broken Yellow Lane Line
    if (this.speed > 0) {
      this.roadOffset = (this.roadOffset + this.speed * 0.25) % 80;
    }

    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 4;
    for (let d = this.roadOffset; d < h * 0.55; d += 60) {
      const progress = d / (h * 0.55);
      const y = vpY + d;
      const x = vpX;
      const len = 20 + progress * 35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, Math.min(h, y + len));
      ctx.stroke();
    }

    // Distant oncoming vehicle or rural milestone
    const oncomingY = vpY + 50 + (Math.sin(this.frameIndex * 0.03) * 15);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(vpX - 18, oncomingY, 14, 10);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(vpX - 16, oncomingY + 2, 3, 3);
    ctx.fillRect(vpX - 8, oncomingY + 2, 3, 3);

    // AI Computer Vision Road Overlays
    if (this.showAIOverlays) {
      // Lane Boundary overlay
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(w * 0.2, h * 0.5, w * 0.6, h * 0.45);
      ctx.setLineDash([]);

      ctx.fillStyle = '#06B6D4';
      ctx.fillRect(w * 0.2, h * 0.5 - 16, 130, 16);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('ROAD CORRIDOR (SH-31)', w * 0.2 + 4, h * 0.5 - 4);

      // Oncoming obstacle box
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vpX - 25, oncomingY - 5, 28, 22);

      ctx.fillStyle = '#10B981';
      ctx.fillRect(vpX - 25, oncomingY - 20, 75, 14);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('CLEAR: 65m', vpX - 23, oncomingY - 9);
    }
  }

  drawHUD(w, h, ctx) {
    // 1. Mandatory Hackathon Demo Watermark (Prominently Labeled per requirement 2 & 10)
    ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
    ctx.fillRect(10, 10, 240, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('🔴 [DEMO SIMULATED STREAM - HACKATHON MODE]', 16, 24);

    // 2. Zero-Facial-Recognition Privacy Policy Badge
    if (this.cameraType === 'inside_cabin') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.fillRect(w - 230, 10, 220, 20);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('🛡️ PRIVACY: ZERO FACIAL RECOGNITION', w - 224, 23);
    }

    // 3. Dashcam Bottom Telemetry HUD
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(10, h - 34, w - 20, 26);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 10px monospace';

    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const speedStr = `${Math.round(this.speed)} KM/H`;
    const locStr = `GPS: ${this.lat.toFixed(4)}°N, ${this.lng.toFixed(4)}°E`;
    const busStr = `${this.busNumber} | CAM-${this.cameraId} (${this.cameraType === 'inside_cabin' ? 'CABIN' : 'ROAD'})`;

    ctx.fillText(busStr, 20, h - 17);
    ctx.fillStyle = '#10B981';
    ctx.fillText(locStr, w * 0.45, h - 17);
    ctx.fillStyle = '#FBBF24';
    ctx.fillText(speedStr, w - 175, h - 17);
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(timeStr, w - 105, h - 17);
  }

  captureSnapshot() {
    return this.canvas.toDataURL('image/jpeg', 0.9);
  }
}

window.SyntheticCameraFeed = SyntheticCameraFeed;
