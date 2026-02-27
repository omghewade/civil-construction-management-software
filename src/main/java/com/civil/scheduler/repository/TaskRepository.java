package com.civil.scheduler.repository;

import com.civil.scheduler.entity.Task;
import com.civil.scheduler.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProject(Project project);

    List<Task> findByEngineerId(Long engineerId);
}
