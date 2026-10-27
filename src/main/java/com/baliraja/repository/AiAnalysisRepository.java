package com.baliraja.repository;

import com.baliraja.entity.AiAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiAnalysisRepository extends JpaRepository<AiAnalysis, Long> {

    List<AiAnalysis> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<AiAnalysis> findByUserIdAndAnalysisTypeOrderByCreatedAtDesc(Long userId, String analysisType);
}
