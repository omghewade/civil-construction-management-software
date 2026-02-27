package com.civil.scheduler.service;

import com.civil.scheduler.entity.ActivityLog;
import com.civil.scheduler.entity.User;
import com.civil.scheduler.repository.ActivityLogRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ActivityLogService(ActivityLogRepository activityLogRepository, SimpMessagingTemplate messagingTemplate) {
        this.activityLogRepository = activityLogRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public ActivityLog logAndBroadcast(Long projectId, Long taskId, User user, String action) {
        ActivityLog log = new ActivityLog(projectId, taskId, user, action);
        log = activityLogRepository.save(log);

        // Broadcast to specific project topic
        String destination = "/topic/projects/" + projectId;
        messagingTemplate.convertAndSend(destination, log);

        // Also broadcast to a general feed if needed
        messagingTemplate.convertAndSend("/topic/feed", log);

        return log;
    }

    public void broadcastProjectUpdate(Long projectId) {
        messagingTemplate.convertAndSend("/topic/projects/" + projectId + "/update", "UPDATE");
    }
}
