package com.baliraja.dto;

import com.baliraja.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {

    @NotBlank(message = "Full name is required")
    @Size(max = 100)
    private String fullName;

    private String email;

    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotNull(message = "Role is required (FARMER, BUYER)")
    private Role role;

    // Optional Farmer specific fields
    private String village;
    private String taluka;
    private String district;
    private BigDecimal totalLandAcres;
    private String irrigationType;
    private String upiId;

    // Optional Buyer specific fields
    private String businessName;
    private String buyerType; // INDIVIDUAL, RETAILER, WHOLESALER
    private String gstNumber;
    private String deliveryAddress;
    private String city;
}
