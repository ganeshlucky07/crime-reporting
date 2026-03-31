package com.creame.crime.dto.report;

import com.creame.crime.model.ReportStatus;
import jakarta.validation.constraints.NotNull;

public record ReportStatusUpdateRequest(
        @NotNull ReportStatus status
) {
}
