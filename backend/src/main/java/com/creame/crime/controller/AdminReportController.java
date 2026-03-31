package com.creame.crime.controller;

import com.creame.crime.dto.report.CrimeReportResponse;
import com.creame.crime.dto.report.PageResponse;
import com.creame.crime.dto.report.ReportStatusUpdateRequest;
import com.creame.crime.model.ReportStatus;
import com.creame.crime.service.ReportService;
import jakarta.validation.Valid;
import java.time.Instant;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class AdminReportController {

    private final ReportService reportService;

    public AdminReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'POLICE')")
    public PageResponse<CrimeReportResponse> getAllReports(
            @RequestParam(value = "status", required = false) ReportStatus status,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        return reportService.getAllReports(status, from, to, page, size);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'POLICE')")
    public CrimeReportResponse updateReportStatus(
            @PathVariable("id") String id,
            @Valid @RequestBody ReportStatusUpdateRequest request
    ) {
        return reportService.updateReportStatus(id, request.status());
    }
}
