package com.baliraja.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRequest {

    private Long farmerId;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @NotBlank(message = "Product name is required")
    private String name;

    private String nameMr;

    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than zero")
    private BigDecimal pricePerUnit;

    @NotBlank(message = "Unit is required")
    private String unit;

    @NotNull(message = "Stock quantity is required")
    private BigDecimal stockQuantity;

    @NotBlank(message = "Location is required")
    private String location;

    private String imageUrl;

    private String status;
}
