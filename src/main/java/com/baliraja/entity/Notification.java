package com.baliraja.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notif_user_read", columnList = "user_id, is_read")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true) // null indicates broadcast alert
    private User user;

    @NotBlank(message = "Type is required")
    @Column(name = "type", nullable = false, length = 50)
    private String type; // POWER, WEATHER, IRRIGATION, MARKET, ORDER, SYSTEM

    @NotBlank(message = "Title is required")
    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @NotBlank(message = "Message is required")
    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "severity", length = 20)
    @Builder.Default
    private String severity = "MEDIUM"; // LOW, MEDIUM, HIGH

    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
