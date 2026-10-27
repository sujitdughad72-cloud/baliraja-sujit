package com.baliraja.repository;

import com.baliraja.entity.Farmer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FarmerRepository extends JpaRepository<Farmer, Long> {

    Optional<Farmer> findByUserId(Long userId);

    List<Farmer> findByDistrictIgnoreCase(String district);

    List<Farmer> findByTalukaIgnoreCase(String taluka);
}
