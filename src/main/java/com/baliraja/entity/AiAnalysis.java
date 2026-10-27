package com.baliraja.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_analysis", indexes = {
    @Index(name = "idx_ai_user_type", columnList = "user_id, analysis_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank(message = "Analysis type is required")
    @Column(name = "analysis_type", nullable = false, length = 50)
    private String analysisType; // CROP_RECOMMENDATION, FERTILIZER_ADVICE, DISEASE_DETECTION, PRICE_FORECAST

    @Column(name = "input_payload", nullable = false, columnDefinition = "TEXT")
    private String inputPayload;

    @Column(name = "result_payload", nullable = false, columnDefinition = "TEXT")
    private String resultPayload;

    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
