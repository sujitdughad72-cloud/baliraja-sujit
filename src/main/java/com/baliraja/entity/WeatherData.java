package com.baliraja.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "weather_data", indexes = {
    @Index(name = "idx_weather_district", columnList = "district")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeatherData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "District is required")
    @Column(name = "district", nullable = false, length = 100)
    private String district;

    @Column(name = "temperature", precision = 4, scale = 1)
    private BigDecimal temperature;

    @Column(name = "humidity", precision = 4, scale = 1)
    private BigDecimal humidity;

    @Column(name = "rainfall_forecast_mm", precision = 6, scale = 2)
    private BigDecimal rainfallForecastMm;

    @Column(name = "weather_condition", length = 100)
    private String weatherCondition;

    @CreationTimestamp
    @Column(name = "recorded_at", updatable = false)
    private LocalDateTime recordedAt;
}
