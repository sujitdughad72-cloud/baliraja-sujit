package com.baliraja.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiseasePredictionResponse {

    private String diseaseName;
    private String diseaseNameMr;
    private Double confidenceScore;
    private String severity; // LOW, MEDIUM, HIGH, SEVERE
    private String description;
    private String descriptionMr;
    private List<String> chemicalTreatments;
    private List<String> organicTreatments;
    private List<String> preventiveMeasures;
    private String modelSource;
}
