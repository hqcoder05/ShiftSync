package com.shiftsync.attendance.controller;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StaffActivityControllerTest {
    @Test void rejectsOtherStoreBeforeQueryingActivity() {
        var db = mock(EntityManager.class); var users = mock(UserRepository.class);
        var memberships = mock(EmploymentRepository.class); var auth = mock(Authentication.class);
        var user = UUID.randomUUID(); var store = UUID.randomUUID();
        when(auth.getName()).thenReturn("staff@example.test");
        when(users.findByEmail("staff@example.test")).thenReturn(Optional.of(User.builder().id(user).build()));
        var controller = new StaffActivityController(db, users, memberships);
        var error = assertThrows(BusinessException.class, () -> controller.list(store, 30, null, auth));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(db);
    }

    @Test void rejectsMalformedCursor() {
        var db = mock(EntityManager.class); var users = mock(UserRepository.class);
        var memberships = mock(EmploymentRepository.class); var auth = mock(Authentication.class);
        var user = UUID.randomUUID(); var store = UUID.randomUUID();
        when(auth.getName()).thenReturn("staff@example.test");
        when(users.findByEmail("staff@example.test")).thenReturn(Optional.of(User.builder().id(user).build()));
        when(memberships.existsByUserIdAndStoreIdAndStatus(user, store, EmploymentStatus.ACTIVE)).thenReturn(true);
        var controller = new StaffActivityController(db, users, memberships);
        assertThrows(BusinessException.class, () -> controller.list(store, 30, "invalid!", auth));
        verifyNoInteractions(db);
    }
}
