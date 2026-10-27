package com.baliraja.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "market_prices", indexes = {
    @Index(name = "idx_market_crop_date", columnList = "crop_name, price_date"),
    @Index(name = "idx_market_district", columnList = "district")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Crop name is required")
    @Column(name = "crop_name", nullable = false, length = 100)
    private String cropName;

    @NotBlank(message = "Market name is required")
    @Column(name = "market_name", nullable = false, length = 120)
    private String marketName;

    @NotBlank(message = "District is required")
    @Column(name = "district", nullable = false, length = 100)
    private String district;

    @Column(name = "state", length = 100)
    @Builder.Default
    private String state = "Maharashtra";

    @NotNull(message = "Modal price is required")
    @Column(name = "modal_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal modalPrice;

    @NotNull(message = "Min price is required")
    @Column(name = "min_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal minPrice;

    @NotNull(message = "Max price is required")
    @Column(name = "max_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxPrice;

    @Column(name = "arrivals_tonnes", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal arrivalsTonnes = BigDecimal.ZERO;

    @NotNull(message = "Price date is required")
    @Column(name = "price_date", nullable = false)
    private LocalDate priceDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
