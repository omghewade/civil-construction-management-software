package com.civil.scheduler.controller;

import com.civil.scheduler.entity.SubTask;
import com.civil.scheduler.service.SubTaskService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks/{taskId}/subtasks")
public class SubTaskController {

    private final SubTaskService subTaskService;

    public SubTaskController(SubTaskService subTaskService) {
        this.subTaskService = subTaskService;
    }

    @GetMapping
    public ResponseEntity<List<SubTask>> getSubTasks(@PathVariable Long taskId) {
        return ResponseEntity.ok(subTaskService.getSubTasksByTask(taskId));
    }

    @PostMapping
    public ResponseEntity<SubTask> createSubTask(@PathVariable Long taskId, @Valid @RequestBody SubTask subTask) {
        return ResponseEntity.ok(subTaskService.createSubTask(taskId, subTask));
    }

    @PutMapping("/{subTaskId}")
    public ResponseEntity<SubTask> updateSubTask(@PathVariable Long taskId, @PathVariable Long subTaskId,
            @Valid @RequestBody SubTask subTask) {
        return ResponseEntity.ok(subTaskService.updateSubTask(subTaskId, subTask));
    }

    @DeleteMapping("/{subTaskId}")
    public ResponseEntity<Void> deleteSubTask(@PathVariable Long taskId, @PathVariable Long subTaskId) {
        subTaskService.deleteSubTask(subTaskId);
        return ResponseEntity.ok().build();
    }
}
