package com.baliraja.controller;

import com.baliraja.dto.OrderRequest;
import com.baliraja.dto.OrderResponse;
import com.baliraja.entity.OrderStatus;
import com.baliraja.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Endpoints for placing and tracking farm-to-buyer orders")
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @Operation(summary = "Place a new order (Buyer)")
    public ResponseEntity<OrderResponse> placeOrder(
            @RequestParam(name = "buyerId", required = false, defaultValue = "1") Long buyerId,
            @Valid @RequestBody OrderRequest request
    ) {
        Long targetBuyerId = request.getBuyerId() != null ? request.getBuyerId() : buyerId;
        OrderResponse response = orderService.createOrder(targetBuyerId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order details and line items by order ID")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update order status (PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED)")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam(name = "status") OrderStatus status
    ) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, status));
    }
}
