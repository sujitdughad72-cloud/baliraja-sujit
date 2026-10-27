package com.baliraja.repository;

import com.baliraja.entity.SensorReadingEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SensorReadingRepository extends JpaRepository<SensorReadingEntity, Long> {

    List<SensorReadingEntity> findByDeviceIdOrderByRecordedAtDesc(String deviceId, Pageable pageable);

    @Query("SELECT s FROM SensorReadingEntity s WHERE s.deviceId = :deviceId ORDER BY s.recordedAt DESC")
    Optional<SensorReadingEntity> findLatestByDeviceId(@Param("deviceId") String deviceId);

    List<SensorReadingEntity> findAllByOrderByRecordedAtDesc(Pageable pageable);
}
