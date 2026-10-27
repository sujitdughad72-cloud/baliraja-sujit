package com.baliraja.repository;

import com.baliraja.entity.FarmerPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FarmerPlanRepository extends JpaRepository<FarmerPlan, Long> {

    List<FarmerPlan> findByFarmerIdOrderByCreatedAtDesc(Long farmerId);

    List<FarmerPlan> findByRegionAndSeasonAndYear(String region, String season, Integer year);

    @Query("SELECT fp.plannedCrop, COUNT(fp), SUM(fp.landAcres) FROM FarmerPlan fp " +
           "WHERE LOWER(fp.region) = LOWER(:region) AND fp.season = :season AND fp.year = :year " +
           "GROUP BY fp.plannedCrop ORDER BY SUM(fp.landAcres) DESC")
    List<Object[]> findCropAggregatesByRegion(@Param("region") String region,
                                             @Param("season") String season,
                                             @Param("year") Integer year);
}
