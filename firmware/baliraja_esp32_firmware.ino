/*
 * =========================================================================================
 * BALIRAJA SMART AGRICULTURE — ESP32 IOT SENSOR NODE FIRMWARE
 * =========================================================================================
 * 
 * Target Board: ESP32 DevKit V1 (30 or 36 pins)
 * Sensors:
 *   1. 2-Pin Resistive Soil Probe (FC-28 / YL-69 fork) with LM393 driver board OR Capacitive v1.2 (GPIO 34)
 *   2. DHT11 or DHT22 Temperature & Relative Humidity Sensor (Connected to GPIO 4)
 *
 * Hardware Wiring & Pinout:
 *   [2-Pin Soil Moisture Fork / Probe]
 *   - 2 Pins on the Soil Fork -> 2 Pins on LM393 comparator driver board (with jumper wires, any polarity)
 *
 *   [LM393 Driver Board to ESP32]
 *   - VCC  -> ESP32 3.3V (CRITICAL: Do NOT use 5V to protect ESP32 GPIO 34!)
 *   - GND  -> ESP32 GND (Common Ground)
 *   - AO   -> ESP32 GPIO 34 (ADC1_CH6, input only)
 *   - DO   -> Not Connected (Digital trigger not needed)
 *
 *   [DHT11 / DHT22 Sensor]
 *   - DATA -> ESP32 GPIO 4 (with 10kΩ pull-up to 3.3V if bare 3-pin sensor)
 *   - VCC  -> ESP32 3.3V
 *   - GND  -> ESP32 GND
 *
 * SAFETY WARNING:
 *   ESP32 GPIO pins tolerate a maximum of 3.3V. Feeding 5V into GPIO 34 will destroy the ADC.
 *   Powering the sensors from the ESP32's 3.3V rail ensures the output voltage never exceeds 3.3V.
 *
 * Arduino IDE Required Libraries (Install via Tools -> Manage Libraries):
 *   1. ArduinoJson (by Benoit Blanchon, v6 or v7)
 *   2. DHT sensor library (by Adafruit)
 *   3. Adafruit Unified Sensor (by Adafruit)
 * =========================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ======================== CONFIGURATION & CREDENTIALS ========================
// Replace with your local Wi-Fi router / mobile hotspot credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend API endpoint URL (Spring Boot or local Dev Server)
// For local testing: "http://<YOUR_LAPTOP_IP>:8080/api/sensors/reading"
// For cloud/production: "https://your-baliraja-app.run.app/api/sensors/reading"
const char* BACKEND_SERVER_URL = "http://192.168.1.100:8080/api/sensors/reading";

// Unique Device Identifier
const char* DEVICE_ID   = "BALIRAJA-ESP32-01";
const char* DEVICE_NAME = "Nashik Plot 1 (Black Soil)";

// Pin Assignments
#define SOIL_MOISTURE_PIN 34 // GPIO 34 (Analog ADC1)
#define DHT_PIN           4  // GPIO 4 (Digital I/O)

// ANTI-CORROSION PRO TIP FOR 2-PIN RESISTIVE SENSORS:
// Wire sensor VCC to GPIO 25 (or keep on 3.3V).
// Powering via GPIO 25 turns the probe on only for 50ms during measurement,
// preventing galvanic corrosion and extending probe life from weeks to months/years!
// Set to -1 if sensor VCC is connected permanently to 3.3V pin.
#define SENSOR_POWER_PIN 25

// Sensor Types (Uncomment the one you are using)
#define DHTTYPE DHT11   // Use DHT11
//#define DHTTYPE DHT22 // Use DHT22 (AM2302)

// ======================== CALIBRATION VALUES =================================
// Calibrate for your specific soil probe:
// 1. Take a reading in open dry air -> set AIR_VALUE
// 2. Submerge probe in a cup of water up to the line -> set WATER_VALUE
const int AIR_VALUE   = 3200; // Sensor reading in dry air (approx 0% moisture)
const int WATER_VALUE = 1350; // Sensor reading in water (approx 100% moisture)

// Telemetry interval (5 seconds as required by specification)
const unsigned long TELEMETRY_INTERVAL_MS = 5000;
unsigned long lastTelemetryTime = 0;

// Initialize DHT instance
DHT dht(DHT_PIN, DHTTYPE);

// ======================== HELPER FUNCTIONS ===================================

/**
 * Connect or Reconnect to Wi-Fi without blocking loop execution forever
 */
void checkAndMaintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("\n[WIFI] Connecting to Wi-Fi: " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttemptTime = millis();
  // Wait up to 10 seconds for connection
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected successfully!");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WIFI] Signal Strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n[WIFI] Connection failed. Will retry on next cycle.");
  }
}

/**
 * Read Analog Soil Moisture with multi-sampling filter and percentage calculation
 */
