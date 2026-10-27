package com.baliraja.service;

import com.baliraja.entity.Category;
import com.baliraja.exception.ResourceNotFoundException;
import com.baliraja.repository.CategoryRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @PostConstruct
    public void initCategories() {
        if (categoryRepository.count() == 0) {
            categoryRepository.save(Category.builder().name("Vegetables").nameMr("भाज्या").slug("vegetables").icon("🥕").build());
            categoryRepository.save(Category.builder().name("Fruits").nameMr("फळे").slug("fruits").icon("🍇").build());
            categoryRepository.save(Category.builder().name("Grains & Cereals").nameMr("धान्य").slug("grains").icon("🌾").build());
            categoryRepository.save(Category.builder().name("Pulses & Lentils").nameMr("कडधान्ये").slug("pulses").icon("🫘").build());
            categoryRepository.save(Category.builder().name("Spices & Condiments").nameMr("मसाले").slug("spices").icon("🌶️").build());
            categoryRepository.save(Category.builder().name("Cash Crops").nameMr("नगदी पिके").slug("cash-crops").icon("🌱").build());
        }
    }

    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));
    }

    @Transactional
    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }
}
