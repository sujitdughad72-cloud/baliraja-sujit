package com.baliraja.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmerProfileResponse {

    private Long farmerId;
    private Long userId;
    private String fullName;
    private String phone;
    private String email;
    private String village;
    private String taluka;
    private String district;
    private String state;
    private String pinCode;
    private BigDecimal totalLandAcres;
    private String irrigationType;
    private String upiId;
    private int totalProductsListed;
    private LocalDateTime createdAt;
}
