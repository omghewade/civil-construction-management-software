package com.civil.scheduler.controller;

import com.civil.scheduler.service.WeatherService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {

    private final WeatherService weatherService;

    public WeatherController(WeatherService weatherService) {
        this.weatherService = weatherService;
    }

    @GetMapping("/forecast")
    public Map<String, Object> getForecast(
            @RequestParam(defaultValue = "19.076") double lat,
            @RequestParam(defaultValue = "72.8777") double lon) {
        return weatherService.getForecast(lat, lon);
    }

    @GetMapping("/alerts/{projectId}")
    public List<Map<String, Object>> getWeatherAlerts(@PathVariable Long projectId) {
        return weatherService.getWeatherAlerts(projectId);
    }
}
