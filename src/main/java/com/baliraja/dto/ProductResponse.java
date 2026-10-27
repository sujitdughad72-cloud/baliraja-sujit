package com.baliraja.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductResponse {

    private Long id;
    private Long farmerId;
    private String farmerName;
    private String farmerPhone;
    private String farmerLocation;
    private Long categoryId;
    private String categoryName;
    private String categoryNameMr;
    private String name;
    private String nameMr;
    private String description;
    private BigDecimal pricePerUnit;
    private String unit;
    private BigDecimal stockQuantity;
    private String location;
    private String imageUrl;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
