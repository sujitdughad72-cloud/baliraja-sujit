package com.baliraja.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyerProfileResponse {

    private Long buyerId;
    private Long userId;
    private String fullName;
    private String phone;
    private String email;
    private String businessName;
    private String buyerType;
    private String gstNumber;
    private String deliveryAddress;
    private String city;
    private String state;
    private int totalOrdersPlaced;
    private LocalDateTime createdAt;
}
