package com.baliraja.client;

import com.baliraja.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
@Slf4j
public class PythonAiClient {

    private final RestTemplate restTemplate;

    @Value("${ai.service.base-url:http://localhost:8000}")
    private String aiServiceBaseUrl;

    public CropRecommendationResponse predictCrop(CropRecommendationRequest request) {
        String url = aiServiceBaseUrl + "/predict/crop";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<CropRecommendationRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<CropRecommendationResponse> response =
                    restTemplate.postForEntity(url, entity, CropRecommendationResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                CropRecommendationResponse body = response.getBody();
                body.setModelSource("PYTHON_FASTAPI");
                return body;
            }
        } catch (ResourceAccessException ex) {
            log.warn("Python AI Service is currently unreachable at {}: {}", url, ex.getMessage());
        } catch (RestClientResponseException ex) {
            log.error("Python AI Service returned HTTP error {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("Unexpected error contacting Python AI Service: {}", ex.getMessage());
        }
        return null;
    }

    public DiseasePredictionResponse predictDisease(DiseasePredictionRequest request) {
        String url = aiServiceBaseUrl + "/predict/disease";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<DiseasePredictionRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<DiseasePredictionResponse> response =
                    restTemplate.postForEntity(url, entity, DiseasePredictionResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                DiseasePredictionResponse body = response.getBody();
                body.setModelSource("PYTHON_FASTAPI");
                return body;
            }
        } catch (ResourceAccessException ex) {
            log.warn("Python AI Service is unreachable at {}: {}", url, ex.getMessage());
        } catch (RestClientResponseException ex) {
            log.error("Python AI Service returned HTTP error {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("Unexpected error calling Python disease predictor: {}", ex.getMessage());
        }
        return null;
    }

    public SoilAnalysisResponse analyzeSoil(SoilAnalysisRequest request) {
        String url = aiServiceBaseUrl + "/predict/soil";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<SoilAnalysisRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<SoilAnalysisResponse> response =
                    restTemplate.postForEntity(url, entity, SoilAnalysisResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                SoilAnalysisResponse body = response.getBody();
                body.setModelSource("PYTHON_FASTAPI");
                return body;
            }
        } catch (ResourceAccessException ex) {
            log.warn("Python AI Service is unreachable at {}: {}", url, ex.getMessage());
        } catch (RestClientResponseException ex) {
            log.error("Python AI Service returned HTTP error {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("Unexpected error calling Python soil analyzer: {}", ex.getMessage());
        }
        return null;
    }

    public boolean isServiceHealthy() {
        String url = aiServiceBaseUrl + "/health";
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            return false;
        }
    }
}
