package com.civil.scheduler.controller;

import com.civil.scheduler.entity.LaborForce;
import com.civil.scheduler.repository.LaborForceRepository;
import com.civil.scheduler.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/labor")
public class LaborForceController {

    @Autowired
    private LaborForceRepository laborForceRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<LaborForce>> getLaborByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(laborForceRepository.findByProjectId(projectId));
    }

    @PostMapping("/project/{projectId}")
    public ResponseEntity<?> addLabor(@PathVariable Long projectId, @RequestBody LaborForce labor) {
        return projectRepository.findById(projectId).map(project -> {
            labor.setProject(project);
            LaborForce saved = laborForceRepository.save(labor);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateLabor(@PathVariable Long id, @RequestBody LaborForce updatedLabor) {
        return laborForceRepository.findById(id).map(labor -> {
            labor.setCount(updatedLabor.getCount());
            labor.setDailyWage(updatedLabor.getDailyWage());
            labor.setDaysWorked(updatedLabor.getDaysWorked());
            labor.setTotalPaid(updatedLabor.getTotalPaid());
            LaborForce saved = laborForceRepository.save(labor);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLabor(@PathVariable Long id) {
        return laborForceRepository.findById(id).map(labor -> {
            laborForceRepository.delete(labor);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
