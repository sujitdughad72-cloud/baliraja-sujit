
package in.baliraja.controller;

import in.baliraja.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiController {

    @Autowired
    private GeminiService geminiService;

    @PostMapping("/advice")
    public Map<String, String> getAdvice(@RequestBody Map<String, String> request) {
        try {
            String crop = request.get("crop");
            String advice = geminiService.getMarketAdvice(crop);
            return Map.of("response", advice);
        } catch (Exception e) {
            return Map.of("error", "AI Error: " + e.getMessage());
        }
    }
}
