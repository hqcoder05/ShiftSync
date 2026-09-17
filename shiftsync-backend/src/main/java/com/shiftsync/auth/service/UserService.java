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
import com.shiftsync.shared.security.SystemRole;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class UserService {
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmploymentRepository employmentRepository;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditLogService auditLogService, @Autowired(required = false) EmploymentRepository employmentRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.employmentRepository = employmentRepository;
    }

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditLogService auditLogService) {
        this(userRepository, passwordEncoder, auditLogService, null);
    }

    @Transactional
    public UserDTO createUser(UserCreateRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessException("User already exists with email: " + request.getEmail(), HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .systemRole(request.getSystemRole())
                .build();

        User savedUser = userRepository.save(user);
        return UserMapper.toDTO(savedUser);
    }

    @Transactional(readOnly = true)
    public Page<UserDTO> getAllUsers(String search, Pageable pageable) {
        if (search == null || search.trim().isEmpty()) {
            return userRepository.findAll(pageable).map(UserMapper::toDTO);
        }
        return userRepository.searchUsers(search.trim(), pageable).map(UserMapper::toDTO);
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

        userRepository.findByEmail(request.getEmail())
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new BusinessException("Email already in use: " + request.getEmail(), HttpStatus.CONFLICT);
                    }
                });

        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        if (request.getAvatarId() != null) {
            user.setAvatarId(request.getAvatarId());
        }

        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        User updatedUser = userRepository.save(user);
        return UserMapper.toDTO(updatedUser);
    }

    @Transactional
    public UserDTO updateUserAvatar(UUID id, String avatarId) {
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
}
