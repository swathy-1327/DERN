package com.dern.controller;

import com.dern.model.SosEvent;
import com.dern.repository.SosEventRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/volunteer")
public class VolunteerController {

    private final SosEventRepository sosEventRepository;

    public VolunteerController(SosEventRepository sosEventRepository) {
        this.sosEventRepository = sosEventRepository;
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