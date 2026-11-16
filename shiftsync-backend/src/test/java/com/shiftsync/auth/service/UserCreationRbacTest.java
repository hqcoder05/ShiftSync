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

import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
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
    @Mock private EmploymentRepository employmentRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private ContractTypeRepository contractTypeRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
                userService = new UserService(
                userRepository,
                passwordEncoder,
                auditLogService,
                employmentRepository,
                skillRepository,
                staffSkillRepository,
                storeRepository,
                contractTypeRepository
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
    @DisplayName("MANAGER cannot create an unassigned STAFF account")
    void managerCreatesStaff_WithoutStore_ThrowsBadRequest() {
        CustomUserDetails managerActor = createActor(SystemRole.MANAGER);
        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("Valid Staff")
                .email("validstaff@shiftsync.com")
                .password("Password123")
                .phone("0987654321")
                .systemRole(SystemRole.STAFF)
                .build();

        BusinessException exception = assertThrows(BusinessException.class,
                () -> userService.createUser(request, managerActor));
        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("ADMIN cannot create an unassigned STAFF account")
    void adminCreatesStaff_WithoutStore_ThrowsBadRequest() {
        CustomUserDetails adminActor = createActor(SystemRole.ADMIN);
        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("Unassigned Staff")
                .email("unassigned@shiftsync.com")
                .password("Password123")
                .systemRole(SystemRole.STAFF)
                .build();

        BusinessException exception = assertThrows(BusinessException.class,
                () -> userService.createUser(request, adminActor));
        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(userRepository, never()).save(any(User.class));
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
        UUID storeId = UUID.randomUUID();

        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("Skilled Barista")
                .email("barista@shiftsync.com")
                .password("Password123")
                .phone("0987654321")
                .systemRole(SystemRole.STAFF)
                .storeId(storeId)
                .skillIds(List.of(skill1, skill2))
                .build();

        when(userRepository.findByEmail("barista@shiftsync.com")).thenReturn(Optional.empty());
        UUID newUserId = UUID.randomUUID();
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(newUserId);
            return u;
        });
        Store store = Store.builder().id(storeId).name("Store 1").build();
        ContractType contract = ContractType.builder().id(UUID.randomUUID()).store(store)
                .name("Chính thức").maxWeeklyHours(30).defaultHourlyRate(new BigDecimal("40000"))
                .build();
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(contractTypeRepository.findByStoreId(storeId)).thenReturn(List.of(contract));



        when(skillRepository.findAllById(org.mockito.ArgumentMatchers.any())).thenReturn(List.of(com.shiftsync.skill.entity.Skill.builder().id(skill1).build(), com.shiftsync.skill.entity.Skill.builder().id(skill2).build()));
        UserDTO result = userService.createUser(request, adminActor);
        assertNotNull(result);
        verify(staffSkillRepository, times(1)).saveAll(org.mockito.ArgumentMatchers.anyIterable());
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
                .storeId(UUID.randomUUID())
                .build();

        when(userRepository.findByEmail("dup@shiftsync.com")).thenReturn(Optional.of(new User()));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                userService.createUser(request, adminActor));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    @org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
    @DisplayName("MANAGER creating STAFF with storeId creates User and Employment record")
    void managerCreatesStaff_WithStoreId_CreatesEmploymentRecord() {
        CustomUserDetails managerActor = createActor(SystemRole.MANAGER);
        UUID storeId = UUID.randomUUID();
        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("Store Staff")
                .email("storestaff@shiftsync.com")
                .password("Password123")
                .phone("0987654321")
                .systemRole(SystemRole.STAFF)
                .storeId(storeId)
                .build();

        when(userRepository.findByEmail("storestaff@shiftsync.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        when(employmentRepository.isStaffInStore(managerActor.getUser().getId(), storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        Store mockStore = Store.builder().id(storeId).name("Store 1").build();
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(mockStore));
        ContractType contract = ContractType.builder().id(UUID.randomUUID()).store(mockStore)
                .name("Chính thức").maxWeeklyHours(30).defaultHourlyRate(new BigDecimal("40000"))
                .otMultiplier(new BigDecimal("1.5")).build();
        when(contractTypeRepository.findByStoreId(storeId)).thenReturn(List.of(contract));

        UserDTO result = userService.createUser(request, managerActor);

        assertNotNull(result);
        assertEquals("Store Staff", result.getFullName());
        verify(employmentRepository).save(argThat(employment -> employment.getUser().getId().equals(result.getId())
                && employment.getStore().getId().equals(storeId)
                && employment.getHourlyRate().compareTo(new BigDecimal("40000")) == 0));

    }

    @Test
    @DisplayName("MANAGER cannot create STAFF for a store they do not operate")
    void managerCreatesStaff_ForForeignStore_ThrowsForbidden() {
        CustomUserDetails managerActor = createActor(SystemRole.MANAGER);
        UUID storeId = UUID.randomUUID();
        UserCreateRequest request = UserCreateRequest.builder()
                .fullName("Foreign Store Staff").email("foreignstaff@shiftsync.com")
                .password("Password123").systemRole(SystemRole.STAFF).storeId(storeId).build();
        when(userRepository.findByEmail("foreignstaff@shiftsync.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0); user.setId(UUID.randomUUID()); return user;
        });
        when(employmentRepository.isStaffInStore(managerActor.getId(), storeId, EmploymentStatus.ACTIVE)).thenReturn(false);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> userService.createUser(request, managerActor));
        assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
        verify(employmentRepository, never()).save(any(Employment.class));
    }

    @Test
    @DisplayName("MANAGER queries users with authorized storeId succeeds")
    void managerGetAllUsers_AuthorizedStore_Success() {
        UUID managerId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 10);

        when(employmentRepository.isStaffInStore(managerId, storeId, EmploymentStatus.ACTIVE)).thenReturn(true);
        when(userRepository.findUsersInStores(List.of(storeId), EmploymentStatus.ACTIVE, pageable))
                .thenReturn(new PageImpl<>(List.of(User.builder().id(UUID.randomUUID()).email("staff@shiftsync.com").build())));

        Page<UserDTO> result = userService.getAllUsers(managerId, SystemRole.MANAGER, storeId, null, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(userRepository).findUsersInStores(List.of(storeId), EmploymentStatus.ACTIVE, pageable);
    }

    @Test
    @DisplayName("MANAGER queries users with unauthorized storeId throws 403 Forbidden")
    void managerGetAllUsers_UnauthorizedStore_ThrowsForbidden() {
        UUID managerId = UUID.randomUUID();
        UUID unauthorizedStoreId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 10);

        when(employmentRepository.isStaffInStore(managerId, unauthorizedStoreId, EmploymentStatus.ACTIVE)).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                userService.getAllUsers(managerId, SystemRole.MANAGER, unauthorizedStoreId, null, pageable));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verify(userRepository, never()).findUsersInStores(any(), any(), any());
    }

    @Test
    @DisplayName("ADMIN queries users with specific storeId filters by that store")
    void adminGetAllUsers_SpecificStore_Success() {
        UUID adminId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 10);

        when(userRepository.findUsersInStores(List.of(storeId), EmploymentStatus.ACTIVE, pageable))
                .thenReturn(new PageImpl<>(List.of(User.builder().id(UUID.randomUUID()).email("staff@shiftsync.com").build())));

        Page<UserDTO> result = userService.getAllUsers(adminId, SystemRole.ADMIN, storeId, null, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(userRepository).findUsersInStores(List.of(storeId), EmploymentStatus.ACTIVE, pageable);
    }
}














