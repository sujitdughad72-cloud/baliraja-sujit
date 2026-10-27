package com.baliraja.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CropRecommendationResponse {

    private String recommendedCrop;
    private String recommendedCropMr;
    private Double confidenceScore;
    private String expectedYield;
    private BigDecimal estimatedProfitPerAcre;
    private String sowingWindow;
    private String advice;
    private String adviceMr;
    private List<AlternativeCrop> alternativeCrops;
    private String modelSource; // PYTHON_FASTAPI or LOCAL_FALLBACK

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AlternativeCrop {
        private String cropName;
        private String cropNameMr;
        private Double score;
    }
}
