package com.baliraja.service;

import com.baliraja.dto.SensorReadingRequest;
import com.baliraja.dto.SensorReadingResponse;
import com.baliraja.entity.SensorReadingEntity;
import com.baliraja.repository.SensorReadingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
@RequiredArgsConstructor
@Slf4j
public class SensorService {

    private final SensorReadingRepository sensorReadingRepository;
    private final ConcurrentLinkedDeque<SensorReadingRequest> recentTelemetry = new ConcurrentLinkedDeque<>();

    public SensorReadingResponse processReading(SensorReadingRequest request) {
        log.info("Processing IoT sensor reading from device: {}, Moisture: {}%, Temp: {}°C, N: {}, P: {}, K: {}",
                request.getDeviceId(), request.getMoisture(), request.getTemperature(), request.getNitrogen(), request.getPhosphorus(), request.getPotassium());

        recentTelemetry.addFirst(request);
        if (recentTelemetry.size() > 100) {
            recentTelemetry.removeLast();
        }

        // Persist to MySQL database (with graceful fallback if DB is offline)
        try {
            SensorReadingEntity entity = SensorReadingEntity.builder()
                    .deviceId(request.getDeviceId() != null ? request.getDeviceId() : "BALIRAJA-ESP32-01")
                    .deviceName(request.getDeviceName() != null ? request.getDeviceName() : "Main Farm Plot")
                    .soilMoisture(BigDecimal.valueOf(request.getMoisture() != null ? request.getMoisture() : 50.0))
                    .temperature(request.getTemperature() != null ? BigDecimal.valueOf(request.getTemperature()) : BigDecimal.valueOf(26.5))
                    .humidity(request.getHumidity() != null ? BigDecimal.valueOf(request.getHumidity()) : BigDecimal.valueOf(60.0))
                    .nitrogen(BigDecimal.valueOf(request.getNitrogen() != null ? request.getNitrogen() : 55.0))
                    .phosphorus(BigDecimal.valueOf(request.getPhosphorus() != null ? request.getPhosphorus() : 28.0))
                    .potassium(BigDecimal.valueOf(request.getPotassium() != null ? request.getPotassium() : 42.0))
                    .ph(BigDecimal.valueOf(request.getPh() != null ? request.getPh() : 6.8))
                    .ec(BigDecimal.valueOf(request.getEc() != null ? request.getEc() : 410.0))
                    .battery(request.getBattery() != null ? request.getBattery() : 95)
                    .rawAdcValue(request.getRawAdc() != null ? request.getRawAdc() : 2200)
                    .status("HEALTHY")
                    .build();
            sensorReadingRepository.save(entity);
            log.info("Successfully persisted sensor telemetry to MySQL table sensor_readings");
        } catch (Exception ex) {
            log.warn("Could not persist to MySQL (using in-memory buffer): {}", ex.getMessage());
        }

        double m = request.getMoisture() != null ? request.getMoisture() : 50.0;
        double n = request.getNitrogen() != null ? request.getNitrogen() : 50.0;
        double p = request.getPhosphorus() != null ? request.getPhosphorus() : 25.0;
        double k = request.getPotassium() != null ? request.getPotassium() : 40.0;
        double ph = request.getPh() != null ? request.getPh() : 6.8;

        // Moisture Assessment
        String moistureAssessment;
        String irrigationAction;
        long waterRequired = 0;

        if (m < 22.0) {
            moistureAssessment = "CRITICAL_DRY";
            irrigationAction = "मातीतील ओलावा अत्यंत कमी झाला आहे. पिकाला सुकवा येण्याआधी तात्काळ ठिबक किंवा स्प्रिंकलर सुरू करा.";
            waterRequired = Math.round((55.0 - m) * 1200);
        } else if (m < 40.0) {
            moistureAssessment = "LOW_MOISTURE";
            irrigationAction = "ओलावा कमी होत आहे. पुढील २४ तासांत हलके पाणी द्यावे.";
            waterRequired = Math.round((55.0 - m) * 1000);
        } else if (m <= 70.0) {
            moistureAssessment = "OPTIMAL_FIELD_CAPACITY";
            irrigationAction = "मुळांच्या वाढीसाठी आणि अन्नद्रव्ये शोषण्यासाठी जमिनीतील ओलावा उत्तम स्थितीत आहे.";
            waterRequired = 0;
        } else {
            moistureAssessment = "WATERLOGGED";
            irrigationAction = "माती पूर्ण संपृक्त आहे, मुळांना हवा खेळती राहत नाही. तात्काळ पाण्याचा निचरा करा.";
            waterRequired = 0;
        }

        // Fertilizer calculations (Deficit vs Baseline N:60, P:30, K:40)
        double dapBags = p < 30 ? Math.max(1.0, Math.round(((30 - p) / 15.0) * 10.0) / 10.0) : 0.5;
        double remainingNDeficit = Math.max(0.0, (60.0 - n) - (dapBags * 4.5));
        double ureaBags = remainingNDeficit > 0 ? Math.max(1.0, Math.round((remainingNDeficit / 18.0) * 10.0) / 10.0) : 0.5;
        double mopBags = k < 40 ? Math.max(1.0, Math.round(((40 - k) / 20.0) * 10.0) / 10.0) : 0.5;

        // Soil Health Score (0-100)
        int healthScore = (int) Math.round(
                (m >= 45 && m <= 68 ? 95 : 60) * 0.30 +
                (ph >= 6.5 && ph <= 7.5 ? 95 : 65) * 0.25 +
                (n >= 40 && n <= 75 ? 90 : 60) * 0.25 +
                (p >= 20 && p <= 45 ? 90 : 65) * 0.10 +
                (k >= 30 && k <= 60 ? 90 : 65) * 0.10
        );

        String healthCategory = healthScore >= 82 ? "उत्कृष्ट (Optimal)" : healthScore >= 60 ? "मध्यम (Moderate)" : "सुधारणा आवश्यक (Needs Attention)";

        // Crop recommendation
        String cropEn = "Onion";
        String cropMr = "कांदा (Onion)";
        int suitability = 94;

        if (n > 70 && m > 55) {
            cropEn = "Sugarcane";
            cropMr = "ऊस (Sugarcane)";
            suitability = 96;
        } else if (n < 45 && p > 25) {
            cropEn = "Soybean";
            cropMr = "सोयाबीन (Soybean)";
            suitability = 91;
        } else if (ph > 7.2 && m < 50) {
            cropEn = "Cotton";
            cropMr = "कापूस (Cotton)";
            suitability = 92;
        }

        List<String> alerts = new ArrayList<>();
        if (m < 22) alerts.add("तात्काळ सिंचन आवश्यक (Moisture < 22%)");
        if (m > 80) alerts.add("पाणी साचले आहे - चर मोकळे करा (Waterlogging Alert)");
        if (n < 25) alerts.add("नत्र (Nitrogen) तीव्र कमतरता - युरिया डोस द्या");

        String summaryMr = String.format("सेन्सरनुसार माती आरोग्य गुण %d/१०० असून %s पिकासाठी %d%% अनुकूलता आहे. ओलावा %.1f%% आहे.",
                healthScore, cropMr, suitability, m);

        return SensorReadingResponse.builder()
                .deviceId(request.getDeviceId())
                .status("SUCCESS")
                .moistureLevel(m)
                .moistureAssessment(moistureAssessment)
                .irrigationAction(irrigationAction)
                .waterRequiredLitersPerAcre(waterRequired)
                .soilHealthScore(healthScore)
                .soilHealthCategory(healthCategory)
                .ureaBagsRecommended(ureaBags)
                .dapBagsRecommended(dapBags)
                .mopBagsRecommended(mopBags)
                .topRecommendedCrop(cropEn)
                .topRecommendedCropMr(cropMr)
                .suitabilityScore(suitability)
                .agronomicAlerts(alerts)
                .advisorySummaryMr(summaryMr)
                .build();
    }

    public List<SensorReadingRequest> getRecentTelemetry(int limit) {
        List<SensorReadingRequest> list = new ArrayList<>();
        int count = 0;
        for (SensorReadingRequest req : recentTelemetry) {
            list.add(req);
            count++;
            if (count >= limit) break;
        }
        return list;
    }
}
