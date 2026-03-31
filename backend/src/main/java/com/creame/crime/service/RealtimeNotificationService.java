package com.creame.crime.service;

import com.creame.crime.dto.report.CrimeReportResponse;
import com.creame.crime.dto.report.ReportRealtimeMessage;
import java.time.Instant;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class RealtimeNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeNotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyAdminsAboutNewReport(CrimeReportResponse report) {
        messagingTemplate.convertAndSend(
                "/topic/admin/reports",
                new ReportRealtimeMessage("NEW_REPORT", "A new crime report was submitted", report, Instant.now())
        );
    }

    public void notifyReporterAboutStatusUpdate(CrimeReportResponse report) {
        ReportRealtimeMessage payload = new ReportRealtimeMessage(
                "STATUS_UPDATED",
                "Your crime report status has changed",
                report,
                Instant.now()
        );
        messagingTemplate.convertAndSendToUser(report.reporterEmail(), "/queue/reports", payload);
        messagingTemplate.convertAndSend("/topic/admin/reports", payload);
    }

    public void notifyAdminsAboutReportUpdated(CrimeReportResponse report) {
        messagingTemplate.convertAndSend(
                "/topic/admin/reports",
                new ReportRealtimeMessage("REPORT_UPDATED", "A reporter edited a report", report, Instant.now())
        );
    }

    public void notifyAdminsAboutReportDeleted(CrimeReportResponse report) {
        messagingTemplate.convertAndSend(
                "/topic/admin/reports",
                new ReportRealtimeMessage("REPORT_DELETED", "A reporter deleted a report", report, Instant.now())
        );
    }
}
