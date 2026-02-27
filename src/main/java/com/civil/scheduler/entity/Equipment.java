package com.civil.scheduler.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "equipments")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonBackReference(value = "project-equipments")
    private Project project;

    @NotBlank(message = "Equipment name is required")
    private String name;

    @Min(0)
    @Column(name = "total_quantity", nullable = false)
    private Integer totalQuantity = 0;

    @Min(0)
    @Column(name = "in_use", nullable = false)
    private Integer inUse = 0;

    @Min(0)
    @Column(name = "in_maintenance", nullable = false)
    private Integer inMaintenance = 0;

    // Transient calculated field
    @Transient
    public Integer getIdle() {
        if (totalQuantity == null)
            return 0;
        int use = inUse != null ? inUse : 0;
        int maint = inMaintenance != null ? inMaintenance : 0;
        return totalQuantity - use - maint;
    }

    public Equipment() {
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

    public Integer getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(Integer totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public Integer getInUse() {
        return inUse;
    }

    public void setInUse(Integer inUse) {
        this.inUse = inUse;
    }

    public Integer getInMaintenance() {
        return inMaintenance;
    }

    public void setInMaintenance(Integer inMaintenance) {
        this.inMaintenance = inMaintenance;
    }
}
