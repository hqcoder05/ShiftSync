package com.shiftsync.incident.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.incident.dto.IncidentDTOs.*;
import com.shiftsync.incident.entity.*;
import com.shiftsync.incident.repository.*;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IncidentServiceTest {
    @Mock IncidentRepository reports;
    @Mock IncidentPhotoRepository photos;
    @Mock EmploymentRepository employments;
    @Mock UserRepository users;
    @Mock ShiftRepository shifts;
    @Mock ShiftAssignmentRepository assignments;
    @Mock NotificationService notifications;
    @InjectMocks IncidentService service;
    UUID storeId = UUID.randomUUID(), userId = UUID.randomUUID(), requestId = UUID.randomUUID();

    private void member(SystemRole role) {
        when(users.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).fullName("Nhân viên").systemRole(role).build()));
        when(employments.existsByUserIdAndStoreIdAndStatus(userId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
    }
    private Incident report() {
        Incident report = new Incident();
        report.setId(UUID.randomUUID()); report.setStoreId(storeId); report.setReporterId(userId);
        report.setCategory(IncidentCategory.EQUIPMENT); report.setSeverity(IncidentSeverity.HIGH);
        report.setStatus(IncidentStatus.OPEN); report.setDescription("Máy pha đang bị hỏng");
        return report;
    }
    @Test void inactiveEmploymentCannotReadReportsOrPhotos() {
        when(users.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).systemRole(SystemRole.STAFF).build()));
        assertThrows(BusinessException.class, () -> service.mine(storeId, userId, 100));
        assertThrows(BusinessException.class, () -> service.photo(storeId, userId, UUID.randomUUID(), UUID.randomUUID()));
        verifyNoInteractions(reports, photos);
    }
    @Test void employeeCannotReadAnotherReportEvenInSameStore() {
        member(SystemRole.STAFF);
        Incident report = report(); report.setReporterId(UUID.randomUUID());
        when(reports.findByIdAndStoreId(report.getId(), storeId)).thenReturn(Optional.of(report));
        assertThrows(BusinessException.class, () -> service.detail(storeId, userId, report.getId()));
        assertThrows(BusinessException.class, () -> service.photo(storeId, userId, report.getId(), UUID.randomUUID()));
        verifyNoInteractions(photos);
    }
    @Test void clientRequestRetryReturnsPersistedReportWithoutNewPhotosOrNotifications() {
        member(SystemRole.STAFF);
        Incident report = report();
        when(reports.findByStoreIdAndReporterIdAndClientRequestId(storeId, userId, requestId)).thenReturn(Optional.of(report));
        assertEquals(report.getId(), service.create(storeId, userId, IncidentCategory.EQUIPMENT, IncidentSeverity.HIGH,
                "Máy pha đang bị hỏng", requestId, null, List.of()).id());
        verify(reports, never()).insertIfAbsent(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        verify(photos, never()).save(any());
        verifyNoInteractions(notifications);
    }
    @Test void shiftMustBeInStoreAndAssignedToReporter() {
        member(SystemRole.STAFF);
        assertThrows(BusinessException.class, () -> service.create(storeId, userId, IncidentCategory.OTHER, null,
                "Có vấn đề trong ca làm", requestId, UUID.randomUUID(), List.of()));
        verify(reports, never()).insertIfAbsent(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }
    @Test void rejectsOversizeOrMislabeledImageBeforeWriting() throws Exception {
        member(SystemRole.STAFF);
        var oversized = new MockMultipartFile("photos", "large.jpg", "image/jpeg", new byte[IncidentService.MAX_PHOTO_BYTES + 1]);
        assertThrows(BusinessException.class, () -> service.create(storeId, userId, IncidentCategory.OTHER, null,
                "Có vấn đề trong ca làm", requestId, null, List.of(oversized)));
        var mislabeled = new MockMultipartFile("photos", "bad.jpg", "image/jpeg", png());
        assertThrows(BusinessException.class, () -> service.create(storeId, userId, IncidentCategory.OTHER, null,
                "Có vấn đề trong ca làm", requestId, null, List.of(mislabeled)));
        verify(reports, never()).insertIfAbsent(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }
    @Test void savesValidPhotoSelectedSeverityAndDurableManagerNotification() throws Exception {
        member(SystemRole.STAFF);
        Incident report = report(); UUID managerId = UUID.randomUUID();
        when(reports.findByStoreIdAndReporterIdAndClientRequestId(storeId, userId, requestId)).thenReturn(Optional.empty(), Optional.of(report));
        when(reports.insertIfAbsent(any(), eq(storeId), isNull(), eq(userId), anyString(), eq(requestId), eq("EQUIPMENT"), eq("HIGH"), anyString(), any())).thenReturn(1);
        when(employments.findByStoreIdAndStatusAndUserSystemRole(storeId, EmploymentStatus.ACTIVE, SystemRole.MANAGER))
                .thenReturn(List.of(Employment.builder().user(User.builder().id(managerId).build()).build()));
        service.create(storeId, userId, IncidentCategory.EQUIPMENT, IncidentSeverity.HIGH, "Máy pha đang bị hỏng", requestId, null,
                List.of(new MockMultipartFile("photos", "evidence.png", "image/png", png())));
        ArgumentCaptor<IncidentPhoto> captured = ArgumentCaptor.forClass(IncidentPhoto.class);
        verify(photos).save(captured.capture());
        assertEquals(report.getId(), captured.getValue().getIncidentId());
        assertArrayEquals(png(), captured.getValue().getData());
        verify(notifications).createInAppNotification(eq(managerId), eq("INCIDENT_REPORTED"), anyString(), anyString());
    }
    @Test void managerStillNeedsActiveEmploymentInRequestedStore() {
        when(users.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).systemRole(SystemRole.MANAGER).build()));
        assertThrows(BusinessException.class, () -> service.all(storeId, userId, 100));
        assertThrows(BusinessException.class, () -> service.review(storeId, userId, UUID.randomUUID(), new ReviewRequest(IncidentStatus.RESOLVED, "Đã sửa")));
        verifyNoInteractions(reports, notifications);
    }
    private byte[] png() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
        return bytes.toByteArray();
    }
}
