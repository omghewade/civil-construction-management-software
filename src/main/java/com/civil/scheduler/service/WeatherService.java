package com.civil.scheduler.service;

import com.civil.scheduler.entity.Project;
import com.civil.scheduler.entity.Task;
import com.civil.scheduler.repository.ProjectRepository;
import com.civil.scheduler.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class WeatherService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final RestClient restClient;

    public WeatherService(ProjectRepository projectRepository, TaskRepository taskRepository) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.restClient = RestClient.create();
    }

    /**
     * Fetch 7-day forecast from Open-Meteo API
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getForecast(double lat, double lon) {
        String url = String.format(
                "https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s" +
                        "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code"
                        +
                        "&current=temperature_2m,precipitation,weather_code" +
                        "&timezone=auto&forecast_days=7",
                lat, lon);

        return restClient.get().uri(url).retrieve().body(Map.class);
    }

    /**
     * Get weather alerts for weather-sensitive tasks in a project
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getWeatherAlerts(Long projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null)
            return Collections.emptyList();

        double lat = project.getLatitude() != null ? project.getLatitude() : 19.076;
        double lon = project.getLongitude() != null ? project.getLongitude() : 72.8777;

        Map<String, Object> forecast;
        try {
            forecast = getForecast(lat, lon);
        } catch (Exception e) {
            return Collections.emptyList();
        }

        Map<String, Object> daily = (Map<String, Object>) forecast.get("daily");
        if (daily == null)
            return Collections.emptyList();

        List<String> dates = (List<String>) daily.get("time");
        List<Number> precipitations = (List<Number>) daily.get("precipitation_sum");
        List<Number> windSpeeds = (List<Number>) daily.get("wind_speed_10m_max");
        List<Number> tempMax = (List<Number>) daily.get("temperature_2m_max");
        List<Number> weatherCodes = (List<Number>) daily.get("weather_code");

        List<Task> tasks = taskRepository.findByProjectId(projectId);
        List<Task> weatherSensitiveTasks = tasks.stream()
                .filter(t -> Boolean.TRUE.equals(t.getWeatherSensitive()))
                .toList();

        List<Map<String, Object>> alerts = new ArrayList<>();

        for (int i = 0; i < dates.size(); i++) {
            LocalDate forecastDate = LocalDate.parse(dates.get(i));
            double precip = precipitations.get(i).doubleValue();
            double wind = windSpeeds.get(i).doubleValue();
            double temp = tempMax.get(i).doubleValue();
            int code = weatherCodes.get(i).intValue();

            String condition = null;
            String severity = null;

            if (precip > 10) {
                condition = "Heavy Rain (" + precip + "mm)";
                severity = "HIGH";
            } else if (precip > 2) {
                condition = "Moderate Rain (" + precip + "mm)";
                severity = "MEDIUM";
            }

            if (wind > 50) {
                condition = (condition != null ? condition + " + " : "") + "Strong Wind (" + wind + "km/h)";
                severity = "HIGH";
            }

            if (temp > 45) {
                condition = (condition != null ? condition + " + " : "") + "Extreme Heat (" + temp + "°C)";
                severity = "HIGH";
            }

            if (condition == null)
                continue;

            // Find tasks overlapping this date
            for (Task task : weatherSensitiveTasks) {
                LocalDate taskStart = task.getStartDate();
                LocalDate taskEnd = task.getDeadline();
                if (taskStart != null && taskEnd != null &&
                        !forecastDate.isBefore(taskStart) && !forecastDate.isAfter(taskEnd)) {

                    Map<String, Object> alert = new LinkedHashMap<>();
                    alert.put("date", dates.get(i));
                    alert.put("taskName", task.getName());
                    alert.put("taskId", task.getId());
                    alert.put("condition", condition);
                    alert.put("severity", severity);
                    alert.put("recommendation", getRecommendation(code, precip, wind));
                    alerts.add(alert);
                }
            }
        }

        return alerts;
    }

    private String getRecommendation(int weatherCode, double precip, double wind) {
        if (precip > 10)
            return "Postpone outdoor concrete work and excavation. Cover exposed materials.";
        if (wind > 50)
            return "Suspend crane operations and secure scaffolding immediately.";
        if (precip > 2)
            return "Monitor conditions. Protect fresh concrete with covers.";
        return "Review schedule and take standard precautions.";
    }
}
