package com.dern.controller;

import com.dern.model.TrustedVolunteer;
import com.dern.repository.TrustedVolunteerRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trusted-volunteers")
public class TrustedVolunteerController {

    private final TrustedVolunteerRepository trustedVolunteerRepository;

    public TrustedVolunteerController(TrustedVolunteerRepository trustedVolunteerRepository) {
        this.trustedVolunteerRepository = trustedVolunteerRepository;
    }

    @PostMapping
    public ResponseEntity<?> addTrustedVolunteer(@RequestBody TrustedVolunteer trustedVolunteer, HttpSession session) {
        Object userId = session.getAttribute("userId");

        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Login required"));
        }

        trustedVolunteer.setUserId(Long.valueOf(userId.toString()));
        trustedVolunteerRepository.save(trustedVolunteer);

        return ResponseEntity.ok(Map.of("message", "Trusted volunteer added"));
    }

    @GetMapping
    public ResponseEntity<?> getTrustedVolunteers(HttpSession session) {
        Object userId = session.getAttribute("userId");

        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Login required"));
        }

        List<TrustedVolunteer> list = trustedVolunteerRepository.findByUserId(Long.valueOf(userId.toString()));
        return ResponseEntity.ok(list);
    }
}