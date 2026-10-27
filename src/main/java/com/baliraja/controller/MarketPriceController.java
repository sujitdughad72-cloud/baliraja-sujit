package com.baliraja.controller;

import com.baliraja.dto.MarketPriceDTO;
import com.baliraja.service.MarketPriceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/market-prices")
@RequiredArgsConstructor
@Tag(name = "Market & Mandi Rates", description = "Endpoints for APMC market rates and commodities across Maharashtra")
public class MarketPriceController {

    private final MarketPriceService marketPriceService;

    @GetMapping
    @Operation(summary = "Get latest market prices for all commodities")
    public ResponseEntity<List<MarketPriceDTO>> getLatestPrices() {
        return ResponseEntity.ok(marketPriceService.getLatestPrices());
    }

    @GetMapping("/crop/{cropName}")
    @Operation(summary = "Get market prices for a specific crop (e.g., Onion, Tomato)")
    public ResponseEntity<List<MarketPriceDTO>> getPricesByCrop(@PathVariable String cropName) {
        return ResponseEntity.ok(marketPriceService.getPricesByCrop(cropName));
    }

    @GetMapping("/district/{district}")
    @Operation(summary = "Get market prices in a specific district (e.g., Nashik, Pune)")
    public ResponseEntity<List<MarketPriceDTO>> getPricesByDistrict(@PathVariable String district) {
        return ResponseEntity.ok(marketPriceService.getPricesByDistrict(district));
    }
}
