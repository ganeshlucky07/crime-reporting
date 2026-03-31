package com.creame.crime.dto.report;

import com.creame.crime.model.ReportStatus;
import java.time.Instant;
import java.util.List;

public record CrimeReportResponse(
        String id,
        String userId,
        String reporterName,
        String reporterEmail,
        String title,
        String description,
        List<String> imageUrls,
        List<String> videoUrls,
        double latitude,
        double longitude,
        ReportStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
