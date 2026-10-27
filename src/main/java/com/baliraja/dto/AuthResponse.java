package com.baliraja.dto;

import com.baliraja.entity.Role;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String token;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long userId;
    private String fullName;
    private String phone;
    private String email;
    private Role role;
    private Long farmerId;
    private Long buyerId;
    private String location;
}
