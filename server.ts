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

  // In-memory IoT Sensor buffer for Soil Moisture & DHT11 readings
  let latestSensorReading = {
    deviceId: "BALIRAJA-ESP8266-01",
    deviceName: "NodeMCU Soil Moisture & DHT11",
    moisture: 52.0,
    temperature: 28.5,
    humidity: 62.0,
    rawAdc: 560,
    timestamp: new Date().toISOString(),
    connectionType: "wifi"
  };

  const sensorHistory: any[] = [latestSensorReading];

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // Firebase IoT Configuration endpoint (Both Realtime DB and Firestore)
  app.get("/api/sensors/firebase-config", (req, res) => {
    res.json({
      success: true,
      projectId: "gen-lang-client-0706599928",
      rtdbUrl: "https://gen-lang-client-0706599928-default-rtdb.firebaseio.com",
      activePath: "/sensorData/farm001",
      firestoreDatabaseId: "ai-studio-167a4e08-a433-48d2-a489-dbf5170057ac",
      collection: "sensorReadings",
      restEndpoint: "https://gen-lang-client-0706599928-default-rtdb.firebaseio.com/sensorData/farm001.json"
    });
  });

  // Direct fetch from user's live Firebase Realtime Database
  app.get("/api/sensors/rtdb/latest", async (req, res) => {
    try {
      const response = await fetch("https://gen-lang-client-0706599928-default-rtdb.firebaseio.com/sensorData.json");
      if (!response.ok) {
        return res.status(502).json({ error: "Failed to fetch from Firebase Realtime DB" });
      }
      const data = await response.json();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // IoT Sensor Ingestion Endpoint (POST by NodeMCU ESP8266, ESP32, Arduino, or Web Serial)
  app.post("/api/sensors/reading", async (req, res) => {
    try {
      const data = req.body || {};
      const moisture = Number(data.moisture ?? data.m ?? 50);
      const temperature = Number(data.temperature ?? data.temp ?? data.t ?? 26.5);
      const humidity = Number(data.humidity ?? data.h ?? 60.0);
      const rawAdc = Number(data.rawAdc ?? data.adc ?? 0);

      const newReading = {
        id: `reading_${Date.now()}`,
        deviceId: data.deviceId || "BALIRAJA-ESP8266-01",
        deviceName: data.deviceName || "Soil Moisture & DHT11 Node",
        moisture: Math.round(moisture * 10) / 10,
        temperature: Math.round(temperature * 10) / 10,
        humidity: Math.round(humidity * 10) / 10,
        rawAdc,
        timestamp: new Date().toISOString(),
        connectionType: data.connectionType || "wifi"
      };

      latestSensorReading = newReading;
      sensorHistory.unshift(newReading);
      if (sensorHistory.length > 100) sensorHistory.pop();

      // Soil moisture status evaluation
      const moistureStatus = moisture < 22 
        ? "CRITICAL_DRY" 
        : moisture < 40 
          ? "LOW_MOISTURE" 
          : moisture <= 70 
            ? "OPTIMAL" 
            : "WATERLOGGED";

      // Fungal disease risk from DHT11 humidity and temperature
      const diseaseRisk = (humidity > 80 && temperature >= 20 && temperature <= 28)
        ? "HIGH"
        : (humidity > 70) ? "MEDIUM" : "LOW";

      // Irrigation calculation in liters
      const waterRequirementLitersPerAcre = moisture < 40 
        ? Math.round((55 - moisture) * 1100) 
        : 0;

      // Asynchronously attempt to sync to Firestore REST API (non-blocking)
      try {
        const firestoreUrl = "https://firestore.googleapis.com/v1/projects/gen-lang-client-0706599928/databases/ai-studio-167a4e08-a433-48d2-a489-dbf5170057ac/documents/sensorReadings";
        fetch(firestoreUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              deviceId: { stringValue: newReading.deviceId },
              deviceName: { stringValue: newReading.deviceName },
              moisture: { doubleValue: newReading.moisture },
              temperature: { doubleValue: newReading.temperature },
              humidity: { doubleValue: newReading.humidity },
              rawAdc: { integerValue: String(newReading.rawAdc) },
              timestamp: { stringValue: newReading.timestamp }
            }
          })
        }).catch(() => {
          // Ignore offline/auth errors in async sync
        });
      } catch (e) {
        // Continue normally
      }

      res.status(200).json({
        success: true,
        message: "Soil moisture and DHT11 reading recorded successfully",
        reading: newReading,
        instantAssessment: {
          moistureStatus,
          diseaseRisk,
          waterRequirementLitersPerAcre,
          irrigationRecommendation: moisture < 25 
            ? "तात्काळ ३ तास ठिबक सिंचन द्या (Immediate Drip Irrigation Needed)"
            : moisture < 40 
              ? "उद्या सकाळी १.५ तास ठिबक द्या (Light Irrigation Needed)"
              : "सध्या पाणी देण्याची गरज नाही (Soil Moisture is Optimal)"
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
