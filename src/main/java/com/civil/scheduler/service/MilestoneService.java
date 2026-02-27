package com.civil.scheduler.service;

import com.civil.scheduler.entity.Milestone;
import com.civil.scheduler.entity.Project;
import com.civil.scheduler.repository.MilestoneRepository;
import com.civil.scheduler.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class MilestoneService {

    private final MilestoneRepository milestoneRepository;
    private final ProjectRepository projectRepository;

    public MilestoneService(MilestoneRepository milestoneRepository, ProjectRepository projectRepository) {
        this.milestoneRepository = milestoneRepository;
        this.projectRepository = projectRepository;
    }

    public List<Milestone> getMilestonesByProject(Long projectId) {
        return milestoneRepository.findByProjectId(projectId);
    }

    public Milestone createMilestone(Long projectId, Milestone milestone) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        milestone.setProject(project);
        return milestoneRepository.save(milestone);
    }

    public Milestone updateMilestone(Long milestoneId, Milestone updatedMilestone) {
        Milestone existing = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new RuntimeException("Milestone not found"));

        existing.setName(updatedMilestone.getName());
        existing.setDueDate(updatedMilestone.getDueDate());
        existing.setStatus(updatedMilestone.getStatus());

        return milestoneRepository.save(existing);
    }

    public void deleteMilestone(Long milestoneId) {
        milestoneRepository.deleteById(milestoneId);
    }
}
