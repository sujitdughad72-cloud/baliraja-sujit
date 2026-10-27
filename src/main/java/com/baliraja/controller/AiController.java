package com.baliraja.controller;

import com.baliraja.dto.*;
import com.baliraja.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI Farming Assistant", description = "AI and ML endpoints connecting Spring Boot to Python FastAPI microservice")
public class AiController {

    private final AiService aiService;

    @PostMapping("/crop-recommendation")
    @Operation(summary = "Get ML crop recommendations based on soil NPK, pH, and climate")
    public ResponseEntity<CropRecommendationResponse> recommendCrop(
            @RequestParam(name = "userId", required = false) Long userId,
            @Valid @RequestBody CropRecommendationRequest request
    ) {
        return ResponseEntity.ok(aiService.recommendCrop(request, userId));
    }

    @PostMapping("/disease-prediction")
    @Operation(summary = "Diagnose crop leaf diseases and receive remedy treatment guidance")
    public ResponseEntity<DiseasePredictionResponse> predictDisease(
            @RequestParam(name = "userId", required = false) Long userId,
            @Valid @RequestBody DiseasePredictionRequest request
    ) {
        return ResponseEntity.ok(aiService.predictDisease(request, userId));
    }

    @PostMapping("/soil-analysis")
    @Operation(summary = "Analyze soil health and calculate balanced fertilizer dose recommendations")
    public ResponseEntity<SoilAnalysisResponse> analyzeSoil(
            @RequestParam(name = "userId", required = false) Long userId,
            @Valid @RequestBody SoilAnalysisRequest request
    ) {
        return ResponseEntity.ok(aiService.analyzeSoil(request, userId));
    }
}
