package com.civil.scheduler.service;

import com.civil.scheduler.entity.*;
import com.civil.scheduler.repository.EquipmentRepository;
import com.civil.scheduler.repository.IssueRepository;
import com.civil.scheduler.repository.ProjectRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class GeofenceService {

    private final ProjectRepository projectRepository;
    private final EquipmentRepository equipmentRepository;
    private final IssueRepository issueRepository;
    private final ActivityLogService activityLogService;

    public GeofenceService(ProjectRepository projectRepository,
            EquipmentRepository equipmentRepository,
            IssueRepository issueRepository,
            ActivityLogService activityLogService) {
        this.projectRepository = projectRepository;
        this.equipmentRepository = equipmentRepository;
        this.issueRepository = issueRepository;
        this.activityLogService = activityLogService;
    }

    /**
     * Process an equipment GPS ping. Returns breach status.
     */
    public Map<String, Object> processLocationPing(Long equipmentId, double lat, double lon) {
        Equipment equipment = equipmentRepository.findById(equipmentId).orElse(null);
        if (equipment == null) {
            return Map.of("error", "Equipment not found");
        }

        // Update equipment location
        equipment.setLastLatitude(lat);
        equipment.setLastLongitude(lon);
        equipment.setLastPingTime(LocalDateTime.now());
        equipmentRepository.save(equipment);

        Project project = equipment.getProject();
        if (project.getLatitude() == null || project.getLongitude() == null || project.getGeofenceRadius() == null) {
            return Map.of("status", "NO_GEOFENCE", "message", "Project has no geofence configured");
        }

        double distance = haversineDistance(
                project.getLatitude(), project.getLongitude(),
                lat, lon);

        boolean breached = distance > project.getGeofenceRadius();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("equipmentId", equipmentId);
        result.put("equipmentName", equipment.getName());
        result.put("latitude", lat);
        result.put("longitude", lon);
        result.put("distanceFromSite", Math.round(distance));
        result.put("geofenceRadius", project.getGeofenceRadius());
        result.put("breached", breached);

        if (breached) {
            // Auto-create critical issue
            Issue issue = new Issue();
            issue.setProject(project);
            issue.setTitle("⚠️ GEO-FENCE BREACH: " + equipment.getName());
            issue.setDescription(String.format(
                    "Equipment '%s' detected %.0fm outside the project geo-fence (radius: %.0fm). " +
                            "Last known coordinates: %.6f, %.6f. Immediate investigation required.",
                    equipment.getName(), distance, project.getGeofenceRadius(), lat, lon));
            issue.setCategory(IssueCategory.SAFETY);
            issue.setSeverity(IssueSeverity.CRITICAL);
            issue.setStatus(IssueStatus.OPEN);
            issue.setReportedBy("SYSTEM - Geo-fence Monitor");
            issueRepository.save(issue);

            activityLogService.log("🚨 GEO-FENCE ALERT: " + equipment.getName() +
                    " detected " + Math.round(distance) + "m outside project boundary!");

            result.put("issueCreated", true);
        }

        return result;
    }

    /**
     * Get geofence status for all equipment in a project
     */
    public Map<String, Object> getProjectGeofenceStatus(Long projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null)
            return Map.of("error", "Project not found");

        List<Map<String, Object>> equipmentStatuses = new ArrayList<>();

        for (Equipment e : project.getEquipments()) {
            Map<String, Object> status = new LinkedHashMap<>();
            status.put("id", e.getId());
            status.put("name", e.getName());
            status.put("latitude", e.getLastLatitude());
            status.put("longitude", e.getLastLongitude());
            status.put("lastPing", e.getLastPingTime());

            if (e.getLastLatitude() != null && e.getLastLongitude() != null &&
                    project.getLatitude() != null && project.getLongitude() != null &&
                    project.getGeofenceRadius() != null) {

                double dist = haversineDistance(
                        project.getLatitude(), project.getLongitude(),
                        e.getLastLatitude(), e.getLastLongitude());
                status.put("distanceFromSite", Math.round(dist));
                status.put("withinFence", dist <= project.getGeofenceRadius());
            } else {
                status.put("distanceFromSite", null);
                status.put("withinFence", null);
            }

            equipmentStatuses.add(status);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("projectName", project.getName());
        result.put("siteLatitude", project.getLatitude());
        result.put("siteLongitude", project.getLongitude());
        result.put("geofenceRadius", project.getGeofenceRadius());
        result.put("equipment", equipmentStatuses);

        return result;
    }

    /**
     * Haversine formula to calculate distance between two GPS coordinates in
     * meters.
     */
    private double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000; // Earth radius in meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
