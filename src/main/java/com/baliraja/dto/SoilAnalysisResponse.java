package com.baliraja.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SoilAnalysisResponse {

    private String soilQualityRating; // EXCELLENT, GOOD, MODERATE, DEFICIENT
    private String soilQualityRatingMr;
    private String nitrogenStatus;     // LOW, MEDIUM, OPTIMAL, HIGH
    private String phosphorusStatus;
    private String potassiumStatus;
    private String phStatus;
    private List<FertilizerDose> recommendedFertilizers;
    private List<String> organicRecommendations;
    private BigDecimal estimatedFertilizerCost;
    private String modelSource;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FertilizerDose {
        private String fertilizerName;
        private String fertilizerNameMr;
        private BigDecimal quantityKgPerAcre;
        private String applicationTime;
        private String applicationMethod;
    }
}
