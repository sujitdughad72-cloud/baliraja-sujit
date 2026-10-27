package com.baliraja.repository;

import com.baliraja.entity.MarketPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MarketPriceRepository extends JpaRepository<MarketPrice, Long> {

    List<MarketPrice> findByCropNameIgnoreCaseOrderByPriceDateDesc(String cropName);

    List<MarketPrice> findByDistrictIgnoreCaseOrderByPriceDateDesc(String district);

    List<MarketPrice> findByPriceDate(LocalDate priceDate);

    @Query("SELECT m FROM MarketPrice m WHERE m.priceDate = " +
           "(SELECT MAX(m2.priceDate) FROM MarketPrice m2 WHERE LOWER(m2.cropName) = LOWER(m.cropName)) " +
           "ORDER BY m.cropName ASC")
    List<MarketPrice> findLatestPricesForAllCrops();

    @Query("SELECT DISTINCT m.cropName FROM MarketPrice m ORDER BY m.cropName ASC")
    List<String> findDistinctCropNames();
}
