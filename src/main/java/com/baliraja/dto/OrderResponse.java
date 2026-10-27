package com.baliraja.dto;

import com.baliraja.entity.OrderStatus;
import com.baliraja.entity.PaymentMode;
import com.baliraja.entity.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {

    private Long id;
    private String orderNumber;
    private Long buyerId;
    private String buyerName;
    private String buyerPhone;
    private Long farmerId;
    private String farmerName;
    private String farmerPhone;
    private BigDecimal totalAmount;
    private OrderStatus status;
    private PaymentMode paymentMode;
    private PaymentStatus paymentStatus;
    private String deliveryAddress;
    private String notes;
    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemResponse {
        private Long id;
        private Long productId;
        private String productName;
        private String productNameMr;
        private BigDecimal quantity;
        private String unit;
        private BigDecimal pricePerUnit;
        private BigDecimal totalPrice;
    }
}
