package com.civil.scheduler.controller;

import com.civil.scheduler.service.SustainabilityService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/sustainability")
public class SustainabilityController {

    private final SustainabilityService sustainabilityService;

    public SustainabilityController(SustainabilityService sustainabilityService) {
        this.sustainabilityService = sustainabilityService;
    }

    @GetMapping("/{projectId}")
    public Map<String, Object> getReport(@PathVariable Long projectId) {
        return sustainabilityService.getReport(projectId);
    }
}
