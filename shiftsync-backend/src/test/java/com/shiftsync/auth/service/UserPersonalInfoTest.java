package com.shiftsync.auth.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.controller.UserController;
import com.shiftsync.auth.dto.UserDTO;
import com.shiftsync.auth.dto.UserPersonalInfoRequest;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.service.ShiftService;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserPersonalInfoTest {
    @Test
    void serializesBirthDateAsIsoStringAndKeepsExplicitNullForClearedFields() throws Exception {
        var mapper = new com.shiftsync.shared.config.JacksonConfig().objectMapper();
        var populated = UserDTO.builder().birthDate(LocalDate.of(2000, 2, 29)).build();
        assertEquals("2000-02-29", mapper.readTree(mapper.writeValueAsString(populated)).get("birthDate").asText());
        var cleared = mapper.readTree(mapper.writeValueAsString(UserDTO.builder().build()));
        assertTrue(cleared.has("birthDate"));
        assertTrue(cleared.get("birthDate").isNull());
        var request = mapper.readValue("{\"birthDate\":\"2000-02-29\"}", UserPersonalInfoRequest.class);
        assertEquals(LocalDate.of(2000, 2, 29), request.getBirthDate());
        assertThrows(com.fasterxml.jackson.core.JsonProcessingException.class,
                () -> mapper.readValue("{\"birthDate\":\"2001-02-29\"}", UserPersonalInfoRequest.class));
        assertThrows(com.fasterxml.jackson.core.JsonProcessingException.class,
                () -> mapper.readValue("{\"birthDate\":\"2000-02-31\"}", UserPersonalInfoRequest.class));
    }

    @Test
    void savesAndReturnsAllPersonalFieldsWithoutChangingAccountIdentityOrRole() {
        var repository = mock(UserRepository.class);
        var service = new UserService(repository, mock(PasswordEncoder.class), mock(AuditLogService.class));
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).fullName("Nhân viên").email("staff@example.com")
                .systemRole(SystemRole.STAFF).phone("0901234567").avatarId("dilan").build();
        when(repository.findById(userId)).thenReturn(Optional.of(user));
        when(repository.save(user)).thenReturn(user);
        var request = UserPersonalInfoRequest.builder().phone("+84912345678")
                .birthDate(LocalDate.of(2000, 2, 29)).birthPlace("  Cần Thơ  ").gender("Nữ").build();

        UserDTO result = service.updatePersonalInfo(userId, request);

        assertEquals(request.getBirthDate(), result.getBirthDate());
        assertEquals("Cần Thơ", result.getBirthPlace());
        assertEquals("Nữ", result.getGender());
        assertEquals("+84912345678", result.getPhone());
        assertEquals("Nhân viên", result.getFullName());
        assertEquals("staff@example.com", result.getEmail());
        assertEquals(SystemRole.STAFF, result.getSystemRole());
        assertEquals("dilan", result.getAvatarId());
        verify(repository).save(user);
    }

    @Test
    void allowsClearingOptionalPersonalFields() {
        var repository = mock(UserRepository.class);
        var service = new UserService(repository, mock(PasswordEncoder.class), mock(AuditLogService.class));
        User user = User.builder().id(UUID.randomUUID()).phone("0901234567")
                .birthDate(LocalDate.of(2000, 1, 1)).birthPlace("Cần Thơ").gender("Nam").build();
        when(repository.findById(user.getId())).thenReturn(Optional.of(user));
        when(repository.save(user)).thenReturn(user);

        var result = service.updatePersonalInfo(user.getId(), new UserPersonalInfoRequest());

        assertEquals("", result.getPhone());
        assertNull(result.getBirthDate());
        assertEquals("", result.getBirthPlace());
        assertEquals("", result.getGender());
    }

    @Test
    void rejectsFutureBirthDateUsingVietnamCalendar() {
        var repository = mock(UserRepository.class);
        var service = new UserService(repository, mock(PasswordEncoder.class), mock(AuditLogService.class));
        var request = UserPersonalInfoRequest.builder().birthDate(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1)).build();

        var error = assertThrows(BusinessException.class, () -> service.updatePersonalInfo(UUID.randomUUID(), request));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(repository);
    }

    @Test
    void endpointAlwaysUsesAuthenticatedUserId() {
        var service = mock(UserService.class);
        var controller = new UserController(service, mock(ShiftService.class));
        var details = mock(CustomUserDetails.class);
        UUID ownId = UUID.randomUUID();
        when(details.getId()).thenReturn(ownId);
        var request = UserPersonalInfoRequest.builder().phone("0912345678").build();
        when(service.updatePersonalInfo(ownId, request)).thenReturn(UserDTO.builder().id(ownId).phone(request.getPhone()).build());

        var result = controller.updateMyPersonalInfo(details, request);

        assertEquals(ownId, result.getBody().getId());
        verify(service).updatePersonalInfo(ownId, request);
        verifyNoMoreInteractions(service);
    }

    @Test
    void validatesPhoneGenderAndBirthplaceAtHttpBoundary() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(UserPersonalInfoRequest.builder().phone("0912345678").gender("Nữ").build()).isEmpty());
            assertTrue(validator.validate(UserPersonalInfoRequest.builder().phone("").gender("").build()).isEmpty());
            assertTrue(validator.validate(UserPersonalInfoRequest.builder().phone("+84912345678").build()).isEmpty());
            assertFalse(validator.validate(UserPersonalInfoRequest.builder().phone("123").build()).isEmpty());
            assertFalse(validator.validate(UserPersonalInfoRequest.builder().gender("ADMIN").build()).isEmpty());
            assertFalse(validator.validate(UserPersonalInfoRequest.builder().birthPlace("a".repeat(161)).build()).isEmpty());
        }
    }
}
