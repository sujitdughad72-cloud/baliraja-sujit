package com.baliraja.controller;

import com.baliraja.dto.FarmerProfileResponse;
import com.baliraja.dto.OrderResponse;
import com.baliraja.dto.ProductResponse;
import com.baliraja.dto.RegisterRequest;
import com.baliraja.service.FarmerService;
import com.baliraja.service.OrderService;
import com.baliraja.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/farmers")
@RequiredArgsConstructor
@Tag(name = "Farmers", description = "Farmer profile, marketplace listings, and received orders")
public class FarmerController {

    private final FarmerService farmerService;
    private final ProductService productService;
    private final OrderService orderService;

    @GetMapping("/{id}")
    @Operation(summary = "Get farmer profile details by farmer ID")
    public ResponseEntity<FarmerProfileResponse> getFarmerProfile(@PathVariable Long id) {
        return ResponseEntity.ok(farmerService.getProfile(id));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get farmer profile details by user ID")
    public ResponseEntity<FarmerProfileResponse> getFarmerProfileByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(farmerService.getProfileByUserId(userId));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update farmer profile details")
    public ResponseEntity<FarmerProfileResponse> updateFarmerProfile(
            @PathVariable Long id,
            @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.ok(farmerService.updateProfile(id, request));
    }

    @GetMapping("/{id}/products")
    @Operation(summary = "Get all products listed by a farmer")
    public ResponseEntity<List<ProductResponse>> getFarmerProducts(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductsByFarmer(id));
    }

    @GetMapping("/{id}/orders")
    @Operation(summary = "Get all buyer orders received for a farmer's products")
    public ResponseEntity<List<OrderResponse>> getFarmerOrders(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrdersByFarmer(id));
    }
}
