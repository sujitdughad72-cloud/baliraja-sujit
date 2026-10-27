package com.baliraja.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "farmers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Farmer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false, unique = true)
    private User user;

    @Column(name = "village", length = 100)
    private String village;

    @Column(name = "taluka", length = 100)
    private String taluka;

    @NotBlank(message = "District is required")
    @Column(name = "district", nullable = false, length = 100)
    private String district;

    @Column(name = "state", length = 100)
    @Builder.Default
    private String state = "Maharashtra";

    @Column(name = "pin_code", length = 10)
    private String pinCode;

    @Column(name = "total_land_acres", precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal totalLandAcres = BigDecimal.ZERO;

    @Column(name = "irrigation_type", length = 50)
    @Builder.Default
    private String irrigationType = "Drip";

    @Column(name = "upi_id", length = 100)
    private String upiId;

    @OneToMany(mappedBy = "farmer", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<Product> products = new ArrayList<>();

    @OneToMany(mappedBy = "farmer", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<FarmerPlan> farmerPlans = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
