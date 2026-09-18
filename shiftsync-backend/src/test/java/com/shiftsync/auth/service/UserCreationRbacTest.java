package com.shiftsync.auth.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.auth.dto.UserCreateRequest;
import com.shiftsync.auth.dto.UserDTO;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.skill.repository.StaffSkillRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserCreationRbacTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditLogService auditLogService;
    @Mock private SkillRepository skillRepository;
    @Mock private StaffSkillRepository staffSkillRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(
                userRepository,
                passwordEncoder,
                auditLogService,
                null,
                skillRepository,
                staffSkillRepository
        );
        lenient().when(passwordEncoder.encode(any())).thenReturn("hashedPassword123");
    }

    private CustomUserDetails createActor(SystemRole role) {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("actor@shiftsync.com")
                .fullName("Actor User")
                .systemRole(role)
                .build();
        return new CustomUserDetails(user);
    }

    @Test
    @DisplayName("STAFF caller cannot create any user (403 Forbidden)")
    void staffCaller_ThrowsForbidden() {
        CustomUserDetails staffActor = createActor(SystemRole.STAFF);
        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("New Staff")
                .email("newstaff@shiftsync.com")
                .password("Password123")
                .systemRole(SystemRole.STAFF)
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                userService.createUser(request, staffActor));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    @DisplayName("Cannot create ADMIN user (403 Forbidden)")
    void createAdmin_ThrowsForbidden() {
        CustomUserDetails adminActor = createActor(SystemRole.ADMIN);
        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("New Admin")
                .email("newadmin@shiftsync.com")
                .password("Password123")
                .systemRole(SystemRole.ADMIN)
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                userService.createUser(request, adminActor));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    @DisplayName("MANAGER cannot create MANAGER (403 Forbidden)")
    void managerCreatesManager_ThrowsForbidden() {
        CustomUserDetails managerActor = createActor(SystemRole.MANAGER);
        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("Another Manager")
                .email("manager2@shiftsync.com")
                .password("Password123")
                .systemRole(SystemRole.MANAGER)
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                userService.createUser(request, managerActor));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    @DisplayName("MANAGER can create STAFF (Success)")
    void managerCreatesStaff_Success() {
        CustomUserDetails managerActor = createActor(SystemRole.MANAGER);
        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("Valid Staff")
                .email("validstaff@shiftsync.com")
                .password("Password123")
                .phone("0987654321")
                .systemRole(SystemRole.STAFF)
                .build();

        when(userRepository.findByEmail("validstaff@shiftsync.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        UserDTO result = userService.createUser(request, managerActor);
        assertNotNull(result);
        assertEquals("Valid Staff", result.getFullName());
        assertEquals(SystemRole.STAFF, result.getSystemRole());
    }

    @Test
    @DisplayName("ADMIN can create MANAGER (Success)")
    void adminCreatesManager_Success() {
        CustomUserDetails adminActor = createActor(SystemRole.ADMIN);
        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("Store Manager")
                .email("storemanager@shiftsync.com")
                .password("Password123")
                .phone("0987654321")
                .systemRole(SystemRole.MANAGER)
                .build();

        when(userRepository.findByEmail("storemanager@shiftsync.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        UserDTO result = userService.createUser(request, adminActor);
        assertNotNull(result);
        assertEquals(SystemRole.MANAGER, result.getSystemRole());
    }

    @Test
    @DisplayName("STAFF creation with atomic skill assignment saves StaffSkill records")
    void staffCreation_WithSkills_SavesStaffSkillRecords() {
        CustomUserDetails adminActor = createActor(SystemRole.ADMIN);
        UUID skill1 = UUID.randomUUID();
        UUID skill2 = UUID.randomUUID();

        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("Skilled Barista")
                .email("barista@shiftsync.com")
                .password("Password123")
                .phone("0987654321")
                .systemRole(SystemRole.STAFF)
                .skillIds(List.of(skill1, skill2))
                .build();

        when(userRepository.findByEmail("barista@shiftsync.com")).thenReturn(Optional.empty());
        UUID newUserId = UUID.randomUUID();
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(newUserId);
            return u;
        });

        when(skillRepository.existsById(skill1)).thenReturn(true);
        when(skillRepository.existsById(skill2)).thenReturn(true);

        UserDTO result = userService.createUser(request, adminActor);
        assertNotNull(result);

        ArgumentCaptor<StaffSkill> captor = ArgumentCaptor.forClass(StaffSkill.class);
        verify(staffSkillRepository, times(2)).save(captor.capture());

        List<StaffSkill> savedSkills = captor.getAllValues();
        assertEquals(2, savedSkills.size());
        assertEquals("BEGINNER", savedSkills.get(0).getLevel());
        assertEquals(newUserId, savedSkills.get(0).getStaffId());
    }

    @Test
    @DisplayName("Existing email throws 409 Conflict")
    void existingEmail_ThrowsConflict() {
        CustomUserDetails adminActor = createActor(SystemRole.ADMIN);
        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("Duplicate Email")
                .email("dup@shiftsync.com")
                .password("Password123")
                .systemRole(SystemRole.STAFF)
                .build();

        when(userRepository.findByEmail("dup@shiftsync.com")).thenReturn(Optional.of(new User()));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                userService.createUser(request, adminActor));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }
}
