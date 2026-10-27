package com.baliraja.service;

import com.baliraja.dto.ProductRequest;
import com.baliraja.dto.ProductResponse;
import com.baliraja.entity.Category;
import com.baliraja.entity.Farmer;
import com.baliraja.entity.Product;
import com.baliraja.exception.BadRequestException;
import com.baliraja.exception.ResourceNotFoundException;
import com.baliraja.repository.CategoryRepository;
import com.baliraja.repository.FarmerRepository;
import com.baliraja.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final FarmerRepository farmerRepository;

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllAvailableProducts() {
        return productRepository.findByStatusOrderByCreatedAtDesc("AVAILABLE")
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
        return mapToResponse(product);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryIdAndStatusOrderByCreatedAtDesc(categoryId, "AVAILABLE")
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> searchProducts(String query) {
        if (query == null || query.isBlank()) {
            return getAllAvailableProducts();
        }
        return productRepository.searchProducts(query.trim())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getProductsByFarmer(Long farmerId) {
        return productRepository.findByFarmerIdOrderByCreatedAtDesc(farmerId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductResponse createProduct(Long farmerId, ProductRequest request) {
        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found with ID: " + farmerId));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));

        Product product = Product.builder()
                .farmer(farmer)
                .category(category)
                .name(request.getName())
                .nameMr(request.getNameMr() != null ? request.getNameMr() : request.getName())
                .description(request.getDescription())
                .pricePerUnit(request.getPricePerUnit())
                .unit(request.getUnit() != null ? request.getUnit() : "kg")
                .stockQuantity(request.getStockQuantity())
                .location(request.getLocation() != null ? request.getLocation() : farmer.getDistrict())
                .imageUrl(request.getImageUrl())
                .status("AVAILABLE")
                .build();

        product = productRepository.save(product);
        return mapToResponse(product);
    }

    @Transactional
    public ProductResponse updateProduct(Long productId, ProductRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));
            product.setCategory(category);
        }

        if (request.getName() != null) product.setName(request.getName());
        if (request.getNameMr() != null) product.setNameMr(request.getNameMr());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getPricePerUnit() != null) product.setPricePerUnit(request.getPricePerUnit());
        if (request.getUnit() != null) product.setUnit(request.getUnit());
        if (request.getStockQuantity() != null) product.setStockQuantity(request.getStockQuantity());
        if (request.getLocation() != null) product.setLocation(request.getLocation());
        if (request.getImageUrl() != null) product.setImageUrl(request.getImageUrl());
        if (request.getStatus() != null) product.setStatus(request.getStatus());

        product = productRepository.save(product);
        return mapToResponse(product);
    }

    @Transactional
    public void deleteProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));
        productRepository.delete(product);
    }

    private ProductResponse mapToResponse(Product p) {
        return ProductResponse.builder()
                .id(p.getId())
                .farmerId(p.getFarmer().getId())
                .farmerName(p.getFarmer().getUser().getFullName())
                .farmerPhone(p.getFarmer().getUser().getPhone())
                .farmerLocation(p.getFarmer().getDistrict())
                .categoryId(p.getCategory().getId())
                .categoryName(p.getCategory().getName())
                .categoryNameMr(p.getCategory().getNameMr())
                .name(p.getName())
                .nameMr(p.getNameMr())
                .description(p.getDescription())
                .pricePerUnit(p.getPricePerUnit())
                .unit(p.getUnit())
                .stockQuantity(p.getStockQuantity())
                .location(p.getLocation())
                .imageUrl(p.getImageUrl())
                .status(p.getStatus())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
