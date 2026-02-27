package com.civil.scheduler.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "labor_force")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class LaborForce {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonBackReference(value = "project-labor")
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(name = "worker_type", nullable = false)
    private WorkerType workerType;

    @Min(0)
    @Column(nullable = false)
    private Integer count = 0;

    @Min(0)
    @Column(name = "daily_wage", nullable = false)
    private Double dailyWage = 0.0;

    @Min(0)
    @Column(name = "days_worked", nullable = false)
    private Integer daysWorked = 0;

    @Min(0)
    @Column(name = "total_paid", nullable = false)
    private Double totalPaid = 0.0;

    // Transient Calculated field: (count * wage * daysWorked) - totalPaid
    @Transient
    public Double getPendingSalary() {
        if (count == null || dailyWage == null || daysWorked == null)
            return 0.0;
        double totalExpected = count * dailyWage * daysWorked;
        double paid = totalPaid != null ? totalPaid : 0.0;
        return totalExpected - paid;
    }

    public LaborForce() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public WorkerType getWorkerType() {
        return workerType;
    }

    public void setWorkerType(WorkerType workerType) {
        this.workerType = workerType;
    }

    public Integer getCount() {
        return count;
    }

    public void setCount(Integer count) {
        this.count = count;
    }

    public Double getDailyWage() {
        return dailyWage;
    }

    public void setDailyWage(Double dailyWage) {
        this.dailyWage = dailyWage;
    }

    public Integer getDaysWorked() {
        return daysWorked;
    }

    public void setDaysWorked(Integer daysWorked) {
        this.daysWorked = daysWorked;
    }

    public Double getTotalPaid() {
        return totalPaid;
    }

    public void setTotalPaid(Double totalPaid) {
        this.totalPaid = totalPaid;
    }
}
