package com.baliraja.service;

import com.baliraja.dto.BuyerProfileResponse;
import com.baliraja.dto.RegisterRequest;
import com.baliraja.entity.Buyer;
import com.baliraja.exception.ResourceNotFoundException;
import com.baliraja.repository.BuyerRepository;
import com.baliraja.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BuyerService {

    private final BuyerRepository buyerRepository;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public BuyerProfileResponse getProfile(Long buyerId) {
        Buyer buyer = buyerRepository.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found with ID: " + buyerId));

        int ordersCount = orderRepository.findByBuyerIdOrderByCreatedAtDesc(buyerId).size();

        return BuyerProfileResponse.builder()
                .buyerId(buyer.getId())
                .userId(buyer.getUser().getId())
                .fullName(buyer.getUser().getFullName())
                .phone(buyer.getUser().getPhone())
                .email(buyer.getUser().getEmail())
                .businessName(buyer.getBusinessName())
                .buyerType(buyer.getBuyerType())
                .gstNumber(buyer.getGstNumber())
                .deliveryAddress(buyer.getDeliveryAddress())
                .city(buyer.getCity())
                .state(buyer.getState())
                .totalOrdersPlaced(ordersCount)
                .createdAt(buyer.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public BuyerProfileResponse getProfileByUserId(Long userId) {
        Buyer buyer = buyerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer profile not found for user ID: " + userId));

        return getProfile(buyer.getId());
    }

    @Transactional
    public BuyerProfileResponse updateProfile(Long buyerId, RegisterRequest request) {
        Buyer buyer = buyerRepository.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found with ID: " + buyerId));

        if (request.getFullName() != null) {
            buyer.getUser().setFullName(request.getFullName());
        }
        if (request.getEmail() != null) {
            buyer.getUser().setEmail(request.getEmail());
        }
        if (request.getBusinessName() != null) {
            buyer.setBusinessName(request.getBusinessName());
        }
        if (request.getBuyerType() != null) {
            buyer.setBuyerType(request.getBuyerType());
        }
        if (request.getGstNumber() != null) {
            buyer.setGstNumber(request.getGstNumber());
        }
        if (request.getDeliveryAddress() != null) {
            buyer.setDeliveryAddress(request.getDeliveryAddress());
        }
        if (request.getCity() != null) {
            buyer.setCity(request.getCity());
        }

        buyer = buyerRepository.save(buyer);
        return getProfile(buyer.getId());
    }
}
