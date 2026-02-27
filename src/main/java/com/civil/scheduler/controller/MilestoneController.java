package com.civil.scheduler.controller;

import com.civil.scheduler.entity.Milestone;
import com.civil.scheduler.service.MilestoneService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/milestones")
public class MilestoneController {

    private final MilestoneService milestoneService;

    public MilestoneController(MilestoneService milestoneService) {
        this.milestoneService = milestoneService;
    }

    @GetMapping
    public ResponseEntity<List<Milestone>> getMilestones(@PathVariable Long projectId) {
        return ResponseEntity.ok(milestoneService.getMilestonesByProject(projectId));
    }

    @PostMapping
    public ResponseEntity<Milestone> createMilestone(@PathVariable Long projectId,
            @Valid @RequestBody Milestone milestone) {
        return ResponseEntity.ok(milestoneService.createMilestone(projectId, milestone));
    }

    @PutMapping("/{milestoneId}")
    public ResponseEntity<Milestone> updateMilestone(@PathVariable Long projectId, @PathVariable Long milestoneId,
            @Valid @RequestBody Milestone milestone) {
        return ResponseEntity.ok(milestoneService.updateMilestone(milestoneId, milestone));
    }

    @DeleteMapping("/{milestoneId}")
    public ResponseEntity<Void> deleteMilestone(@PathVariable Long projectId, @PathVariable Long milestoneId) {
        milestoneService.deleteMilestone(milestoneId);
        return ResponseEntity.ok().build();
    }
}
