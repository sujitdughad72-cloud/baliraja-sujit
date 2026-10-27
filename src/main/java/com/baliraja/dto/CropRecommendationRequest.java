package com.baliraja.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CropRecommendationRequest {

    @NotNull(message = "Nitrogen (N) value is required")
    private BigDecimal nitrogen;

    @NotNull(message = "Phosphorus (P) value is required")
    private BigDecimal phosphorus;

    @NotNull(message = "Potassium (K) value is required")
    private BigDecimal potassium;

    private BigDecimal ph;

    private BigDecimal temperature;

    private BigDecimal rainfall;

    private BigDecimal humidity;

    private String soilType;

    private String district;

    private String season;
}
