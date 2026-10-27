package com.baliraja.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products", indexes = {
    @Index(name = "idx_product_category", columnList = "category_id"),
    @Index(name = "idx_product_location", columnList = "location"),
    @Index(name = "idx_product_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "farmer_id", nullable = false)
    private Farmer farmer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @NotBlank(message = "Product name is required")
    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "name_mr", length = 150)
    private String nameMr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than zero")
    @Column(name = "price_per_unit", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerUnit;

    @NotBlank(message = "Unit is required")
    @Column(name = "unit", nullable = false, length = 30)
    @Builder.Default
    private String unit = "kg"; // kg, quintal, box, crate, ton

    @Column(name = "stock_quantity", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal stockQuantity = BigDecimal.ZERO;

    @NotBlank(message = "Location is required")
    @Column(name = "location", nullable = false, length = 120)
    private String location;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "status", length = 30)
    @Builder.Default
    private String status = "AVAILABLE"; // AVAILABLE, OUT_OF_STOCK, INACTIVE

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
