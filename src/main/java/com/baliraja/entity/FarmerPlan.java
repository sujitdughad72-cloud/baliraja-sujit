package com.baliraja.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "farmer_plans", indexes = {
    @Index(name = "idx_plan_region_crop", columnList = "region, planned_crop, season, year")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmerPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "farmer_id", nullable = false)
    private Farmer farmer;

    @NotBlank(message = "Region is required")
    @Column(name = "region", nullable = false, length = 100)
    private String region;

    @NotBlank(message = "Planned crop is required")
    @Column(name = "planned_crop", nullable = false, length = 100)
    private String plannedCrop;

    @NotBlank(message = "Season is required")
    @Column(name = "season", nullable = false, length = 50)
    private String season; // Kharif, Rabi, Zaid

    @NotNull(message = "Land acres is required")
    @Column(name = "land_acres", nullable = false, precision = 6, scale = 2)
    private BigDecimal landAcres;

    @NotNull(message = "Year is required")
    @Column(name = "year", nullable = false)
    private Integer year;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
