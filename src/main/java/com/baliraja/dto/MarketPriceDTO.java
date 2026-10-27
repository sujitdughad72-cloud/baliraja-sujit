package com.baliraja.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketPriceDTO {

    private Long id;
    private String commodity;
    private String commodityMr;
    private String market;
    private String marketMr;
    private String district;
    private String state;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private BigDecimal modalPrice;
    private String priceUnit;
    private String trend; // UP, DOWN, STABLE
    private LocalDate priceDate;
}
