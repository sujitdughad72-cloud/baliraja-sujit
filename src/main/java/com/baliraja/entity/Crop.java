package com.baliraja.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "crops")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Crop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Crop name is required")
    @Column(name = "name", nullable = false, unique = true, length = 80)
    private String name;

    @NotBlank(message = "Marathi name is required")
    @Column(name = "name_mr", nullable = false, length = 100)
    private String nameMr;

    @Column(name = "variety", length = 100)
    private String variety;

    @Column(name = "optimal_nitrogen", precision = 6, scale = 2)
    private BigDecimal optimalNitrogen;

    @Column(name = "optimal_phosphorus", precision = 6, scale = 2)
    private BigDecimal optimalPhosphorus;

    @Column(name = "optimal_potassium", precision = 6, scale = 2)
    private BigDecimal optimalPotassium;

    @Column(name = "optimal_ph_min", precision = 4, scale = 2)
    private BigDecimal optimalPhMin;

    @Column(name = "optimal_ph_max", precision = 4, scale = 2)
    private BigDecimal optimalPhMax;

    @Column(name = "optimal_temp_min", precision = 4, scale = 2)
    private BigDecimal optimalTempMin;

    @Column(name = "optimal_temp_max", precision = 4, scale = 2)
    private BigDecimal optimalTempMax;

    @Column(name = "growth_days")
    private Integer growthDays;

    @Column(name = "expected_yield_quintal_per_acre", precision = 6, scale = 2)
    private BigDecimal expectedYieldQuintalPerAcre;
}
