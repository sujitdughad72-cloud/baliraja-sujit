package com.baliraja.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "IoT NPK and Soil Moisture Telemetry Data Ingest")
public class SensorReadingRequest {

    @Schema(description = "Device Identifier (e.g. ESP32-BALIRAJA-01)", example = "ESP32-BALIRAJA-01")
    private String deviceId;

    @Schema(description = "Device or Plot Name", example = "Nashik Plot 1 (Black Soil)")
    private String deviceName;

    @Schema(description = "Available Nitrogen in soil (mg/kg or ppm)", example = "58.0")
    private Double nitrogen;

    @Schema(description = "Available Phosphorus in soil (mg/kg or ppm)", example = "28.0")
    private Double phosphorus;

    @Schema(description = "Available Potassium in soil (mg/kg or ppm)", example = "42.0")
    private Double potassium;

    @NotNull(message = "Soil moisture is required")
    @Schema(description = "Volumetric soil moisture percentage (0-100%)", example = "52.0")
    private Double moisture;

    @Schema(description = "Soil/Air temperature in Celsius", example = "26.5")
    private Double temperature;

    @Schema(description = "Air relative humidity percentage from DHT sensor", example = "65.0")
    private Double humidity;

    @Schema(description = "Raw ADC reading from analog pin GPIO 34", example = "2240")
    private Integer rawAdc;

    @Schema(description = "Soil pH (3.5 - 9.5)", example = "6.8")
    private Double ph;

    @Schema(description = "Electrical conductivity in µS/cm", example = "410.0")
    private Double ec;

    @Schema(description = "Battery level percentage", example = "92")
    private Integer battery;
}
