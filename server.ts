import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory IoT Sensor buffer for NPK and Soil Moisture readings
  let latestSensorReading = {
    deviceId: "BALIRAJA-ESP32-01",
    deviceName: "Main Plot (Nashik Black Clay Loam)",
    nitrogen: 55,
    phosphorus: 28,
    potassium: 42,
    moisture: 52,
    ph: 6.8,
    temperature: 26.5,
    ec: 410,
    battery: 92,
    timestamp: new Date().toISOString(),
    connectionType: "wifi"
  };

  const sensorHistory: any[] = [latestSensorReading];

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // IoT Sensor Ingestion Endpoint (POST by ESP32, Arduino, NodeMCU, LoRa gateway, or Web Serial)
  app.post("/api/sensors/reading", (req, res) => {
    try {
      const data = req.body || {};
      const newReading = {
        id: `reading_${Date.now()}`,
        deviceId: data.deviceId || "ESP32-SOIL-PROBE",
        deviceName: data.deviceName || "Soil Sensor Node",
        nitrogen: Number(data.nitrogen ?? data.n ?? 50),
        phosphorus: Number(data.phosphorus ?? data.p ?? 25),
        potassium: Number(data.potassium ?? data.k ?? 40),
        moisture: Number(data.moisture ?? data.m ?? 50),
        ph: Number(data.ph ?? 6.8),
        temperature: Number(data.temperature ?? data.temp ?? 26.5),
        ec: Number(data.ec ?? 400),
        battery: Number(data.battery ?? 95),
        timestamp: new Date().toISOString(),
        connectionType: data.connectionType || "wifi"
      };

      latestSensorReading = newReading;
      sensorHistory.unshift(newReading);
      if (sensorHistory.length > 100) sensorHistory.pop();

      // Quick moisture & NPK calculation
      const moistureStatus = newReading.moisture < 22 
        ? "CRITICAL_DRY" 
        : newReading.moisture < 40 
          ? "LOW_MOISTURE" 
          : newReading.moisture <= 70 
            ? "OPTIMAL" 
            : "WATERLOGGED";

      res.status(200).json({
        success: true,
        message: "Sensor reading received successfully",
        reading: newReading,
        instantAssessment: {
          moistureStatus,
          soilHealthScore: Math.round(
            (newReading.moisture >= 45 && newReading.moisture <= 68 ? 95 : 60) * 0.35 +
            (newReading.ph >= 6.5 && newReading.ph <= 7.5 ? 95 : 65) * 0.25 +
            (newReading.nitrogen >= 40 && newReading.nitrogen <= 75 ? 90 : 60) * 0.40
          )
        }
      });
    } catch (error: any) {
      console.error("Error ingesting sensor reading:", error);
      res.status(400).json({ error: "Invalid sensor payload", details: error.message });
    }
  });

  // Get Latest Sensor Reading
  app.get("/api/sensors/latest", (req, res) => {
    res.json({ success: true, reading: latestSensorReading });
  });

  // Get Sensor Telemetry History
  app.get("/api/sensors/history", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    res.json({ success: true, history: sensorHistory.slice(0, limit) });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
