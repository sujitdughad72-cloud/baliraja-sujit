package com.baliraja.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiseasePredictionRequest {

    private String cropName;

    @NotBlank(message = "Image data or URL is required")
    private String imageBase64; // Base64 data or image URL

    private String symptoms;
}