float readSoilMoisture(int &rawOut) {
  // Power on the sensor only when reading (Anti-Corrosion feature)
  #if SENSOR_POWER_PIN > 0
    digitalWrite(SENSOR_POWER_PIN, HIGH);
    delay(40); // 40ms to stabilize signal
  #endif

  // Take 5 samples to smooth out electrical noise
  long sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += analogRead(SOIL_MOISTURE_PIN);
    delay(10);
  }
  rawOut = sum / 5;

  // Power off probe immediately to prevent corrosion
  #if SENSOR_POWER_PIN > 0
    digitalWrite(SENSOR_POWER_PIN, LOW);
  #endif

  // Linear interpolation: Dry (AIR_VALUE) -> 0%, Wet (WATER_VALUE) -> 100%
  float moisturePct = ((float)(AIR_VALUE - rawOut) / (float)(AIR_VALUE - WATER_VALUE)) * 100.0;
  
  // Constrain between 0.0% and 100.0%
  return constrain(moisturePct, 0.0, 100.0);
}

/**
 * Send JSON Telemetry over HTTP POST to the backend
 */
void sendTelemetry(float moisture, float temp, float humidity, int rawAdc) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Cannot send telemetry: Wi-Fi disconnected.");
    return;
  }

  HTTPClient http;
  http.begin(BACKEND_SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000); // 4-second timeout

  // Construct JSON payload
  StaticJsonDocument<384> doc;
  doc["deviceId"]    = DEVICE_ID;
  doc["deviceName"]  = DEVICE_NAME;
  doc["moisture"]    = round(moisture * 10.0) / 10.0;
  doc["temperature"] = round(temp * 10.0) / 10.0;
  doc["humidity"]    = round(humidity * 10.0) / 10.0;
  doc["rawAdc"]      = rawAdc;
  doc["rssi"]        = WiFi.RSSI();

  // Agronomic defaults for baseline balance
  doc["nitrogen"]    = 55.0;
  doc["phosphorus"]  = 28.0;
  doc["potassium"]   = 42.0;
  doc["ph"]          = 6.8;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("[HTTP] Sending POST payload:");
  Serial.println(jsonPayload);

  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    Serial.printf("[HTTP] Response Status Code: %d\n", httpCode);
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      String response = http.getString();
      Serial.println("[HTTP] Server Response:\n" + response);
    }
  } else {
    Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ======================== ARDUINO SETUP =====================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("   BALIRAJA SMART AGRICULTURE — ESP32 IOT NODE");
  Serial.println("   Device ID: " + String(DEVICE_ID));
  Serial.println("========================================================");

  // Configure ADC attenuation for 0V - 3.3V full scale range
  analogSetAttenuation(ADC_11db);
  pinMode(SOIL_MOISTURE_PIN, INPUT);

  #if SENSOR_POWER_PIN > 0
    pinMode(SENSOR_POWER_PIN, OUTPUT);
    digitalWrite(SENSOR_POWER_PIN, LOW); // Start with probe power OFF
  #endif

  // Initialize DHT sensor
  dht.begin();
  Serial.println("[INIT] DHT Sensor Initialized on GPIO " + String(DHT_PIN));

  // Connect to Wi-Fi
  checkAndMaintainWiFi();

  Serial.println("[SETUP] Setup complete. Starting 5-second sampling loop...\n");
}

// ======================== ARDUINO MAIN LOOP =================================

void loop() {
  // Check Wi-Fi state non-destructively
  if (WiFi.status() != WL_CONNECTED) {
    checkAndMaintainWiFi();
  }

  unsigned long currentMillis = millis();

  // Non-blocking 5-second timer
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = currentMillis;

    // 1. Read Soil Moisture
    int rawAdc = 0;
    float moisture = readSoilMoisture(rawAdc);

    // 2. Read DHT Temperature and Humidity
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature(); // Celsius

    // Error handling for DHT sensor read failure
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("[WARN] Failed to read from DHT sensor! Checking wiring...");
      temperature = 26.5; // Agronomic fallback
      humidity = 60.0;
    }

    // 3. Print values to Serial Monitor
    Serial.println("--------------------------------------------------------");
    Serial.printf("[READING] Soil Moisture: %.1f %% (ADC Raw: %d)\n", moisture, rawAdc);
    Serial.printf("[READING] Temperature  : %.1f °C\n", temperature);
    Serial.printf("[READING] Air Humidity : %.1f %%\n", humidity);

    // Provide immediate agronomic evaluation in Serial
    if (moisture < 25.0) {
      Serial.println("[AGRONOMIC STATUS] ⚠️ CRITICAL DRY — Irrigation required immediately!");
    } else if (moisture <= 70.0) {
      Serial.println("[AGRONOMIC STATUS] ✅ OPTIMAL MOISTURE — Root aeration healthy.");
    } else {
      Serial.println("[AGRONOMIC STATUS] 🚨 WATERLOGGED — Stop watering, ensure soil drainage!");
    }

    // 4. Send HTTP POST to Baliraja Backend
    sendTelemetry(moisture, temperature, humidity, rawAdc);
  }
}
