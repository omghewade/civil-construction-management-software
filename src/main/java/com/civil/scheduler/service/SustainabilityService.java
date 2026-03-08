package com.civil.scheduler.service;

import com.civil.scheduler.entity.Equipment;
import com.civil.scheduler.entity.Material;
import com.civil.scheduler.entity.Project;
import com.civil.scheduler.repository.ProjectRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SustainabilityService {

    private final ProjectRepository projectRepository;

    public SustainabilityService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public Map<String, Object> getReport(Long projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return Map.of("error", "Project not found");
        }

        // Calculate material CO2
        double materialCO2 = 0;
        List<Map<String, Object>> materialBreakdown = new ArrayList<>();
        for (Material m : project.getMaterials()) {
            double co2 = (m.getTotalAvailable() != null ? m.getTotalAvailable() : 0)
                    * (m.getCo2PerUnit() != null ? m.getCo2PerUnit() : 0);
            materialCO2 += co2;
            if (co2 > 0) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("name", m.getName());
                item.put("quantity", m.getTotalAvailable());
                item.put("co2PerUnit", m.getCo2PerUnit());
                item.put("totalCO2", Math.round(co2 * 100.0) / 100.0);
                materialBreakdown.add(item);
            }
        }

        // Calculate equipment CO2
        double equipmentCO2 = 0;
        List<Map<String, Object>> equipmentBreakdown = new ArrayList<>();
        for (Equipment e : project.getEquipments()) {
            double co2 = (e.getHoursUsed() != null ? e.getHoursUsed() : 0)
                    * (e.getCo2PerHour() != null ? e.getCo2PerHour() : 0);
            equipmentCO2 += co2;
            if (co2 > 0) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("name", e.getName());
                item.put("hoursUsed", e.getHoursUsed());
                item.put("co2PerHour", e.getCo2PerHour());
                item.put("totalCO2", Math.round(co2 * 100.0) / 100.0);
                equipmentBreakdown.add(item);
            }
        }

        double totalCO2 = materialCO2 + equipmentCO2;

        // Calculate sustainability score (CO2 per lakh of budget)
        double budget = project.getBudget() != null ? project.getBudget() : 1;
        double co2PerLakh = (totalCO2 / (budget / 100000.0));

        String grade;
        String label;
        if (co2PerLakh <= 50) {
            grade = "A+";
            label = "Exceptional";
        } else if (co2PerLakh <= 100) {
            grade = "A";
            label = "Excellent";
        } else if (co2PerLakh <= 200) {
            grade = "B";
            label = "Good";
        } else if (co2PerLakh <= 400) {
            grade = "C";
            label = "Average";
        } else if (co2PerLakh <= 600) {
            grade = "D";
            label = "Below Average";
        } else {
            grade = "F";
            label = "Poor";
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("projectName", project.getName());
        result.put("totalCO2Kg", Math.round(totalCO2 * 100.0) / 100.0);
        result.put("materialCO2Kg", Math.round(materialCO2 * 100.0) / 100.0);
        result.put("equipmentCO2Kg", Math.round(equipmentCO2 * 100.0) / 100.0);
        result.put("materialBreakdown", materialBreakdown);
        result.put("equipmentBreakdown", equipmentBreakdown);
        result.put("co2PerLakhBudget", Math.round(co2PerLakh * 100.0) / 100.0);
        result.put("sustainabilityGrade", grade);
        result.put("sustainabilityLabel", label);
        result.put("budgetINR", budget);
        result.put("treesNeededToOffset", Math.round(totalCO2 / 21.77)); // ~21.77 kg CO2 per tree/year

        return result;
    }
}
