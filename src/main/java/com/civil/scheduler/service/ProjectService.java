package com.civil.scheduler.service;

import com.civil.scheduler.entity.Project;
import com.civil.scheduler.entity.ProjectStatus;
import com.civil.scheduler.entity.Task;
import com.civil.scheduler.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public Optional<Project> getProjectById(Long id) {
        return projectRepository.findById(id);
    }

    @Transactional
    public Project createProject(Project project) {
        project.setCompletionPercentage(0.0);
        project.setStatus(ProjectStatus.PLANNED);
        return projectRepository.save(project);
    }

    @Transactional
    public Project updateProject(Long id, Project updatedProject) {
        return projectRepository.findById(id).map(proj -> {
            proj.setName(updatedProject.getName());
            proj.setLocation(updatedProject.getLocation());
            proj.setClient(updatedProject.getClient());
            proj.setStartDate(updatedProject.getStartDate());
            proj.setEndDate(updatedProject.getEndDate());
            proj.setBudget(updatedProject.getBudget());
            proj.setStatus(updatedProject.getStatus());
            return projectRepository.save(proj);
        }).orElseThrow(() -> new RuntimeException("Project not found"));
    }

    @Transactional
    public void deleteProject(Long id) {
        projectRepository.deleteById(id);
    }

    @Transactional
    public Project recalculateProjectProgress(Long projectId) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        List<Task> tasks = project.getTasks();

        if (tasks.isEmpty()) {
            project.setCompletionPercentage(0.0);
        } else {
            // Can calculate based on average task progress or weighted by estimated cost
            // We use simple average for MVP as stated in prompt: "average of all task
            // progress values"
            double totalProgress = tasks.stream().mapToDouble(Task::getProgress).sum();
            double avgProgress = totalProgress / tasks.size();
            project.setCompletionPercentage(avgProgress);

            if (avgProgress == 100) {
                project.setStatus(ProjectStatus.COMPLETED);
            } else if (avgProgress > 0 && project.getStatus() == ProjectStatus.PLANNED) {
                project.setStatus(ProjectStatus.ONGOING);
            }
        }
        return projectRepository.save(project);
    }
}
