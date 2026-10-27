package com.baliraja.controller;

import com.baliraja.dto.ProductRequest;
import com.baliraja.dto.ProductResponse;
import com.baliraja.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Products & Marketplace", description = "Endpoints for agricultural produce listing, search, and details")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "List all available crops and produce")
    public ResponseEntity<List<ProductResponse>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllAvailableProducts());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get product details by ID")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping("/search")
    @Operation(summary = "Search products by keyword (name, Marathi name, location)")
    public ResponseEntity<List<ProductResponse>> searchProducts(@RequestParam(name = "q", defaultValue = "") String query) {
        return ResponseEntity.ok(productService.searchProducts(query));
    }

    @GetMapping("/category/{categoryId}")
    @Operation(summary = "Filter products by category ID")
    public ResponseEntity<List<ProductResponse>> getByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(productService.getProductsByCategory(categoryId));
    }

    @PostMapping
    @Operation(summary = "Add a new crop listing (Farmer)")
    public ResponseEntity<ProductResponse> createProduct(
            @RequestParam(name = "farmerId", required = false, defaultValue = "1") Long farmerId,
            @Valid @RequestBody ProductRequest request
    ) {
        Long targetFarmerId = request.getFarmerId() != null ? request.getFarmerId() : farmerId;
        ProductResponse response = productService.createProduct(targetFarmerId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing crop listing")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable Long id,
            @RequestBody ProductRequest request
    ) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete or archive a crop listing")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}
