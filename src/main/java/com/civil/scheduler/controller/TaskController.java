package com.civil.scheduler.controller;

import com.civil.scheduler.entity.Project;
import com.civil.scheduler.entity.Task;
import com.civil.scheduler.entity.User;
import com.civil.scheduler.repository.ProjectRepository;
import com.civil.scheduler.repository.UserRepository;
import com.civil.scheduler.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TaskController {

    private final TaskService taskService;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public TaskController(TaskService taskService, ProjectRepository projectRepository, UserRepository userRepository) {
        this.taskService = taskService;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/projects/{projectId}/tasks")
    public List<Task> getTasksByProject(@PathVariable Long projectId) {
        return taskService.getTasksByProjectId(projectId);
    }

    @PostMapping("/projects/{projectId}/tasks")
    public ResponseEntity<?> createTask(@PathVariable Long projectId, @RequestBody Map<String, Object> taskData) {
        try {
            Project project = projectRepository.findById(projectId).orElseThrow();
            Task task = new Task();
            task.setProject(project);
            task.setName((String) taskData.get("name"));

            String start = (String) taskData.get("startDate");
            String end = (String) taskData.get("endDate");
            if (start != null && !start.isEmpty())
                task.setStartDate(LocalDate.parse(start));
            if (end != null && !end.isEmpty())
                task.setDeadline(LocalDate.parse(end));

            Object costObj = taskData.get("estimatedCost");
            if (costObj != null)
                task.setEstimatedCost(Double.parseDouble(costObj.toString()));

            String statusStr = (String) taskData.get("status");
            if (statusStr != null && !statusStr.isEmpty()) {
                try {
                    task.setStatus(com.civil.scheduler.entity.TaskStatus.valueOf(statusStr));
                } catch (Exception ignored) {
                }
            }

            if (taskData.get("assigneeId") != null) {
                Long engId = Long.parseLong(taskData.get("assigneeId").toString());
                User engineer = userRepository.findById(engId).orElse(null);
                task.setEngineer(engineer);
            }

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            User creator = userRepository.findByUsername(auth.getName()).orElse(null);

            Task created = taskService.createTask(task, creator);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error creating task: " + e.getMessage());
        }
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<?> deleteTask(@PathVariable Long taskId) {
        try {
            taskService.deleteTask(taskId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error deleting task.");
        }
    }

    @PutMapping("/tasks/{taskId}/progress")
    public ResponseEntity<?> updateTaskProgress(@PathVariable Long taskId,
            @RequestBody Map<String, Object> updateData) {
        try {
            Integer progress = Integer.parseInt(updateData.get("progress").toString());
            Double actualCost = updateData.get("actualCost") != null
                    ? Double.parseDouble(updateData.get("actualCost").toString())
                    : null;

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            User user = userRepository.findByUsername(auth.getName()).orElse(null);

            Task updated = taskService.updateTaskProgress(taskId, progress, actualCost, user);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error updating task: " + e.getMessage());
        }
    }
}
