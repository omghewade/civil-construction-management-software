package com.civil.scheduler.repository;

import com.civil.scheduler.entity.LaborForce;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LaborForceRepository extends JpaRepository<LaborForce, Long> {
    List<LaborForce> findByProjectId(Long projectId);
}
