package com.baliraja.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthRequest {

    @NotBlank(message = "Phone number or email is required")
    private String identifier; // accepts phone or email

    @NotBlank(message = "Password is required")
    private String password;
}
