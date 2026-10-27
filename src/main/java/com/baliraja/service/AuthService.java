package com.baliraja.service;

import com.baliraja.dto.AuthRequest;
import com.baliraja.dto.AuthResponse;
import com.baliraja.dto.RegisterRequest;
import com.baliraja.entity.Buyer;
import com.baliraja.entity.Farmer;
import com.baliraja.entity.Role;
import com.baliraja.entity.User;
import com.baliraja.exception.BadRequestException;
import com.baliraja.repository.BuyerRepository;
import com.baliraja.repository.FarmerRepository;
import com.baliraja.repository.UserRepository;
import com.baliraja.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final FarmerRepository farmerRepository;
    private final BuyerRepository buyerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Phone number " + request.getPhone() + " is already registered");
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new BadRequestException("Email " + request.getEmail() + " is already registered");
            }
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .isActive(true)
                .build();

        user = userRepository.save(user);

        Long farmerId = null;
        Long buyerId = null;
        String location = "";

        if (request.getRole() == Role.FARMER) {
            Farmer farmer = Farmer.builder()
                    .user(user)
                    .village(request.getVillage() != null ? request.getVillage() : "")
                    .taluka(request.getTaluka() != null ? request.getTaluka() : "")
                    .district(request.getDistrict() != null ? request.getDistrict() : "Nashik")
                    .state("Maharashtra")
                    .totalLandAcres(request.getTotalLandAcres() != null ? request.getTotalLandAcres() : BigDecimal.ZERO)
                    .irrigationType(request.getIrrigationType() != null ? request.getIrrigationType() : "Drip")
                    .upiId(request.getUpiId())
                    .build();
            farmer = farmerRepository.save(farmer);
            farmerId = farmer.getId();
            location = farmer.getDistrict() != null ? farmer.getDistrict() : "";
        } else if (request.getRole() == Role.BUYER) {
            Buyer buyer = Buyer.builder()
                    .user(user)
                    .businessName(request.getBusinessName() != null ? request.getBusinessName() : request.getFullName())
                    .buyerType(request.getBuyerType() != null ? request.getBuyerType() : "RETAILER")
                    .gstNumber(request.getGstNumber())
                    .deliveryAddress(request.getDeliveryAddress() != null ? request.getDeliveryAddress() : "")
                    .city(request.getCity() != null ? request.getCity() : "")
                    .state("Maharashtra")
                    .build();
            buyer = buyerRepository.save(buyer);
            buyerId = buyer.getId();
            location = buyer.getCity() != null ? buyer.getCity() : "";
        }

        String token = jwtUtils.generateToken(user.getPhone(), user.getRole().name(), user.getId());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .role(user.getRole())
                .farmerId(farmerId)
                .buyerId(buyerId)
                .location(location)
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByPhone(request.getIdentifier())
                .or(() -> userRepository.findByEmail(request.getIdentifier()))
                .orElseThrow(() -> new BadRequestException("Invalid credentials. Please check your phone number/email and password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid credentials. Please check your password");
        }

        Long farmerId = null;
        Long buyerId = null;
        String location = "";

        if (user.getRole() == Role.FARMER) {
            Farmer farmer = farmerRepository.findByUserId(user.getId()).orElse(null);
            if (farmer != null) {
                farmerId = farmer.getId();
                location = farmer.getDistrict();
            }
        } else if (user.getRole() == Role.BUYER) {
            Buyer buyer = buyerRepository.findByUserId(user.getId()).orElse(null);
            if (buyer != null) {
                buyerId = buyer.getId();
                location = buyer.getCity();
            }
        }

        String token = jwtUtils.generateToken(user.getPhone(), user.getRole().name(), user.getId());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .role(user.getRole())
                .farmerId(farmerId)
                .buyerId(buyerId)
                .location(location)
                .build();
    }
}
