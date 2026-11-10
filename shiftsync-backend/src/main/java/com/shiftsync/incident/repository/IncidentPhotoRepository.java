package com.shiftsync.incident.repository;

import com.shiftsync.incident.entity.IncidentPhoto;
import com.shiftsync.incident.dto.IncidentDTOs.PhotoDTO;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface IncidentPhotoRepository extends JpaRepository<IncidentPhoto, UUID> {
    @Query("select new com.shiftsync.incident.dto.IncidentDTOs$PhotoDTO(p.id,p.contentType,p.sizeBytes) from IncidentPhoto p where p.incidentId = :incidentId order by p.id")
    List<PhotoDTO> metadata(@Param("incidentId") UUID incidentId);
    Optional<IncidentPhoto> findByIdAndIncidentId(UUID id, UUID incidentId);
}
