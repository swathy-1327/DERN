package com.dern.controller;

import com.dern.model.SosEvent;
import com.dern.repository.SosEventRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.dern.model.NotificationEvent;
import com.dern.repository.NotificationEventRepository;
import java.time.LocalDateTime;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/volunteer")
public class VolunteerController {

    private final SosEventRepository sosEventRepository;
    private final NotificationEventRepository notificationEventRepository;

    public VolunteerController(SosEventRepository sosEventRepository,
                               NotificationEventRepository notificationEventRepository) {
        this.sosEventRepository = sosEventRepository;
        this.notificationEventRepository = notificationEventRepository;
    }
    @PostMapping("/mark-spam/{id}")
    public ResponseEntity<?> markSpam(@PathVariable Long id, HttpSession session) {
        Object role = session.getAttribute("userRole");

        if (role == null || !"VOLUNTEER".equals(role.toString())) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }

        SosEvent sos = sosEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SOS not found"));

        int currentSpam = sos.getSpamCount() == null ? 0 : sos.getSpamCount();
        sos.setSpamCount(currentSpam + 1);

        if (sos.getSpamCount() > 4) {
            sos.setSpamFlagged(true);
            sos.setStatus("SPAM");

            NotificationEvent spamNotification = new NotificationEvent();
            spamNotification.setRecipientRole("USER");
            spamNotification.setTitle("Spam Alert");
            spamNotification.setMessage("An SOS request was marked as spam by multiple volunteers.");
            spamNotification.setLatitude(sos.getLatitude());
            spamNotification.setLongitude(sos.getLongitude());
            spamNotification.setIsRead(false);
            spamNotification.setCreatedAt(LocalDateTime.now());
            notificationEventRepository.save(spamNotification);

            NotificationEvent volunteerNotification = new NotificationEvent();
            volunteerNotification.setRecipientRole("VOLUNTEER");
            volunteerNotification.setTitle("Spam Confirmed");
            volunteerNotification.setMessage("An SOS request was flagged as spam by more than 4 volunteers.");
            volunteerNotification.setLatitude(sos.getLatitude());
            volunteerNotification.setLongitude(sos.getLongitude());
            volunteerNotification.setIsRead(false);
            volunteerNotification.setCreatedAt(LocalDateTime.now());
            notificationEventRepository.save(volunteerNotification);
        }

        sosEventRepository.save(sos);

        return ResponseEntity.ok(Map.of(
                "message", "Spam vote recorded",
                "spamCount", sos.getSpamCount(),
                "spamFlagged", sos.getSpamFlagged()
        ));
    }
    @GetMapping("/active-requests")
    public ResponseEntity<?> getActiveRequests(HttpSession session) {
        Object role = session.getAttribute("userRole");

        if (role == null || !"VOLUNTEER".equals(role.toString())) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }

        List<SosEvent> activeEvents = sosEventRepository.findByStatus("ACTIVE");
        return ResponseEntity.ok(activeEvents);
    }
}