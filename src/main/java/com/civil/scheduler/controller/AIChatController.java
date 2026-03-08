package com.civil.scheduler.controller;

import com.civil.scheduler.service.WebScrapingService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.*;

@RestController
@RequestMapping("/api/ai")
public class AIChatController {

    private final WebScrapingService webScrapingService;
    private final RestClient restClient;

    private static final String AI_API_KEY = "AIzaSyCJOh44Ln5WeEVkZ0FJdZzw-UcXNwEd2QU";
    private static final String AI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key="
            + AI_API_KEY;

    public AIChatController(WebScrapingService webScrapingService) {
        this.webScrapingService = webScrapingService;
        this.restClient = RestClient.create();
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody Map<String, String> request) {
        String message = request.getOrDefault("message", "");
        if (message.isBlank()) {
            return Map.of("response", "Please enter a message.", "source", "SYSTEM");
        }

        // Prefix the prompt with construction context
        String prompt = "You are CivilTrack AI, an expert assistant for civil construction project management. " +
                "Answer the following question concisely and professionally, focusing on construction, civil engineering, "
                +
                "project management, safety, IS codes, and best practices.\n\nQuestion: " + message;

        // Try Gemini AI first
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
            body.put("generationConfig", Map.of());

            Map<String, Object> aiResponse = restClient.post()
                    .uri(AI_URL)
                    .header("Content-Type", "application/json")
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (aiResponse != null) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) aiResponse.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    if (content != null) {
                        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            String text = (String) parts.get(0).get("text");
                            if (text != null && !text.isBlank()) {
                                return Map.of("response", text, "source", "AI");
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            // AI failed, fall through to web scraping
            System.out.println("AI API failed: " + e.getMessage() + ". Falling back to web scraping.");
        }

        // Fallback: Web scraping
        try {
            String scrapedAnswer = webScrapingService.scrapeAnswer(message);
            return Map.of("response", scrapedAnswer, "source", "WEB_SCRAPE");
        } catch (Exception e) {
            return Map.of(
                    "response", "Both AI and web search are currently unavailable. Please try again later.",
                    "source", "ERROR");
        }
    }
}
