package com.creame.crime.controller;

import com.creame.crime.dto.report.CrimeReportResponse;
import com.creame.crime.dto.report.PageResponse;
import com.creame.crime.dto.report.ReportCreateRequest;
import com.creame.crime.dto.report.ReportUpdateRequest;
import com.creame.crime.security.UserPrincipal;
import com.creame.crime.service.ReportService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('USER')")
    public CrimeReportResponse createReport(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ReportCreateRequest request
    ) {
        return reportService.createReport(principal, request);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('USER')")
    public CrimeReportResponse createReportWithMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestPart("report") ReportCreateRequest request,
            @RequestPart(value = "mediaFiles", required = false) List<MultipartFile> mediaFiles
    ) {
        List<MultipartFile> safeFiles = mediaFiles == null ? List.of() : mediaFiles;
        return reportService.createReport(principal, request, safeFiles);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('USER')")
    public PageResponse<CrimeReportResponse> getMyReports(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        return reportService.getMyReports(principal, page, size);
    }

    @PutMapping("/my/{id}")
    @PreAuthorize("hasRole('USER')")
    public CrimeReportResponse updateMyReport(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") String reportId,
            @Valid @RequestBody ReportUpdateRequest request
    ) {
        return reportService.updateMyReport(principal, reportId, request);
    }

    @DeleteMapping("/my/{id}")
    @PreAuthorize("hasRole('USER')")
    public void deleteMyReport(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") String reportId
    ) {
        reportService.deleteMyReport(principal, reportId);
    }
}
