package com.dern.controller;

import com.dern.model.SosEvent;
import com.dern.repository.SosEventRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import com.dern.model.NotificationEvent;
import com.dern.repository.NotificationEventRepository;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/sos")
public class SosEventController {

    private final SosEventRepository sosEventRepository;
    private final NotificationEventRepository notificationEventRepository;

    public SosEventController(SosEventRepository sosEventRepository,
                              NotificationEventRepository notificationEventRepository) {
        this.sosEventRepository = sosEventRepository;
        this.notificationEventRepository = notificationEventRepository;
    }

    @PostMapping
    public SosEvent createSos(@RequestBody SosEvent sosEvent, HttpSession session) {
        Object userId = session.getAttribute("userId");

        if (userId != null) {
            sosEvent.setUserId(Long.valueOf(userId.toString()));
        }

        sosEvent.setCreatedAt(LocalDateTime.now());

        if (sosEvent.getStatus() == null || sosEvent.getStatus().isBlank()) {
            sosEvent.setStatus("ACTIVE");
        }

        if (sosEvent.getSpamCount() == null) {
            sosEvent.setSpamCount(0);
        }

        if (sosEvent.getSpamFlagged() == null) {
            sosEvent.setSpamFlagged(false);
        }
        SosEvent saved = sosEventRepository.save(sosEvent);

        if (userId != null) {
            NotificationEvent userNotification = new NotificationEvent();
            userNotification.setRecipientUserId(Long.valueOf(userId.toString()));
            userNotification.setTitle("SOS Activated");
            userNotification.setMessage("Your SOS alert was activated successfully.");
            userNotification.setLatitude(saved.getLatitude());
            userNotification.setLongitude(saved.getLongitude());
            userNotification.setIsRead(false);
            userNotification.setCreatedAt(LocalDateTime.now());
            notificationEventRepository.save(userNotification);
        }

        NotificationEvent volunteerNotification = new NotificationEvent();
        volunteerNotification.setRecipientRole("VOLUNTEER");
        volunteerNotification.setTitle("New SOS Alert");
        volunteerNotification.setMessage("A user has triggered an SOS emergency.");
        volunteerNotification.setLatitude(saved.getLatitude());
        volunteerNotification.setLongitude(saved.getLongitude());
        volunteerNotification.setIsRead(false);
        volunteerNotification.setCreatedAt(LocalDateTime.now());
        notificationEventRepository.save(volunteerNotification);

        return saved;
    }

    @PutMapping("/{id}/cancel")
    public SosEvent cancelSos(@PathVariable Long id) {
        SosEvent sos = sosEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SOS not found"));

        sos.setStatus("CANCELLED");
        return sosEventRepository.save(sos);
    }

    @GetMapping
    public List<SosEvent> getAllSosEvents() {
        return sosEventRepository.findAll();
    }
}