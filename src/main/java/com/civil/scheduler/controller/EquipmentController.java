package com.civil.scheduler.controller;

import com.civil.scheduler.entity.Equipment;
import com.civil.scheduler.repository.EquipmentRepository;
import com.civil.scheduler.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Equipment>> getEquipmentByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(equipmentRepository.findByProjectId(projectId));
    }

    @PostMapping("/project/{projectId}")
    public ResponseEntity<?> addEquipment(@PathVariable Long projectId, @RequestBody Equipment equipment) {
        return projectRepository.findById(projectId).map(project -> {
            equipment.setProject(project);
            Equipment saved = equipmentRepository.save(equipment);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEquipmentStatus(@PathVariable Long id,
            @RequestBody Map<String, Integer> updateStatus) {
        return equipmentRepository.findById(id).map(equipment -> {
            if (updateStatus.containsKey("inUse")) {
                equipment.setInUse(updateStatus.get("inUse"));
            }
            if (updateStatus.containsKey("inMaintenance")) {
                equipment.setInMaintenance(updateStatus.get("inMaintenance"));
            }
            if (updateStatus.containsKey("totalQuantity")) {
                equipment.setTotalQuantity(updateStatus.get("totalQuantity"));
            }
            Equipment saved = equipmentRepository.save(equipment);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEquipment(@PathVariable Long id) {
        return equipmentRepository.findById(id).map(equipment -> {
            equipmentRepository.delete(equipment);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
