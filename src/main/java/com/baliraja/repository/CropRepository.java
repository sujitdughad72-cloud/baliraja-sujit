package com.baliraja.repository;

import com.baliraja.entity.Crop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CropRepository extends JpaRepository<Crop, Long> {

    Optional<Crop> findByNameIgnoreCase(String name);

    Optional<Crop> findByNameMr(String nameMr);
}
