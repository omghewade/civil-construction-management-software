package com.civil.scheduler.repository;

import com.civil.scheduler.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByProjectIdOrderByTimestampDesc(Long projectId);

    List<ActivityLog> findTop50ByOrderByTimestampDesc();
}
