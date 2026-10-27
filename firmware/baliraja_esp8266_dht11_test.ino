/*
 * =========================================================================================
 * BALIRAJA SMART AGRICULTURE — ESP8266 + DHT11 QUICK TEST FIRMWARE
 * =========================================================================================
 * 
 * Target Board: NodeMCU ESP8266 / Wemos D1 Mini / ESP-12E
 * Sensor: DHT11 (Temperature & Relative Humidity)
 * 
 * Hardware Wiring:
 *   - DHT11 VCC   -> NodeMCU 3V3 (3.3V)
 *   - DHT11 GND   -> NodeMCU GND
 *   - DHT11 DATA  -> NodeMCU Pin D2 (GPIO 4) or D4 (GPIO 2)
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
#include <ArduinoJson.h>
#include <DHT.h>

// ======================== WI-FI & BACKEND CONFIGURATION ========================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // Your Wi-Fi router / Mobile hotspot name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // Your Wi-Fi password

// Baliraja API Endpoint URL:
// - If testing with laptop running Node.js / Spring Boot on same Wi-Fi:
//   "http://192.168.1.xxx:3000/api/sensors/reading" OR "http://192.168.1.xxx:8080/api/sensors/reading"
// - If testing with deployed Cloud URL:
//   "https://ais-dev-6fog4lrxnmwuzhs73bqwqc-311565367753.asia-southeast1.run.app/api/sensors/reading"
const char* BACKEND_SERVER_URL = "http://192.168.1.100:3000/api/sensors/reading";

const char* DEVICE_ID   = "BALIRAJA-ESP8266-01";
const char* DEVICE_NAME = "NodeMCU DHT11 Test Node";

// ======================== PIN DEFINITIONS ====================================
// On NodeMCU: Pin D2 = GPIO 4, Pin D4 = GPIO 2
#define DHT_PIN D2 
#define DHTTYPE DHT11

// Telemetry interval (send reading every 5 seconds)
const unsigned long INTERVAL_MS = 5000;
unsigned long lastSendTime = 0;

// Initialize DHT
DHT dht(DHT_PIN, DHTTYPE);

// ======================== WI-FI CONNECT & RECONNECT ==========================
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
    Serial.println("\n[WIFI] Connection failed. Will retry in next loop.");
  }
}

// ======================== SEND TELEMETRY VIA HTTP POST =======================
void sendTelemetryToDashboard(float temp, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi is disconnected, skipping send.");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  http.begin(client, BACKEND_SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"]    = DEVICE_ID;
  doc["deviceName"]  = DEVICE_NAME;
  doc["temperature"] = round(temp * 10.0) / 10.0;
  doc["humidity"]    = round(humidity * 10.0) / 10.0;
  
  // Test defaults for dashboard moisture & NPK display
  doc["moisture"]    = 52.0; // Simulated optimal field moisture for dashboard preview
  doc["nitrogen"]    = 55.0;
  doc["phosphorus"]  = 28.0;
  doc["potassium"]   = 42.0;
  doc["ph"]          = 6.8;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("[HTTP] Sending POST JSON to Baliraja Dashboard:");
  Serial.println(jsonPayload);

  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    Serial.printf("[HTTP] Success response code: %d\n", httpCode);
    if (httpCode == 200 || httpCode == 201) {
      String response = http.getString();
      Serial.println("[HTTP] Dashboard Response:\n" + response);
    }
  } else {
    Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ======================== SETUP ==============================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("   BALIRAJA SMART AGRI — ESP8266 + DHT11 TEST NODE");
  Serial.println("   Device ID: " + String(DEVICE_ID));
  Serial.println("========================================================");

  // Initialize DHT11 sensor
  dht.begin();
  Serial.println("[INIT] DHT11 sensor initialized on NodeMCU Pin D2 (GPIO 4)");

  // Connect to Wi-Fi
  checkWiFiConnection();

  Serial.println("[SETUP] Setup complete. Streaming data every 5 seconds...\n");
}

// ======================== LOOP ===============================================
void loop() {
  // Ensure Wi-Fi stays connected
  if (WiFi.status() != WL_CONNECTED) {
    checkWiFiConnection();
  }

  unsigned long currentMillis = millis();

  // Send reading every 5 seconds (5000 ms)
  if (currentMillis - lastSendTime >= INTERVAL_MS) {
    lastSendTime = currentMillis;

    // Read temperature & humidity from DHT11
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature(); // Celsius

    // Handle read errors
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("[WARN] Failed to read from DHT11! Check sensor jumper wires.");
      temperature = 26.5; // Fallback for testing
      humidity = 60.0;
    }

    // Print to Serial Monitor
    Serial.println("--------------------------------------------------------");
    Serial.printf("🌡️ Temperature : %.1f °C\n", temperature);
    Serial.printf("💨 Air Humidity: %.1f %%\n", humidity);

    // Send HTTP POST to Baliraja dashboard
    sendTelemetryToDashboard(temperature, humidity);
  }
}
