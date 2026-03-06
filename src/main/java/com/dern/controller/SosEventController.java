package com.dern.controller;

import com.dern.model.SosEvent;
import com.dern.repository.SosEventRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/sos")
public class SosEventController {

    private final SosEventRepository sosEventRepository;

    public SosEventController(SosEventRepository sosEventRepository) {
        this.sosEventRepository = sosEventRepository;
    }

    @PostMapping
    public SosEvent createSos(@RequestBody SosEvent sosEvent) {
        sosEvent.setCreatedAt(LocalDateTime.now());

        if (sosEvent.getStatus() == null || sosEvent.getStatus().isBlank()) {
            sosEvent.setStatus("ACTIVE");
        }

        return sosEventRepository.save(sosEvent);
    }

    @GetMapping
    public List<SosEvent> getAllSosEvents() {
        return sosEventRepository.findAll();
    }

    @PutMapping("/{id}/cancel")
    public SosEvent cancelSos(@PathVariable Long id) {

        SosEvent sos = sosEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SOS not found"));

        sos.setStatus("CANCELLED");

        return sosEventRepository.save(sos);
    }
}