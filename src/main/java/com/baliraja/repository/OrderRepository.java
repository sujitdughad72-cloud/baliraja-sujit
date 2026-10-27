package com.baliraja.repository;

import com.baliraja.entity.Order;
import com.baliraja.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    List<Order> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);
}
