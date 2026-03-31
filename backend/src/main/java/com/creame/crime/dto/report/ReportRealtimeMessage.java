package com.creame.crime.dto.report;

import java.time.Instant;

public record ReportRealtimeMessage(
        String type,
        String message,
        CrimeReportResponse report,
        Instant timestamp
) {
}
