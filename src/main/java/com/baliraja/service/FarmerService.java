package com.baliraja.service;

import com.baliraja.dto.FarmerProfileResponse;
import com.baliraja.dto.RegisterRequest;
import com.baliraja.entity.Farmer;
import com.baliraja.exception.ResourceNotFoundException;
import com.baliraja.repository.FarmerRepository;
import com.baliraja.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FarmerService {

    private final FarmerRepository farmerRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public FarmerProfileResponse getProfile(Long farmerId) {
        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found with ID: " + farmerId));

        int productsCount = productRepository.findByFarmerIdOrderByCreatedAtDesc(farmerId).size();

        return FarmerProfileResponse.builder()
                .farmerId(farmer.getId())
                .userId(farmer.getUser().getId())
                .fullName(farmer.getUser().getFullName())
                .phone(farmer.getUser().getPhone())
                .email(farmer.getUser().getEmail())
                .village(farmer.getVillage())
                .taluka(farmer.getTaluka())
                .district(farmer.getDistrict())
                .state(farmer.getState())
                .pinCode(farmer.getPinCode())
                .totalLandAcres(farmer.getTotalLandAcres())
                .irrigationType(farmer.getIrrigationType())
                .upiId(farmer.getUpiId())
                .totalProductsListed(productsCount)
                .createdAt(farmer.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public FarmerProfileResponse getProfileByUserId(Long userId) {
        Farmer farmer = farmerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer profile not found for user ID: " + userId));

        return getProfile(farmer.getId());
    }

    @Transactional
    public FarmerProfileResponse updateProfile(Long farmerId, RegisterRequest request) {
        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found with ID: " + farmerId));

        if (request.getFullName() != null) {
            farmer.getUser().setFullName(request.getFullName());
        }
        if (request.getEmail() != null) {
            farmer.getUser().setEmail(request.getEmail());
        }
        if (request.getVillage() != null) {
            farmer.setVillage(request.getVillage());
        }
        if (request.getTaluka() != null) {
            farmer.setTaluka(request.getTaluka());
        }
        if (request.getDistrict() != null) {
            farmer.setDistrict(request.getDistrict());
        }
        if (request.getTotalLandAcres() != null) {
            farmer.setTotalLandAcres(request.getTotalLandAcres());
        }
        if (request.getIrrigationType() != null) {
            farmer.setIrrigationType(request.getIrrigationType());
        }
        if (request.getUpiId() != null) {
            farmer.setUpiId(request.getUpiId());
        }

        farmer = farmerRepository.save(farmer);
        return getProfile(farmer.getId());
    }
}
