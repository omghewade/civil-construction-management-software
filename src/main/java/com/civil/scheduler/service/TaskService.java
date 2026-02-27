package com.civil.scheduler.service;

import com.civil.scheduler.entity.Task;
import com.civil.scheduler.entity.TaskStatus;
import com.civil.scheduler.entity.User;
import com.civil.scheduler.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectService projectService;
    private final ActivityLogService activityLogService;

    public TaskService(TaskRepository taskRepository, ProjectService projectService,
            ActivityLogService activityLogService) {
        this.taskRepository = taskRepository;
        this.projectService = projectService;
        this.activityLogService = activityLogService;
    }

    public List<Task> getTasksByProjectId(Long projectId) {
        return projectService.getProjectById(projectId)
                .map(taskRepository::findByProject)
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    public List<Task> getTasksByEngineerId(Long engineerId) {
        return taskRepository.findByEngineerId(engineerId);
    }

    @Transactional
    public Task createTask(Task task, User creator) {
        task.setStatus(TaskStatus.NOT_STARTED);
        task.setProgress(0);
        task.setActualCost(0.0);
        task = taskRepository.save(task);

        activityLogService.logAndBroadcast(task.getProject().getId(), task.getId(), creator,
                "Created task '" + task.getName() + "'");
        activityLogService.broadcastProjectUpdate(task.getProject().getId());

        projectService.recalculateProjectProgress(task.getProject().getId());
        return task;
    }

    @Transactional
    public Task updateTaskProgress(Long taskId, Integer progress, Double actualCost, User user) {
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));
        Integer oldProgress = task.getProgress();
        Double oldCost = task.getActualCost();

        task.setProgress(progress);
        if (actualCost != null) {
            task.setActualCost(actualCost);
        }

        // Delay Detection Logic
        checkAndSetTaskStatus(task);

        task = taskRepository.save(task);

        if (!oldProgress.equals(progress) || (actualCost != null && !oldCost.equals(actualCost))) {
            String actionContext = "Updated task '" + task.getName() + "': Progress " + progress + "%" +
                    (actualCost != null ? ", Cost ₹" + actualCost : "");
            activityLogService.logAndBroadcast(task.getProject().getId(), task.getId(), user, actionContext);
            activityLogService.broadcastProjectUpdate(task.getProject().getId());
        }

        projectService.recalculateProjectProgress(task.getProject().getId());
        return task;
    }

    private void checkAndSetTaskStatus(Task task) {
        LocalDate today = LocalDate.now();
        if (task.getProgress() == 100) {
            task.setStatus(TaskStatus.COMPLETED);
        } else if (task.getDeadline() != null && today.isAfter(task.getDeadline()) && task.getProgress() < 100) {
            task.setStatus(TaskStatus.DELAYED);
        } else if (task.getProgress() > 0) {
            task.setStatus(TaskStatus.IN_PROGRESS);
        } else {
            task.setStatus(TaskStatus.NOT_STARTED);
        }
    }

    @Transactional
    public void deleteTask(Long taskId) {
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));
        Long projectId = task.getProject().getId();
        taskRepository.delete(task);
        projectService.recalculateProjectProgress(projectId);
    }
}
