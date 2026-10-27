package com.baliraja.repository;

import com.baliraja.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByStatusOrderByCreatedAtDesc(String status);

    List<Product> findByCategoryIdAndStatusOrderByCreatedAtDesc(Long categoryId, String status);

    List<Product> findByFarmerIdOrderByCreatedAtDesc(Long farmerId);

    @Query("SELECT p FROM Product p WHERE p.status = 'AVAILABLE' AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.nameMr) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.location) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Product> searchProducts(@Param("query") String query);

    Page<Product> findByStatus(String status, Pageable pageable);
}
