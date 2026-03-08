package com.civil.scheduler.controller;

import com.civil.scheduler.service.GeofenceService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class GeofenceController {

    private final GeofenceService geofenceService;

    public GeofenceController(GeofenceService geofenceService) {
        this.geofenceService = geofenceService;
    }

    @PostMapping("/equipment/{id}/ping-location")
    public Map<String, Object> pingLocation(
            @PathVariable Long id,
            @RequestBody Map<String, Double> coords) {
        double lat = coords.getOrDefault("latitude", 0.0);
        double lon = coords.getOrDefault("longitude", 0.0);
        return geofenceService.processLocationPing(id, lat, lon);
    }

    @GetMapping("/geofence/{projectId}/status")
    public Map<String, Object> getGeofenceStatus(@PathVariable Long projectId) {
        return geofenceService.getProjectGeofenceStatus(projectId);
    }
}
