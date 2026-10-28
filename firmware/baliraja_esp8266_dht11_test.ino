/*
 * =========================================================================================
 * BALIRAJA SMART AGRICULTURE — NODE MCU ESP8266 + SOIL MOISTURE + DHT11
 * =========================================================================================
 * 
 * Target Board: NodeMCU ESP8266 (ESP-12E) / Wemos D1 Mini
 * Sensors:
 *   1. 2-Pin Resistive Soil Moisture Sensor (with LM393 comparator board)
 *   2. DHT11 Temperature & Relative Humidity Sensor
 * 
 * Hardware Wiring:
 *   - 2-Pin Probe        -> 2-pin header on LM393 comparator board
 *   - LM393 VCC          -> NodeMCU 3V3 (3.3V)
 *   - LM393 GND          -> NodeMCU GND
 *   - LM393 AO (Analog)  -> NodeMCU Pin A0 (ADC0, 0-1024)
 *   - DHT11 VCC          -> NodeMCU 3V3 (3.3V)
 *   - DHT11 GND          -> NodeMCU GND
 *   - DHT11 DATA         -> NodeMCU Pin D2 (GPIO 4)
 *
 * Required Arduino IDE Libraries:
 *   1. "DHT sensor library" by Adafruit
 *   2. "Adafruit Unified Sensor" by Adafruit
 *   3. "ArduinoJson" by Benoit Blanchon (Version 6 or 7)
 * =========================================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ======================== 1. WI-FI & FIREBASE CONFIGURATION ===================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // Your Wi-Fi router / Mobile hotspot name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // Your Wi-Fi password

// Direct Firebase Realtime Database REST URL:
const char* FIREBASE_RTDB_URL = "https://gen-lang-client-0706599928-default-rtdb.firebaseio.com/sensorData/farm001.json";

// Optional: Baliraja Local Server URL (if running locally):
const char* LOCAL_BACKEND_URL = "http://192.168.1.100:3000/api/sensors/reading";

const char* DEVICE_ID   = "farm001";
const char* DEVICE_NAME = "NodeMCU Soil Moisture & DHT11";

// ======================== 2. PIN DEFINITIONS & CALIBRATION ====================
#define SOIL_PIN A0   // Analog Pin A0 for Resistive Soil Moisture Probe
#define DHT_PIN D2    // Digital Pin D2 (GPIO 4) for DHT11
#define DHTTYPE DHT11

// Soil Calibration Values (NodeMCU 10-bit ADC: 0 - 1024)
// In Dry Air: Raw ADC is High (~ 900 - 1024)
// In Wet Soil / Water: Raw ADC is Low (~ 250 - 450)
const int AIR_VALUE = 950;
const int WATER_VALUE = 320;

// Telemetry interval (send reading every 5 seconds)
const unsigned long INTERVAL_MS = 5000;
unsigned long lastSendTime = 0;

DHT dht(DHT_PIN, DHTTYPE);

// ======================== 3. WI-FI CONNECT & RECONNECT ========================
void checkWiFiConnection() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("\n[WIFI] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 10000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected successfully!");
    Serial.print("[WIFI] NodeMCU IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WIFI] Signal (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n[WIFI] Connection failed. Retrying in next loop...");
  }
}

// ======================== 4. READ RESISTIVE SOIL MOISTURE =====================
float readSoilMoisture(int &rawAdcOut) {
  long sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += analogRead(SOIL_PIN);
    delay(10);
  }
  int raw = sum / 5;
  rawAdcOut = raw;

  // Inverse mapping: higher resistance = drier soil
  float percentage = ((float)(AIR_VALUE - raw) / (AIR_VALUE - WATER_VALUE)) * 100.0;
  return constrain(percentage, 0.0, 100.0);
}

// ======================== 5. SEND TELEMETRY VIA HTTP/HTTPS POST ===============
void sendTelemetryToDashboard(float moisture, float temp, float humidity, int rawAdc) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi is disconnected, skipping send.");
    return;
  }

  // Format matches Firebase Realtime Database schema:
  // {"humidity": 41.0, "soilMoisturePercent": 50, "soilRaw": 514, "temperature": 31.8, "updatedAt": 1793210529750}
  StaticJsonDocument<256> doc;
  doc["humidity"]            = round(humidity * 10.0) / 10.0;
  doc["soilMoisturePercent"] = (int)round(moisture);
  doc["soilRaw"]             = rawAdc;
  doc["temperature"]         = round(temp * 10.0) / 10.0;
  doc["updatedAt"]           = millis();

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("[FIREBASE RTDB] Sending PATCH to Firebase Cloud:");
  Serial.println(jsonPayload);

  WiFiClientSecure secureClient;
  secureClient.setInsecure(); // Bypass SSL fingerprint check on ESP8266 BearSSL
  secureClient.setTimeout(8000);

  HTTPClient https;
  if (https.begin(secureClient, FIREBASE_RTDB_URL)) {
    https.addHeader("Content-Type", "application/json");
    https.setTimeout(8000);
    int httpCode = https.PATCH(jsonPayload);

    if (httpCode > 0) {
      Serial.printf("[FIREBASE RTDB] Success response code: %d\n", httpCode);
      if (httpCode == 200 || httpCode == 201) {
        String response = https.getString();
        Serial.println("[FIREBASE RTDB] Realtime DB Response:\n" + response);
      }
    } else {
      Serial.printf("[FIREBASE RTDB] PATCH failed, error: %s\n", https.errorToString(httpCode).c_str());
    }
    https.end();
  } else {
    Serial.println("[FIREBASE RTDB] Unable to establish HTTPS connection");
  }
}

// ======================== 6. SETUP ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("   BALIRAJA SMART AGRI — SOIL MOISTURE + DHT11 NODE");
  Serial.println("   Device ID: " + String(DEVICE_ID));
  Serial.println("========================================================");

  // Initialize DHT11 sensor and Soil Pin
  dht.begin();
  pinMode(SOIL_PIN, INPUT);
  Serial.println("[INIT] DHT11 sensor initialized on NodeMCU Pin D2 (GPIO 4)");
  Serial.println("[INIT] Resistive Soil Moisture sensor on Pin A0 (ADC0)");

  // Connect to Wi-Fi
  checkWiFiConnection();

  Serial.println("[SETUP] Setup complete. Streaming data every 5 seconds...\n");
}

// ======================== 7. MAIN LOOP (5s INTERVAL) ==========================
void loop() {
  // Ensure Wi-Fi stays connected
  if (WiFi.status() != WL_CONNECTED) {
    checkWiFiConnection();
  }

  unsigned long currentMillis = millis();

  // Send reading every 5 seconds (5000 ms)
  if (currentMillis - lastSendTime >= INTERVAL_MS) {
    lastSendTime = currentMillis;

    // 1. Read temperature & humidity from DHT11
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature(); // Celsius

    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("[WARN] Failed to read from DHT11! Check sensor jumper wires.");
      temperature = 26.5; 
      humidity = 60.0;
    }

    // 2. Read soil moisture from analog pin A0
    int rawAdc = 0;
    float moisture = readSoilMoisture(rawAdc);

    // Print to Serial Monitor
    Serial.println("--------------------------------------------------------");
    Serial.printf("🌱 Soil Moisture : %.1f %% (Raw ADC: %d)\n", moisture, rawAdc);
    Serial.printf("🌡️ Temperature   : %.1f °C\n", temperature);
    Serial.printf("💨 Air Humidity  : %.1f %%\n", humidity);

    // Send HTTP/HTTPS POST to Baliraja dashboard
    sendTelemetryToDashboard(moisture, temperature, humidity, rawAdc);
  }
}
