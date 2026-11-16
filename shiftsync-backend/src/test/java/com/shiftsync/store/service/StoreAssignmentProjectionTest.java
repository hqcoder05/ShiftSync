package com.shiftsync.store.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.repository.ShiftTemplateRepository;
import com.shiftsync.shift.service.ShiftTemplateService;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class StoreAssignmentProjectionTest {
    @Test
    void storeDetailsReflectActiveManagerEmploymentsInsteadOfEmptyPlaceholderData() {
        StoreRepository stores = mock(StoreRepository.class);
        EmploymentRepository employments = mock(EmploymentRepository.class);
        UserRepository users = mock(UserRepository.class);
        Store store = Store.builder().id(UUID.randomUUID()).name("Chi nhánh A").build();
        User manager = User.builder().id(UUID.randomUUID()).fullName("Quản lý thật")
                .email("manager@example.com").phone("0900000000").avatarId("avatar-1")
                .systemRole(SystemRole.MANAGER).build();
        Employment assignment = Employment.builder().store(store).user(manager).status(EmploymentStatus.ACTIVE).build();

        when(stores.findById(store.getId())).thenReturn(Optional.of(store));
        when(employments.findByStoreIdAndStatusAndUserSystemRole(store.getId(), EmploymentStatus.ACTIVE, SystemRole.MANAGER))
                .thenReturn(List.of(assignment));
        when(employments.countByStoreIdAndStatus(store.getId(), EmploymentStatus.ACTIVE)).thenReturn(4L);

        StoreService service = new StoreService(stores, mock(AuditLogService.class),
                new ShiftTemplateService(mock(ShiftTemplateRepository.class), stores), mock(EntityManager.class),
                mock(com.shiftsync.leave.service.LeaveRequestService.class), employments, users);

        var dto = service.getStoreById(store.getId());

        assertEquals(1, dto.getManagerCount());
        assertEquals("Quản lý thật", dto.getManagers().getFirst().getFullName());
        assertEquals(4, dto.getStaffCount());
    }
}
