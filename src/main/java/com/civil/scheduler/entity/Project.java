package com.civil.scheduler.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "projects")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    private String location;

    private String client;

    @NotNull
    @Column(name = "start_date")
    private LocalDate startDate;

    @NotNull
    @Column(name = "end_date")
    private LocalDate endDate;

    @Min(0)
    @Column(nullable = false)
    private Double budget = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status = ProjectStatus.PLANNED;

    @Column(name = "completion_percentage")
    private Double completionPercentage = 0.0;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonManagedReference(value = "project-tasks")
    private List<Task> tasks = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonManagedReference(value = "project-milestones")
    private List<Milestone> milestones = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonManagedReference(value = "project-equipments")
    private List<Equipment> equipments = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonManagedReference(value = "project-labor")
    private List<LaborForce> laborForces = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonManagedReference(value = "project-materials")
    private List<Material> materials = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonManagedReference(value = "project-issues")
    private List<com.civil.scheduler.entity.Issue> issues = new ArrayList<>();

    // Default constructor
    public Project() {
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getClient() {
        return client;
    }

    public void setClient(String client) {
        this.client = client;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Double getBudget() {
        return budget;
    }

    public void setBudget(Double budget) {
        this.budget = budget;
    }

    public ProjectStatus getStatus() {
        return status;
    }

    public void setStatus(ProjectStatus status) {
        this.status = status;
    }

    public Double getCompletionPercentage() {
        return completionPercentage;
    }

    public void setCompletionPercentage(Double completionPercentage) {
        this.completionPercentage = completionPercentage;
    }

    public List<Task> getTasks() {
        return tasks;
    }

    public void setTasks(List<Task> tasks) {
        this.tasks = tasks;
    }

    public List<Milestone> getMilestones() {
        return milestones;
    }

    public void setMilestones(List<Milestone> milestones) {
        this.milestones = milestones;
    }

    public List<Equipment> getEquipments() {
        return equipments;
    }

    public void setEquipments(List<Equipment> equipments) {
        this.equipments = equipments;
    }

    public List<LaborForce> getLaborForces() {
        return laborForces;
    }

    public void setLaborForces(List<LaborForce> laborForces) {
        this.laborForces = laborForces;
    }

    public List<Material> getMaterials() {
        return materials;
    }

    public void setMaterials(List<Material> materials) {
        this.materials = materials;
    }

    public List<com.civil.scheduler.entity.Issue> getIssues() {
        return issues;
    }

    public void setIssues(List<com.civil.scheduler.entity.Issue> issues) {
        this.issues = issues;
    }

    @Transient
    public String getHealthScore() {
        int score = 100;

        // Penalty for delayed tasks
        if (tasks != null) {
            long delayed = tasks.stream().filter(t -> "DELAYED".equals(t.getStatus())).count();
            score -= (delayed * 10);
        }

        // Penalty for budget overrun
        if (budget != null && tasks != null) {
            double actualCost = tasks.stream().mapToDouble(t -> t.getActualCost() != null ? t.getActualCost() : 0)
                    .sum();
            if (actualCost > budget) {
                score -= 20;
            } else if (actualCost > (budget * 0.9)) {
                score -= 5;
            }
        }

        // Penalty for critical open issues
        if (issues != null) {
            long criticalOpen = issues.stream()
                    .filter(i -> "OPEN".equals(i.getStatus().name()) && "CRITICAL".equals(i.getSeverity().name()))
                    .count();
            score -= (criticalOpen * 15);

            long highOpen = issues.stream()
                    .filter(i -> "OPEN".equals(i.getStatus().name()) && "HIGH".equals(i.getSeverity().name()))
                    .count();
            score -= (highOpen * 5);
        }

        if (score >= 80)
            return "EXCELLENT";
        if (score >= 60)
            return "GOOD";
        if (score >= 40)
            return "WARNING";
        return "CRITICAL";
    }
}
