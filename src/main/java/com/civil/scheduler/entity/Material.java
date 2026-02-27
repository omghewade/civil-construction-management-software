package com.civil.scheduler.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;

@Entity
@Table(name = "materials")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Material {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonBackReference(value = "project-materials")
    private Project project;

    @NotBlank(message = "Material name is required")
    private String name;

    @Min(0)
    @Column(name = "total_available", nullable = false)
    private Double totalAvailable = 0.0;

    @Min(0)
    @Column(name = "daily_consumption_rate", nullable = false)
    private Double dailyConsumptionRate = 0.0;

    @Column(name = "refill_date_target")
    private LocalDate refillDateTarget;

    // Transient Calculated field: Extimated days left until empty
    @Transient
    public Integer getEstimatedEndDays() {
        if (totalAvailable == null || dailyConsumptionRate == null || dailyConsumptionRate == 0) {
            return null;
        }
        return (int) (totalAvailable / dailyConsumptionRate);
    }

    public Material() {
    }

    // Getters and Setters
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getTotalAvailable() {
        return totalAvailable;
    }

    public void setTotalAvailable(Double totalAvailable) {
        this.totalAvailable = totalAvailable;
    }

    public Double getDailyConsumptionRate() {
        return dailyConsumptionRate;
    }

    public void setDailyConsumptionRate(Double dailyConsumptionRate) {
        this.dailyConsumptionRate = dailyConsumptionRate;
    }

    public LocalDate getRefillDateTarget() {
        return refillDateTarget;
    }

    public void setRefillDateTarget(LocalDate refillDateTarget) {
        this.refillDateTarget = refillDateTarget;
    }
}
