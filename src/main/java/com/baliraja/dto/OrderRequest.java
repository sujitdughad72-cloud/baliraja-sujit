package com.baliraja.dto;

import com.baliraja.entity.PaymentMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRequest {

    private Long buyerId;

    @NotEmpty(message = "Order must have at least one item")
    @Valid
    private List<OrderItemRequest> items;

    @NotNull(message = "Payment mode is required (COD, UPI, BANK_TRANSFER, CASH)")
    private PaymentMode paymentMode;

    private String deliveryAddress;

    private String notes;
}
