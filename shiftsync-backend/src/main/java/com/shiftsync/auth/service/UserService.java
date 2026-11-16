package com.shiftsync.auth.service;
import com.shiftsync.audit.service.AuditLogService;

import com.shiftsync.auth.dto.UserCreateRequest;
import com.shiftsync.auth.dto.UserDTO;
import com.shiftsync.auth.dto.UserUpdateRequest;
import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.mapper.UserMapper;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.SkillRepository;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.shared.security.CustomUserDetails;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.time.LocalDate;

@Service
public class UserService {
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmploymentRepository employmentRepository;
    private final StoreRepository storeRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final SkillRepository skillRepository;
    private final StaffSkillRepository staffSkillRepository;

    @Autowired
    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService,
            @Autowired(required = false) EmploymentRepository employmentRepository,
            @Autowired(required = false) SkillRepository skillRepository,
            @Autowired(required = false) StaffSkillRepository staffSkillRepository,
            @Autowired(required = false) StoreRepository storeRepository,
            @Autowired(required = false) ContractTypeRepository contractTypeRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.employmentRepository = employmentRepository;
        this.storeRepository = storeRepository;
        this.contractTypeRepository = contractTypeRepository;
        this.skillRepository = skillRepository;
        this.staffSkillRepository = staffSkillRepository;
    }

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditLogService auditLogService) {
        this(userRepository, passwordEncoder, auditLogService, null, null, null, null, null);
    }

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditLogService auditLogService,
                       EmploymentRepository employmentRepository, SkillRepository skillRepository,
                       StaffSkillRepository staffSkillRepository) {
        this(userRepository, passwordEncoder, auditLogService, employmentRepository, skillRepository,
                staffSkillRepository, null, null);
    }

    @Transactional
    public UserDTO createUser(UserCreateRequest request) {
        return createUser(request, null);
    }

    @Transactional
    public UserDTO createUser(UserCreateRequest request, CustomUserDetails actorDetails) {
        // Enforce RBAC rules per Section 19.1:
        if (actorDetails != null && actorDetails.getUser() != null) {
            SystemRole actorRole = actorDetails.getUser().getSystemRole();
            if (actorRole == SystemRole.STAFF) {
                throw new BusinessException("Nhân viên không có quyền tạo tài khoản", HttpStatus.FORBIDDEN);
            }
            if (request.getSystemRole() == SystemRole.ADMIN) {
                throw new BusinessException("Không được phép tạo tài khoản Quản trị viên (ADMIN)", HttpStatus.FORBIDDEN);
            }
            if (actorRole == SystemRole.MANAGER && request.getSystemRole() != SystemRole.STAFF) {
                throw new BusinessException("Quản lý chỉ có quyền tạo tài khoản Nhân viên (STAFF)", HttpStatus.FORBIDDEN);
            }
            if (request.getSystemRole() == SystemRole.STAFF && request.getStoreId() == null) {
                throw new BusinessException("Cần chọn chi nhánh khi tạo tài khoản nhân viên", HttpStatus.BAD_REQUEST);
            }
        } else {
            if (request.getSystemRole() == SystemRole.ADMIN) {
                throw new BusinessException("Không được phép tạo tài khoản Quản trị viên (ADMIN)", HttpStatus.FORBIDDEN);
            }
        }

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessException("Email đã tồn tại trong hệ thống: " + request.getEmail(), HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .gender(request.getGender() == null ? "MALE" : request.getGender())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .systemRole(request.getSystemRole())
                .build();

        User savedUser = userRepository.save(user);

        if (request.getStoreId() != null) {
            createInitialEmployment(savedUser, request, actorDetails);
        }

        // Atomic Skill Assignment if role is STAFF and skillIds provided
        if (request.getSystemRole() == SystemRole.STAFF && request.getSkillIds() != null && !request.getSkillIds().isEmpty()) {
            if (skillRepository != null && staffSkillRepository != null) {
                long foundCount = skillRepository.findAllById(request.getSkillIds()).size();
                if (foundCount != request.getSkillIds().size()) {
                    throw new BusinessException("Kỹ năng không tồn tại trong hệ thống", HttpStatus.BAD_REQUEST);
                }
                java.util.List<StaffSkill> skillsToSave = request.getSkillIds().stream().map(skillId ->
                        StaffSkill.builder()
                                .staffId(savedUser.getId())
                                .skillId(skillId)
                                .level(com.shiftsync.skill.entity.SkillLevel.BEGINNER)
                                .build()
                ).toList();
                staffSkillRepository.saveAll(skillsToSave);
            }
        }

        auditLogService.log(actorDetails == null ? null : actorDetails.getId(), "CREATE", "User", savedUser.getId(),
                null, java.util.Map.of("email", savedUser.getEmail(), "role", savedUser.getSystemRole().name(),
                        "storeId", request.getStoreId() == null ? "" : request.getStoreId().toString()));
        return UserMapper.toDTO(savedUser);
    }

    private void createInitialEmployment(User user, UserCreateRequest request, CustomUserDetails actorDetails) {
        if (employmentRepository == null || storeRepository == null || contractTypeRepository == null) {
            throw new IllegalStateException("Thiếu cấu hình dịch vụ phân công nhân sự");
        }
        UUID storeId = request.getStoreId();
        if (actorDetails != null && actorDetails.getUser() != null
                && actorDetails.getUser().getSystemRole() == SystemRole.MANAGER
                && !employmentRepository.isStaffInStore(actorDetails.getId(), storeId, EmploymentStatus.ACTIVE)) {
            throw new BusinessException("Không có quyền tạo nhân sự cho chi nhánh này", HttpStatus.FORBIDDEN);
        }
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy chi nhánh", HttpStatus.NOT_FOUND));
        ContractType contractType;
        if (request.getContractTypeId() != null) {
            contractType = contractTypeRepository.findById(request.getContractTypeId())
                    .orElseThrow(() -> new BusinessException("Không tìm thấy loại hợp đồng đã chọn", HttpStatus.BAD_REQUEST));
            if (contractType.getStore() == null || !storeId.equals(contractType.getStore().getId())) {
                throw new BusinessException("Loại hợp đồng không thuộc chi nhánh được chọn", HttpStatus.BAD_REQUEST);
            }
        } else {
            contractType = contractTypeRepository.findByStoreId(storeId).stream().findFirst()
                    .orElseThrow(() -> new BusinessException("Chi nhánh chưa có loại hợp đồng; cần cấu hình trước khi tạo nhân sự", HttpStatus.CONFLICT));
        }
        // Shift payroll resolves the assigned skill/position rate first. The
        // employment rate is only the contractual fallback, never user input
        // at account-creation time.
        java.math.BigDecimal hourlyRate = contractType.getDefaultHourlyRate();
        if (hourlyRate == null || hourlyRate.signum() <= 0) {
            throw new BusinessException("Lương theo giờ phải lớn hơn 0", HttpStatus.BAD_REQUEST);
        }
        employmentRepository.save(Employment.builder()
                .user(user)
                .store(store)
                .contractType(contractType)
                .hourlyRate(hourlyRate)
                .status(EmploymentStatus.ACTIVE)
                .joinedDate(request.getJoinedDate() == null
                        ? LocalDate.now(com.shiftsync.payroll.service.CompensationEffectiveDate.BUSINESS_ZONE)
                        : request.getJoinedDate())
                .build());
    }

        @Transactional(readOnly = true)
    public Page<UserDTO> getAllUsers(java.util.UUID actorId, com.shiftsync.shared.security.SystemRole actorRole, java.util.UUID storeId, String search, org.springframework.data.domain.Pageable pageable) {
        if (storeId != null) {
            if (actorRole == com.shiftsync.shared.security.SystemRole.MANAGER) {
                if (employmentRepository == null || !employmentRepository.isStaffInStore(actorId, storeId, EmploymentStatus.ACTIVE)) {
                    throw new BusinessException("Forbidden", org.springframework.http.HttpStatus.FORBIDDEN);
                }
            }
            if (search == null || search.trim().isEmpty()) {
                return userRepository.findUsersInStores(java.util.List.of(storeId), EmploymentStatus.ACTIVE, pageable).map(com.shiftsync.auth.mapper.UserMapper::toDTO);
            }
            return userRepository.searchUsersInStores(java.util.List.of(storeId), search.trim(), pageable).map(com.shiftsync.auth.mapper.UserMapper::toDTO);
        }
        return getAllUsers(actorId, actorRole, search, pageable);
    }

    @Transactional(readOnly = true)
    public Page<UserDTO> getAllUsers(UUID actorId, SystemRole actorRole, String search, Pageable pageable) {
        if (actorRole == SystemRole.MANAGER && actorId != null && employmentRepository != null) {
            List<Employment> employments = employmentRepository.findByUserIdAndStatus(actorId, EmploymentStatus.ACTIVE);
            List<UUID> storeIds = employments.stream().map(e -> e.getStore().getId()).distinct().toList();
            if (storeIds.isEmpty()) {
                return new PageImpl<>(Collections.emptyList(), pageable, 0);
            }
            if (search == null || search.trim().isEmpty()) {
                return userRepository.findUsersInStores(storeIds, pageable).map(UserMapper::toDTO);
            }
            return userRepository.searchUsersInStores(storeIds, search.trim(), pageable).map(UserMapper::toDTO);
        }

        return getAllUsers(search, pageable);
    }

    @Transactional(readOnly = true)
    public UserDTO getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found with id: " + id, HttpStatus.NOT_FOUND));
        return UserMapper.toDTO(user);
    }

    @Transactional
    public UserDTO updateUser(UUID id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found with id: " + id, HttpStatus.NOT_FOUND));
        String previousEmail = user.getEmail();
        boolean emailChanged = !Objects.equals(previousEmail, request.getEmail());

        userRepository.findByEmail(request.getEmail())
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new BusinessException("Email already in use: " + request.getEmail(), HttpStatus.CONFLICT);
                    }
                });

        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setBirthDate(request.getBirthDate());
        user.setBirthPlace(request.getBirthPlace());
        if (request.getGender() != null) user.setGender(request.getGender());
        if (request.getAvatarId() != null) {
            user.setAvatarId(request.getAvatarId());
        }

        boolean passwordChanged = request.getPassword() != null && !request.getPassword().trim().isEmpty();
        if (passwordChanged) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        // Email appears in the token subject and password proves account ownership.
        // Either change must close every pre-existing access and refresh session.
        if (emailChanged || passwordChanged) {
            user.setCredentialVersion(user.getCredentialVersion() + 1);
        }

        User updatedUser = userRepository.save(user);
        return UserMapper.toDTO(updatedUser);
    }

    @Transactional
    public UserDTO updateUserAvatar(UUID id, String avatarId) {
        com.shiftsync.shared.security.AvatarUrlPolicy.validate(avatarId);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found with id: " + id, HttpStatus.NOT_FOUND));
        user.setAvatarId(avatarId);
        User updatedUser = userRepository.save(user);
        return UserMapper.toDTO(updatedUser);
    }

    @Transactional
    public void deleteUser(UUID id, UUID actorId) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        if (userRepository.isSoleManagerOfAnyStore(id)) {
            throw new BusinessException("Cannot delete User: User is the sole Manager of a Store.", HttpStatus.CONFLICT);
        }
        if (userRepository.hasActiveEmployment(id)) {
            throw new BusinessException("Cannot delete User: User has active employments.", HttpStatus.CONFLICT);
        }
        if (userRepository.hasFuturePublishedShifts(id)) {
            throw new BusinessException("Cannot delete User: User is assigned to future published shifts.", HttpStatus.CONFLICT);
        }

        userRepository.delete(user);
        auditLogService.log(actorId, "SOFT_DELETE", "User", id, 
                java.util.Map.of("email", user.getEmail(), "role", user.getSystemRole().name()), 
                java.util.Map.of("deleted", true));

    }

    @Transactional(readOnly = true)
    public UserDTO getUserById(java.util.UUID id, com.shiftsync.shared.security.CustomUserDetails userDetails) {
        authorizeUserAccess(id, userDetails, false);
        return getUserById(id);
    }

    @Transactional
    public UserDTO updateUser(java.util.UUID id, com.shiftsync.auth.dto.UserUpdateRequest request, com.shiftsync.shared.security.CustomUserDetails userDetails) {
        authorizeUserAccess(id, userDetails, true);
        String previousEmail = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND))
                .getEmail();
        boolean emailChanged = !Objects.equals(previousEmail, request.getEmail());
        boolean passwordChanged = request.getPassword() != null && !request.getPassword().trim().isEmpty();
        UserDTO updated = updateUser(id, request);
        auditLogService.log(userDetails.getId(), "UPDATE", "User", id,
                java.util.Map.of("email", userDetails.getId().equals(id) ? "self" : "staff"),
                java.util.Map.of("emailChanged", emailChanged, "passwordChanged", passwordChanged));
        return updated;
    }

    private void authorizeUserAccess(UUID targetId, CustomUserDetails actor, boolean modifying) {
        if (actor == null || actor.getUser() == null || actor.getId() == null) {
            throw new BusinessException("Không có quyền truy cập tài khoản", HttpStatus.FORBIDDEN);
        }
        if (actor.getId().equals(targetId) || actor.getUser().getSystemRole() == SystemRole.ADMIN) {
            return;
        }
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản", HttpStatus.NOT_FOUND));
        if (actor.getUser().getSystemRole() != SystemRole.MANAGER
                || (modifying && target.getSystemRole() != SystemRole.STAFF)
                || employmentRepository == null
                || employmentRepository.countSharedStores(actor.getId(), targetId, EmploymentStatus.ACTIVE) == 0) {
            throw new BusinessException("Không có quyền truy cập tài khoản", HttpStatus.FORBIDDEN);
        }
    }

    public org.springframework.data.domain.Page<com.shiftsync.auth.dto.UserDTO> getAllUsers(String search, org.springframework.data.domain.Pageable pageable) {
        if (search == null || search.trim().isEmpty()) {
            return userRepository.findAll(pageable).map(com.shiftsync.auth.mapper.UserMapper::toDTO);
        }
        return userRepository.searchUsers(search.trim(), pageable).map(com.shiftsync.auth.mapper.UserMapper::toDTO);
    }
}


