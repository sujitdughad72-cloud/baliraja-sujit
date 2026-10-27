package com.baliraja.controller;

import com.baliraja.dto.SensorReadingRequest;
import com.baliraja.dto.SensorReadingResponse;
import com.baliraja.service.SensorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sensors")
@RequiredArgsConstructor
@Tag(name = "IoT Soil Sensors", description = "Endpoints for NPK, Soil Moisture, pH, and Temperature sensor telemetry & predictions")
public class SensorController {

    private final SensorService sensorService;

    @PostMapping("/reading")
    @Operation(summary = "Ingest real-time NPK & Soil Moisture telemetry from ESP32/Arduino/RS485 and receive instant crop and irrigation prediction")
    public ResponseEntity<SensorReadingResponse> ingestReading(@Valid @RequestBody SensorReadingRequest request) {
        return ResponseEntity.ok(sensorService.processReading(request));
    }

    @GetMapping("/history")
    @Operation(summary = "Get recent sensor telemetry data logs for charts and trend tracking")
    public ResponseEntity<List<SensorReadingRequest>> getTelemetryHistory(@RequestParam(name = "limit", defaultValue = "20") int limit) {
        return ResponseEntity.ok(sensorService.getRecentTelemetry(limit));
    }
}
