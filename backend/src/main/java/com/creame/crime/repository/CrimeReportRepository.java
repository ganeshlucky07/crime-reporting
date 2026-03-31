package com.creame.crime.repository;

import com.creame.crime.model.CrimeReport;
import com.creame.crime.model.ReportStatus;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CrimeReportRepository extends JpaRepository<CrimeReport, String> {

    Page<CrimeReport> findByUserId(String userId, Pageable pageable);

    @Query("""
            SELECT r
            FROM CrimeReport r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:fromTs IS NULL OR r.createdAt >= :fromTs)
              AND (:toTs IS NULL OR r.createdAt <= :toTs)
            """)
    Page<CrimeReport> findAllFiltered(
            @Param("status") ReportStatus status,
            @Param("fromTs") Instant from,
            @Param("toTs") Instant to,
            Pageable pageable
    );
}
