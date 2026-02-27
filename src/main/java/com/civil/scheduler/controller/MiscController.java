package com.civil.scheduler.controller;

import com.civil.scheduler.entity.ActivityLog;
import com.civil.scheduler.entity.Role;
import com.civil.scheduler.entity.User;
import com.civil.scheduler.repository.ActivityLogRepository;
import com.civil.scheduler.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class MiscController {

    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    public MiscController(ActivityLogRepository activityLogRepository, UserRepository userRepository) {
        this.activityLogRepository = activityLogRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/activity-logs/recent")
    public List<ActivityLog> getRecentActivityLogs() {
        return activityLogRepository.findTop50ByOrderByTimestampDesc();
    }

    @GetMapping("/users/engineers")
    public List<User> getEngineers() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ROLE_PM || u.getRole() == Role.ROLE_ENGINEER)
                .collect(Collectors.toList());
    }

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}
