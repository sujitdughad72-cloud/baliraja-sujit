package com.baliraja.service;

import com.baliraja.dto.MarketPriceDTO;
import com.baliraja.entity.MarketPrice;
import com.baliraja.repository.MarketPriceRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarketPriceService {

    private final MarketPriceRepository marketPriceRepository;

    private static final Map<String, String> MARATHI_NAMES = Map.of(
            "Onion", "कांदा (Onion)",
            "Tomato", "टोमॅटो (Tomato)",
            "Grapes", "द्राक्षे (Grapes)",
            "Pomegranate", "डाळिंब (Pomegranate)",
            "Soybean", "सोयाबीन (Soybean)",
            "Cotton", "कापूस (Cotton)",
            "Wheat", "गहू (Wheat)",
            "Sugarcane", "ऊस (Sugarcane)",
            "Banana", "केळी (Banana)",
            "Potato", "बटाटा (Potato)"
    );

    @PostConstruct
    public void seedMandiPrices() {
        if (marketPriceRepository.count() == 0) {
            LocalDate today = LocalDate.now();
            List<MarketPrice> sampleRates = List.of(
                    MarketPrice.builder().cropName("Onion").marketName("Lasalgaon APMC").district("Nashik").minPrice(new BigDecimal("1450")).maxPrice(new BigDecimal("2100")).modalPrice(new BigDecimal("1850")).arrivalsTonnes(new BigDecimal("420")).priceDate(today).build(),
                    MarketPrice.builder().cropName("Tomato").marketName("Narayangaon APMC").district("Pune").minPrice(new BigDecimal("900")).maxPrice(new BigDecimal("1600")).modalPrice(new BigDecimal("1250")).arrivalsTonnes(new BigDecimal("180")).priceDate(today).build(),
                    MarketPrice.builder().cropName("Grapes").marketName("Pimpalgaon APMC").district("Nashik").minPrice(new BigDecimal("3500")).maxPrice(new BigDecimal("5800")).modalPrice(new BigDecimal("4800")).arrivalsTonnes(new BigDecimal("95")).priceDate(today).build(),
                    MarketPrice.builder().cropName("Pomegranate").marketName("Sangola APMC").district("Solapur").minPrice(new BigDecimal("5000")).maxPrice(new BigDecimal("9500")).modalPrice(new BigDecimal("7200")).arrivalsTonnes(new BigDecimal("60")).priceDate(today).build(),
                    MarketPrice.builder().cropName("Soybean").marketName("Latur APMC").district("Latur").minPrice(new BigDecimal("4200")).maxPrice(new BigDecimal("4750")).modalPrice(new BigDecimal("4550")).arrivalsTonnes(new BigDecimal("310")).priceDate(today).build(),
                    MarketPrice.builder().cropName("Cotton").marketName("Jalna APMC").district("Jalna").minPrice(new BigDecimal("6800")).maxPrice(new BigDecimal("7450")).modalPrice(new BigDecimal("7150")).arrivalsTonnes(new BigDecimal("150")).priceDate(today).build(),
                    MarketPrice.builder().cropName("Banana").marketName("Raver APMC").district("Jalgaon").minPrice(new BigDecimal("1100")).maxPrice(new BigDecimal("1800")).modalPrice(new BigDecimal("1450")).arrivalsTonnes(new BigDecimal("220")).priceDate(today).build(),
                    MarketPrice.builder().cropName("Wheat").marketName("Akola APMC").district("Akola").minPrice(new BigDecimal("2350")).maxPrice(new BigDecimal("2780")).modalPrice(new BigDecimal("2550")).arrivalsTonnes(new BigDecimal("190")).priceDate(today).build()
            );
            marketPriceRepository.saveAll(sampleRates);
        }
    }

    @Transactional(readOnly = true)
    public List<MarketPriceDTO> getLatestPrices() {
        List<MarketPrice> latest = marketPriceRepository.findLatestPricesForAllCrops();
        if (latest.isEmpty()) {
            latest = marketPriceRepository.findAll();
        }
        return latest.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MarketPriceDTO> getPricesByCrop(String cropName) {
        return marketPriceRepository.findByCropNameIgnoreCaseOrderByPriceDateDesc(cropName)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MarketPriceDTO> getPricesByDistrict(String district) {
        return marketPriceRepository.findByDistrictIgnoreCaseOrderByPriceDateDesc(district)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public MarketPriceDTO savePrice(MarketPrice marketPrice) {
        MarketPrice saved = marketPriceRepository.save(marketPrice);
        return mapToDTO(saved);
    }

    private MarketPriceDTO mapToDTO(MarketPrice m) {
        String mrName = MARATHI_NAMES.getOrDefault(m.getCropName(), m.getCropName());
        return MarketPriceDTO.builder()
                .id(m.getId())
                .commodity(m.getCropName())
                .commodityMr(mrName)
                .market(m.getMarketName())
                .marketMr(m.getMarketName())
                .district(m.getDistrict())
                .state(m.getState())
                .minPrice(m.getMinPrice())
                .maxPrice(m.getMaxPrice())
                .modalPrice(m.getModalPrice())
                .priceUnit("₹ / क्विंटल")
                .trend("UP")
                .priceDate(m.getPriceDate())
                .build();
    }
}
