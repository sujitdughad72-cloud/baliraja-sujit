package com.baliraja.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_readings", indexes = {
        @Index(name = "idx_sensor_device", columnList = "device_id, recorded_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SensorReadingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false, length = 50)
    private String deviceId;

    @Column(name = "device_name", length = 100)
    private String deviceName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id")
    private Farmer farmer;

    @Column(name = "soil_moisture", nullable = false, precision = 5, scale = 2)
    private BigDecimal soilMoisture;

    @Column(precision = 5, scale = 2)
    private BigDecimal temperature;

    @Column(precision = 5, scale = 2)
    private BigDecimal humidity;

    @Column(precision = 6, scale = 2)
    private BigDecimal nitrogen;

    @Column(precision = 6, scale = 2)
    private BigDecimal phosphorus;

    @Column(precision = 6, scale = 2)
    private BigDecimal potassium;

    @Column(precision = 4, scale = 2)
    private BigDecimal ph;

    @Column(precision = 6, scale = 2)
    private BigDecimal ec;

    private Integer battery;

    @Column(name = "raw_adc_value")
    private Integer rawAdcValue;

    @Column(length = 50)
    private String status;

    @CreationTimestamp
    @Column(name = "recorded_at", updatable = false)
    private LocalDateTime recordedAt;
}
