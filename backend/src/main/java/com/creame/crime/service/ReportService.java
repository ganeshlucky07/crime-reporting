package com.creame.crime.service;

import com.creame.crime.config.AppProperties;
import com.creame.crime.dto.report.CrimeReportResponse;
import com.creame.crime.dto.report.PageResponse;
import com.creame.crime.dto.report.ReportCreateRequest;
import com.creame.crime.dto.report.ReportUpdateRequest;
import com.creame.crime.exception.ResourceNotFoundException;
import com.creame.crime.model.CrimeReport;
import com.creame.crime.model.ReportStatus;
import com.creame.crime.model.User;
import com.creame.crime.repository.CrimeReportRepository;
import com.creame.crime.repository.UserRepository;
import com.creame.crime.security.UserPrincipal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ReportService {

    private final CrimeReportRepository crimeReportRepository;
    private final UserRepository userRepository;
    private final RealtimeNotificationService realtimeNotificationService;
    private final AppProperties appProperties;
    private final MediaStorageService mediaStorageService;

    public ReportService(
            CrimeReportRepository crimeReportRepository,
            UserRepository userRepository,
            RealtimeNotificationService realtimeNotificationService,
            AppProperties appProperties,
            MediaStorageService mediaStorageService
    ) {
        this.crimeReportRepository = crimeReportRepository;
        this.userRepository = userRepository;
        this.realtimeNotificationService = realtimeNotificationService;
        this.appProperties = appProperties;
        this.mediaStorageService = mediaStorageService;
    }

    public CrimeReportResponse createReport(UserPrincipal principal, ReportCreateRequest request) {
        return createReport(principal, request, List.of());
    }

    public CrimeReportResponse createReport(
            UserPrincipal principal,
            ReportCreateRequest request,
            List<MultipartFile> mediaFiles
    ) {
        CrimeReport report = new CrimeReport();
        Instant now = Instant.now();
        MediaStorageService.StoredMedia storedMedia = mediaStorageService.storeMediaFiles(mediaFiles);
        report.setId(UUID.randomUUID().toString());
        report.setUserId(principal.getId());
        report.setTitle(request.title().trim());
        report.setDescription(request.description().trim());
        report.setImageUrls(storedMedia.imageUrls());
        report.setVideoUrls(storedMedia.videoUrls());
        report.setLatitude(request.latitude());
        report.setLongitude(request.longitude());
        report.setStatus(ReportStatus.PENDING);
        report.setCreatedAt(now);
        report.setUpdatedAt(now);

        CrimeReport saved = crimeReportRepository.save(report);
        CrimeReportResponse response = toResponse(saved, principal.getDisplayName(), principal.getUsername());
        realtimeNotificationService.notifyAdminsAboutNewReport(response);
        return response;
    }

    public PageResponse<CrimeReportResponse> getMyReports(UserPrincipal principal, Integer page, Integer size) {
        Pageable pageable = buildPageable(page, size);
        Page<CrimeReport> reportPage = crimeReportRepository.findByUserId(principal.getId(), pageable);
        List<CrimeReportResponse> content = reportPage.getContent().stream()
                .map(report -> toResponse(report, principal.getDisplayName(), principal.getUsername()))
                .toList();
        return toPageResponse(reportPage, content);
    }

    public PageResponse<CrimeReportResponse> getAllReports(
            ReportStatus status,
            Instant from,
            Instant to,
            Integer page,
            Integer size
    ) {
        Pageable pageable = buildPageable(page, size);
        Page<CrimeReport> reportPage = crimeReportRepository.findAllFiltered(status, from, to, pageable);
        Map<String, User> usersById = loadUsers(reportPage.getContent());
        List<CrimeReportResponse> content = reportPage.getContent().stream()
                .map(report -> {
                    User reporter = usersById.get(report.getUserId());
                    String name = reporter != null ? reporter.getName() : "Unknown Reporter";
                    String email = reporter != null ? reporter.getEmail() : "unknown@local";
                    return toResponse(report, name, email);
                })
                .toList();
        return toPageResponse(reportPage, content);
    }

    public CrimeReportResponse updateReportStatus(String reportId, ReportStatus status) {
        CrimeReport report = crimeReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Crime report not found"));

        report.setStatus(status);
        report.setUpdatedAt(Instant.now());
        CrimeReport saved = crimeReportRepository.save(report);

        User reporter = userRepository.findById(saved.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Report owner not found"));
        CrimeReportResponse response = toResponse(saved, reporter.getName(), reporter.getEmail());
        realtimeNotificationService.notifyReporterAboutStatusUpdate(response);
        return response;
    }

    public CrimeReportResponse updateMyReport(
            UserPrincipal principal,
            String reportId,
            ReportUpdateRequest request
    ) {
        CrimeReport report = crimeReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Crime report not found"));
        verifyOwner(principal, report);
        ensurePendingForUserEdits(report);

        report.setTitle(request.title().trim());
        report.setDescription(request.description().trim());
        report.setLatitude(request.latitude());
        report.setLongitude(request.longitude());
        report.setUpdatedAt(Instant.now());

        CrimeReport saved = crimeReportRepository.save(report);
        CrimeReportResponse response = toResponse(saved, principal.getDisplayName(), principal.getUsername());
        realtimeNotificationService.notifyAdminsAboutReportUpdated(response);
        return response;
    }

    public void deleteMyReport(UserPrincipal principal, String reportId) {
        CrimeReport report = crimeReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Crime report not found"));
        verifyOwner(principal, report);
        ensurePendingForUserEdits(report);

        CrimeReportResponse response = toResponse(report, principal.getDisplayName(), principal.getUsername());

        List<String> mediaUrls = new ArrayList<>();
        if (report.getImageUrls() != null) {
            mediaUrls.addAll(report.getImageUrls());
        }
        if (report.getVideoUrls() != null) {
            mediaUrls.addAll(report.getVideoUrls());
        }

        crimeReportRepository.delete(report);
        mediaStorageService.deleteMediaUrls(mediaUrls);
        realtimeNotificationService.notifyAdminsAboutReportDeleted(response);
    }

    private Pageable buildPageable(Integer page, Integer size) {
        int safePage = page == null || page < 0 ? 0 : page;
        int defaultSize = appProperties.getPagination().getDefaultSize();
        int maxSize = appProperties.getPagination().getMaxSize();
        int requestedSize = size == null || size < 1 ? defaultSize : size;
        int safeSize = Math.min(requestedSize, maxSize);
        return PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private CrimeReportResponse toResponse(CrimeReport report, String reporterName, String reporterEmail) {
        return new CrimeReportResponse(
                report.getId(),
                report.getUserId(),
                reporterName,
                reporterEmail,
                report.getTitle(),
                report.getDescription(),
                report.getImageUrls() == null ? List.of() : report.getImageUrls().stream().filter(Objects::nonNull).toList(),
                report.getVideoUrls() == null ? List.of() : report.getVideoUrls().stream().filter(Objects::nonNull).toList(),
                report.getLatitude(),
                report.getLongitude(),
                report.getStatus(),
                report.getCreatedAt(),
                report.getUpdatedAt()
        );
    }

    private void verifyOwner(UserPrincipal principal, CrimeReport report) {
        if (!report.getUserId().equals(principal.getId())) {
            throw new AccessDeniedException("You can modify only your own reports");
        }
    }

    private void ensurePendingForUserEdits(CrimeReport report) {
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new IllegalArgumentException("Only pending reports can be edited or deleted.");
        }
    }

    private Map<String, User> loadUsers(List<CrimeReport> reports) {
        Set<String> userIds = reports.stream()
                .map(CrimeReport::getUserId)
                .collect(Collectors.toSet());
        if (userIds.isEmpty()) {
            return Map.of();
        }

        Map<String, User> usersById = new HashMap<>();
        userRepository.findAllById(userIds).forEach(user -> usersById.put(user.getId(), user));
        return usersById;
    }

    private PageResponse<CrimeReportResponse> toPageResponse(Page<CrimeReport> page, List<CrimeReportResponse> content) {
        return new PageResponse<>(
                content,
                page.getTotalElements(),
                page.getTotalPages(),
                page.getNumber(),
                page.getSize(),
                page.isFirst(),
                page.isLast()
        );
    }
}
