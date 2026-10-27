package com.baliraja.service;

import com.baliraja.dto.OrderItemRequest;
import com.baliraja.dto.OrderRequest;
import com.baliraja.dto.OrderResponse;
import com.baliraja.entity.*;
import com.baliraja.exception.BadRequestException;
import com.baliraja.exception.ResourceNotFoundException;
import com.baliraja.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final BuyerRepository buyerRepository;
    private final ProductRepository productRepository;

    @Transactional
    public OrderResponse createOrder(Long buyerId, OrderRequest request) {
        Buyer buyer = buyerRepository.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("Buyer not found with ID: " + buyerId));

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Order must have at least one product item");
        }

        String orderNumber = "ORD-" + System.currentTimeMillis();
        BigDecimal totalAmount = BigDecimal.ZERO;

        Order order = Order.builder()
                .buyer(buyer)
                .orderNumber(orderNumber)
                .totalAmount(BigDecimal.ZERO) // Will calculate below
                .status(OrderStatus.PENDING)
                .paymentMode(request.getPaymentMode() != null ? request.getPaymentMode() : PaymentMode.CASH_ON_DELIVERY)
                .paymentStatus(PaymentStatus.PENDING)
                .deliveryAddress(request.getDeliveryAddress() != null ? request.getDeliveryAddress() : buyer.getDeliveryAddress())
                .deliveryCity(buyer.getCity() != null ? buyer.getCity() : "Nashik")
                .contactPhone(buyer.getUser().getPhone())
                .build();

        order = orderRepository.save(order);

        List<OrderItem> savedItems = new ArrayList<>();

        for (OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + itemReq.getProductId()));

            if (product.getStockQuantity().compareTo(itemReq.getQuantity()) < 0) {
                throw new BadRequestException("Insufficient stock for product " + product.getName() +
                        ". Available: " + product.getStockQuantity() + ", requested: " + itemReq.getQuantity());
            }

            // Deduct stock
            product.setStockQuantity(product.getStockQuantity().subtract(itemReq.getQuantity()));
            if (product.getStockQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                product.setStatus("OUT_OF_STOCK");
            }
            productRepository.save(product);

            BigDecimal subtotal = product.getPricePerUnit().multiply(itemReq.getQuantity());
            totalAmount = totalAmount.add(subtotal);

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .farmer(product.getFarmer())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getPricePerUnit())
                    .subtotal(subtotal)
                    .build();

            savedItems.add(orderItemRepository.save(orderItem));
        }

        order.setTotalAmount(totalAmount);
        order = orderRepository.save(order);

        return mapToResponse(order, savedItems);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        return mapToResponse(order, items);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByBuyer(Long buyerId) {
        return orderRepository.findByBuyerIdOrderByCreatedAtDesc(buyerId)
                .stream()
                .map(order -> mapToResponse(order, orderItemRepository.findByOrderId(order.getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByFarmer(Long farmerId) {
        List<OrderItem> farmerItems = orderItemRepository.findByFarmerId(farmerId);
        Set<Long> orderIds = farmerItems.stream()
                .map(item -> item.getOrder().getId())
                .collect(Collectors.toSet());

        return orderRepository.findAllById(orderIds)
                .stream()
                .map(order -> mapToResponse(order, orderItemRepository.findByOrderId(order.getId())))
                .sorted(Comparator.comparing(OrderResponse::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        order.setStatus(status);
        if (status == OrderStatus.DELIVERED) {
            order.setPaymentStatus(PaymentStatus.PAID);
        }
        order = orderRepository.save(order);
        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        return mapToResponse(order, items);
    }

    private OrderResponse mapToResponse(Order order, List<OrderItem> items) {
        List<OrderResponse.OrderItemResponse> itemResponses = items.stream().map(i ->
                OrderResponse.OrderItemResponse.builder()
                        .id(i.getId())
                        .productId(i.getProduct().getId())
                        .productName(i.getProduct().getName())
                        .productNameMr(i.getProduct().getNameMr())
                        .quantity(i.getQuantity())
                        .unit(i.getProduct().getUnit())
                        .unitPrice(i.getUnitPrice())
                        .totalPrice(i.getSubtotal())
                        .build()
        ).collect(Collectors.toList());

        Long firstFarmerId = null;
        String firstFarmerName = null;
        String firstFarmerPhone = null;
        if (!items.isEmpty() && items.get(0).getFarmer() != null) {
            Farmer f = items.get(0).getFarmer();
            firstFarmerId = f.getId();
            firstFarmerName = f.getUser().getFullName();
            firstFarmerPhone = f.getUser().getPhone();
        }

        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .buyerId(order.getBuyer().getId())
                .buyerName(order.getBuyer().getUser().getFullName())
                .buyerPhone(order.getBuyer().getUser().getPhone())
                .farmerId(firstFarmerId)
                .farmerName(firstFarmerName)
                .farmerPhone(firstFarmerPhone)
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .paymentMode(order.getPaymentMode())
                .paymentStatus(order.getPaymentStatus())
                .deliveryAddress(order.getDeliveryAddress())
                .createdAt(order.getCreatedAt())
                .items(itemResponses)
                .build();
    }
}
