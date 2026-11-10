package com.shiftsync.incident.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.incident.dto.IncidentDTOs.*;
import com.shiftsync.incident.entity.*;
import com.shiftsync.incident.repository.*;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IncidentService {
    public static final int MAX_PHOTO_BYTES = 2 * 1024 * 1024;
    private final IncidentRepository incidentRepository;
    private final IncidentPhotoRepository photoRepository;
    private final EmploymentRepository employmentRepository;
    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository assignmentRepository;
    private final NotificationService notificationService;

    @Transactional
    public IncidentDTO create(UUID storeId, UUID userId, IncidentCategory category, IncidentSeverity severity,
            String description, UUID clientRequestId, UUID shiftId, List<MultipartFile> photos) {
        User user = member(storeId, userId);
        if (category == null || clientRequestId == null) throw error(HttpStatus.BAD_REQUEST, "category and clientRequestId are required");
        String text = description == null ? "" : description.trim();
        if (text.length() < 10 || text.length() > 2000) throw error(HttpStatus.BAD_REQUEST, "Description must contain 10 to 2000 characters");
        // Authorization is revalidated even for retries. Successful retries return the original result.
        Optional<Incident> duplicate = incidentRepository.findByStoreIdAndReporterIdAndClientRequestId(storeId, userId, clientRequestId);
        if (duplicate.isPresent()) return dto(duplicate.get());
        if (shiftId != null && (shiftRepository.findByIdAndStoreId(shiftId, storeId).isEmpty()
                || !assignmentRepository.existsByShiftIdAndStaffId(shiftId, userId))) {
            throw error(HttpStatus.BAD_REQUEST, "Choose one of your assigned shifts in this store");
        }
        List<MultipartFile> files = photos == null ? List.of() : photos;
        if (files.size() > 3) throw error(HttpStatus.BAD_REQUEST, "At most 3 photos are allowed");
        List<IncidentPhoto> validated = files.stream().map(this::validatePhoto).toList();
        IncidentSeverity selectedSeverity = severity != null ? severity : defaultSeverity(category);
        UUID id = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        int inserted = incidentRepository.insertIfAbsent(id, storeId, shiftId, userId,
                Objects.toString(user.getFullName(), ""), clientRequestId, category.name(), selectedSeverity.name(), text, now);
        Incident saved = incidentRepository.findByStoreIdAndReporterIdAndClientRequestId(storeId, userId, clientRequestId)
                .orElseThrow(() -> error(HttpStatus.CONFLICT, "Report could not be saved; retry with the same clientRequestId"));
        if (inserted == 1) {
            for (IncidentPhoto photo : validated) {
                photo.setIncidentId(saved.getId());
                photoRepository.save(photo);
            }
            // Persist with the report transaction; NotificationService delivers SSE only after commit.
            employmentRepository.findByStoreIdAndStatusAndUserSystemRole(storeId, EmploymentStatus.ACTIVE, SystemRole.MANAGER)
                    .stream().map(e -> e.getUser().getId()).distinct().forEach(managerId ->
                    notificationService.createInAppNotification(managerId, "INCIDENT_REPORTED", "Báo cáo sự cố mới",
                            user.getFullName() + " đã gửi báo cáo " + category.name() + ": " + text.substring(0, Math.min(text.length(), 180))));
        }
        return dto(saved);
    }

    public List<IncidentDTO> mine(UUID storeId, UUID userId, int limit) {
        member(storeId, userId);
        return incidentRepository.findByStoreIdAndReporterIdOrderByCreatedAtDescIdDesc(storeId, userId, page(limit)).stream().map(this::dto).toList();
    }

    public List<IncidentDTO> all(UUID storeId, UUID userId, int limit) {
        manager(storeId, userId);
        return incidentRepository.findByStoreIdOrderByCreatedAtDescIdDesc(storeId, page(limit)).stream().map(this::dto).toList();
    }

    public IncidentDTO detail(UUID storeId, UUID userId, UUID id) {
        User user = member(storeId, userId);
        return dto(requireReport(storeId, user, id));
    }

    public IncidentPhoto photo(UUID storeId, UUID userId, UUID id, UUID photoId) {
        User user = member(storeId, userId);
        requireReport(storeId, user, id);
        return photoRepository.findByIdAndIncidentId(photoId, id)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Photo not found"));
    }

    @Transactional
    public IncidentDTO review(UUID storeId, UUID userId, UUID id, ReviewRequest request) {
        manager(storeId, userId);
        Incident incident = incidentRepository.findByIdAndStoreId(id, storeId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Report not found"));
        if (request == null || request.status() == null) throw error(HttpStatus.BAD_REQUEST, "status is required");
        String note = request.reviewNote() == null ? null : request.reviewNote().trim();
        if (note != null && note.length() > 2000) throw error(HttpStatus.BAD_REQUEST, "Review note must not exceed 2000 characters");
        if (incident.getStatus() == request.status() && Objects.equals(incident.getReviewNote(), note)) return dto(incident);
        incident.setStatus(request.status());
        incident.setReviewNote(note);
        incident.setReviewedBy(userId);
        incident.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        Incident saved = incidentRepository.save(incident);
        notificationService.createInAppNotification(incident.getReporterId(), "INCIDENT_UPDATED", "Báo cáo sự cố đã được cập nhật",
                "Trạng thái báo cáo của bạn: " + request.status().name());
        return dto(saved);
    }

    private Incident requireReport(UUID storeId, User user, UUID id) {
        Incident report = incidentRepository.findByIdAndStoreId(id, storeId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Report not found"));
        if (!user.getId().equals(report.getReporterId()) && !isManager(user)) throw error(HttpStatus.FORBIDDEN, "You cannot access this report");
        return report;
    }

    private User member(UUID storeId, UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "User not found"));
        if (user.getSystemRole() != SystemRole.ADMIN && !employmentRepository.existsByUserIdAndStoreIdAndStatus(userId, storeId, EmploymentStatus.ACTIVE))
            throw error(HttpStatus.FORBIDDEN, "Active employment in this store is required");
        return user;
    }

    private void manager(UUID storeId, UUID userId) {
        if (!isManager(member(storeId, userId))) throw error(HttpStatus.FORBIDDEN, "Manager access is required");
    }

    private boolean isManager(User user) { return user.getSystemRole() == SystemRole.MANAGER || user.getSystemRole() == SystemRole.ADMIN; }
    private PageRequest page(int limit) { return PageRequest.of(0, Math.max(1, Math.min(limit, 100))); }
    private IncidentDTO dto(Incident report) {
        return new IncidentDTO(report.getId(), report.getStoreId(), report.getShiftId(), report.getReporterId(), report.getReporterName(),
                report.getCategory(), report.getSeverity(), report.getStatus(), report.getDescription(), report.getCreatedAt(), report.getUpdatedAt(),
                report.getReviewNote(), photoRepository.metadata(report.getId()));
    }
    private IncidentSeverity defaultSeverity(IncidentCategory category) {
        return switch (category) { case SAFETY -> IncidentSeverity.HIGH; case EQUIPMENT, CUSTOMER -> IncidentSeverity.MEDIUM; case OTHER -> IncidentSeverity.LOW; };
    }

    private IncidentPhoto validatePhoto(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_PHOTO_BYTES) throw error(HttpStatus.BAD_REQUEST, "Each photo must be between 1 byte and 2 MiB");
        String type = Objects.toString(file.getContentType(), "").toLowerCase(Locale.ROOT);
        if (!Set.of("image/jpeg", "image/png").contains(type)) throw error(HttpStatus.BAD_REQUEST, "Only JPEG and PNG photos are allowed");
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length == 0 || bytes.length > MAX_PHOTO_BYTES) throw error(HttpStatus.BAD_REQUEST, "Photo exceeds size limit");
            try (ImageInputStream stream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = ImageIO.getImageReaders(stream);
                if (!readers.hasNext()) throw error(HttpStatus.BAD_REQUEST, "Photo is not a valid image");
                var reader = readers.next();
                try {
                    reader.setInput(stream, true, true);
                    String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                    if (!(type.equals("image/png") && format.equals("png")) && !(type.equals("image/jpeg") && Set.of("jpeg", "jpg").contains(format)))
                        throw error(HttpStatus.BAD_REQUEST, "Photo content does not match its type");
                    int width = reader.getWidth(0), height = reader.getHeight(0);
                    if (width < 1 || height < 1 || width > 8192 || height > 8192 || (long) width * height > 16_000_000)
                        throw error(HttpStatus.BAD_REQUEST, "Photo dimensions are too large");
                    if (reader.read(0) == null) throw error(HttpStatus.BAD_REQUEST, "Photo cannot be decoded");
                } finally { reader.dispose(); }
            }
            return IncidentPhoto.builder().id(UUID.randomUUID()).contentType(type).sizeBytes(bytes.length).data(bytes).build();
        } catch (IOException | IllegalArgumentException ex) {
            throw error(HttpStatus.BAD_REQUEST, "Photo is not a valid image");
        }
    }
    private BusinessException error(HttpStatus status, String message) { return new BusinessException(message, status); }
}
