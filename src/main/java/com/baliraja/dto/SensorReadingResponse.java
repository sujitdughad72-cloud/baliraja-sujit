package com.baliraja.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Instant Agronomic Prediction Response from IoT Soil Telemetry")
public class SensorReadingResponse {

    private String deviceId;
    private String status;
    private Double moistureLevel;
    private String moistureAssessment;
    private String irrigationAction;
    private Long waterRequiredLitersPerAcre;

    private Integer soilHealthScore; // 0-100
    private String soilHealthCategory;

    private Double ureaBagsRecommended;
    private Double dapBagsRecommended;
    private Double mopBagsRecommended;

    private String topRecommendedCrop;
    private String topRecommendedCropMr;
    private Integer suitabilityScore;

    private List<String> agronomicAlerts;
    private String advisorySummaryMr;
}
