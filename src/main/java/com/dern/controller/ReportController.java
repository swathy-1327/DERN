package com.dern.controller;

import com.dern.model.Report;
import com.dern.repository.ReportRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportRepository reportRepository;

    public ReportController(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    @PostMapping
    public Report createReport(@RequestBody Report report) {
        report.setCreatedAt(LocalDateTime.now());
        return reportRepository.save(report);
    }

    @GetMapping
    public List<Report> getAllReports() {
        return reportRepository.findAll();
    }
}