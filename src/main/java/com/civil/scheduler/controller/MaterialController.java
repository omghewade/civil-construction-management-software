package com.civil.scheduler.controller;

import com.civil.scheduler.entity.Material;
import com.civil.scheduler.repository.MaterialRepository;
import com.civil.scheduler.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Material>> getMaterialsByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(materialRepository.findByProjectId(projectId));
    }

    @PostMapping("/project/{projectId}")
    public ResponseEntity<?> addMaterial(@PathVariable Long projectId, @RequestBody Material material) {
        return projectRepository.findById(projectId).map(project -> {
            material.setProject(project);
            Material saved = materialRepository.save(material);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMaterial(@PathVariable Long id, @RequestBody Material updatedMaterial) {
        return materialRepository.findById(id).map(material -> {
            material.setTotalAvailable(updatedMaterial.getTotalAvailable());
            material.setDailyConsumptionRate(updatedMaterial.getDailyConsumptionRate());
            material.setRefillDateTarget(updatedMaterial.getRefillDateTarget());
            Material saved = materialRepository.save(material);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMaterial(@PathVariable Long id) {
        return materialRepository.findById(id).map(material -> {
            materialRepository.delete(material);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
