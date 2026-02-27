package com.civil.scheduler.service;

import com.civil.scheduler.entity.SubTask;
import com.civil.scheduler.entity.Task;
import com.civil.scheduler.repository.SubTaskRepository;
import com.civil.scheduler.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class SubTaskService {

    private final SubTaskRepository subTaskRepository;
    private final TaskRepository taskRepository;

    public SubTaskService(SubTaskRepository subTaskRepository, TaskRepository taskRepository) {
        this.subTaskRepository = subTaskRepository;
        this.taskRepository = taskRepository;
    }

    public List<SubTask> getSubTasksByTask(Long taskId) {
        return subTaskRepository.findByTaskId(taskId);
    }

    public SubTask createSubTask(Long taskId, SubTask subTask) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        subTask.setTask(task);
        return subTaskRepository.save(subTask);
    }

    public SubTask updateSubTask(Long subTaskId, SubTask updatedSubTask) {
        SubTask existing = subTaskRepository.findById(subTaskId)
                .orElseThrow(() -> new RuntimeException("SubTask not found"));

        existing.setName(updatedSubTask.getName());
        existing.setProgress(updatedSubTask.getProgress());
        existing.setStatus(updatedSubTask.getStatus());

        return subTaskRepository.save(existing);
    }

    public void deleteSubTask(Long subTaskId) {
        subTaskRepository.deleteById(subTaskId);
    }
}
