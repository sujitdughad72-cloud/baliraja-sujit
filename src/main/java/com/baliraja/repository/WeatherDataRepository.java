package com.baliraja.repository;

import com.baliraja.entity.WeatherData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WeatherDataRepository extends JpaRepository<WeatherData, Long> {

    Optional<WeatherData> findTopByDistrictIgnoreCaseOrderByRecordedAtDesc(String district);

    List<WeatherData> findByDistrictIgnoreCaseOrderByRecordedAtDesc(String district);
}
