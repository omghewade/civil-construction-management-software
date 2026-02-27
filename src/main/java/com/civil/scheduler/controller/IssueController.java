package com.civil.scheduler.controller;

import com.civil.scheduler.entity.Issue;
import com.civil.scheduler.repository.IssueRepository;
import com.civil.scheduler.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/issues")
public class IssueController {

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Issue>> getIssuesByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(issueRepository.findByProjectId(projectId));
    }

    @PostMapping("/project/{projectId}")
    public ResponseEntity<?> addIssue(@PathVariable Long projectId, @RequestBody Issue issue) {
        return projectRepository.findById(projectId).map(project -> {
            issue.setProject(project);
            Issue saved = issueRepository.save(issue);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateIssueStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return issueRepository.findById(id).map(issue -> {
            try {
                com.civil.scheduler.entity.IssueStatus newStatus = com.civil.scheduler.entity.IssueStatus
                        .valueOf(payload.get("status"));
                issue.setStatus(newStatus);
                return ResponseEntity.ok(issueRepository.save(issue));
            } catch (Exception e) {
                return ResponseEntity.badRequest().build();
            }
        }).orElse(ResponseEntity.notFound().build());
    }
}
