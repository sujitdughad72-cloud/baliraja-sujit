package com.baliraja.controller;

import com.baliraja.dto.BuyerProfileResponse;
import com.baliraja.dto.OrderResponse;
import com.baliraja.dto.RegisterRequest;
import com.baliraja.service.BuyerService;
import com.baliraja.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/buyers")
@RequiredArgsConstructor
@Tag(name = "Buyers", description = "Buyer profile and order history")
public class BuyerController {

    private final BuyerService buyerService;
    private final OrderService orderService;

    @GetMapping("/{id}")
    @Operation(summary = "Get buyer profile by ID")
    public ResponseEntity<BuyerProfileResponse> getBuyerProfile(@PathVariable Long id) {
        return ResponseEntity.ok(buyerService.getProfile(id));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get buyer profile by User ID")
    public ResponseEntity<BuyerProfileResponse> getBuyerProfileByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(buyerService.getProfileByUserId(userId));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update buyer profile")
    public ResponseEntity<BuyerProfileResponse> updateBuyerProfile(
            @PathVariable Long id,
            @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.ok(buyerService.updateProfile(id, request));
    }

    @GetMapping("/{id}/orders")
    @Operation(summary = "Get all orders placed by buyer")
    public ResponseEntity<List<OrderResponse>> getBuyerOrders(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrdersByBuyer(id));
    }
}
