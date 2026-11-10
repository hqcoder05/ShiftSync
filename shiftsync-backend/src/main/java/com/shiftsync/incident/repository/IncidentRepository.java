package com.shiftsync.incident.repository;

import com.shiftsync.incident.entity.Incident;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.OffsetDateTime;
import java.util.*;

public interface IncidentRepository extends JpaRepository<Incident, UUID> {
    Optional<Incident> findByStoreIdAndReporterIdAndClientRequestId(UUID storeId, UUID reporterId, UUID clientRequestId);
    Optional<Incident> findByIdAndStoreId(UUID id, UUID storeId);
    List<Incident> findByStoreIdOrderByCreatedAtDescIdDesc(UUID storeId, Pageable pageable);
    List<Incident> findByStoreIdAndReporterIdOrderByCreatedAtDescIdDesc(UUID storeId, UUID reporterId, Pageable pageable);

    // A database uniqueness constraint also handles simultaneous retries from different processes.
    @Modifying
    @Query(value = "INSERT INTO incident_report(id,store_id,shift_id,reporter_id,reporter_name,client_request_id,category,severity,status,description,created_at,updated_at) " +
            "VALUES(:id,:storeId,:shiftId,:reporterId,:reporterName,:clientRequestId,:category,:severity,'OPEN',:description,:now,:now) " +
            "ON CONFLICT(store_id,reporter_id,client_request_id) DO NOTHING", nativeQuery = true)
    int insertIfAbsent(@Param("id") UUID id, @Param("storeId") UUID storeId, @Param("shiftId") UUID shiftId,
            @Param("reporterId") UUID reporterId, @Param("reporterName") String reporterName,
            @Param("clientRequestId") UUID clientRequestId, @Param("category") String category,
            @Param("severity") String severity, @Param("description") String description, @Param("now") OffsetDateTime now);
}
