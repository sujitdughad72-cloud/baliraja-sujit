package com.baliraja.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SoilAnalysisRequest {

    private String targetCrop;

    @NotNull(message = "Nitrogen value is required")
    private BigDecimal nitrogen;

    @NotNull(message = "Phosphorus value is required")
    private BigDecimal phosphorus;

    @NotNull(message = "Potassium value is required")
    private BigDecimal potassium;

    private BigDecimal ph;

    private BigDecimal organicCarbon;

    private BigDecimal electricConductivity;

    private BigDecimal landAreaAcres;
}
