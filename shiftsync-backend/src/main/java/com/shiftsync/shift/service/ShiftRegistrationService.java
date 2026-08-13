package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.enums.ApprovalStatus;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.dto.ShiftRegistrationDTO;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftRegistration;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRegistrationRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShiftRegistrationService {

    private final ShiftRepository shiftRepository;
    private final ShiftRegistrationRepository shiftRegistrationRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final UserRepository userRepository;
    private final ShiftValidationService shiftValidationService;

    @Transactional
    public ShiftRegistrationDTO registerForShift(UUID storeId, UUID shiftId, UUID staffId) {
        Shift shift = getShiftAndVerifyStore(shiftId, storeId);

        if (shift.getStatus() != ShiftStatus.PUBLISHED) {
            throw new BusinessException("Can only register for PUBLISHED shifts", HttpStatus.BAD_REQUEST);
        }
        
        if (ZonedDateTime.now().isAfter(shift.getRegistrationDeadline())) {
            throw new BusinessException("Registration deadline has passed", HttpStatus.BAD_REQUEST);
        }

        if (shiftRegistrationRepository.existsByShiftIdAndStaffId(shiftId, staffId)) {
            throw new BusinessException("You have already registered for this shift", HttpStatus.CONFLICT);
        }
        
        if (shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, staffId)) {
            throw new BusinessException("You are already assigned to this shift", HttpStatus.CONFLICT);
        }

        shiftValidationService.validateNoOverlapAndWeeklyHours(shift, staffId, null);

        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        ShiftRegistration registration = ShiftRegistration.builder()
                .shift(shift)
                .staff(staff)
                .status(ApprovalStatus.PENDING)
                .build();

        return mapToDTO(shiftRegistrationRepository.save(registration));
    }

    @Transactional(readOnly = true)
    public List<ShiftRegistrationDTO> getRegistrations(UUID storeId, UUID shiftId) {
        getShiftAndVerifyStore(shiftId, storeId);
        
        return shiftRegistrationRepository.findByShiftId(shiftId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ShiftRegistrationDTO approveRegistration(UUID storeId, UUID shiftId, UUID registrationId) {
        getShiftAndVerifyStore(shiftId, storeId);
        
        ShiftRegistration registration = shiftRegistrationRepository.findByIdAndShiftId(registrationId, shiftId)
                .orElseThrow(() -> new BusinessException("Registration not found", HttpStatus.NOT_FOUND));
                
        if (registration.getStatus() != ApprovalStatus.PENDING) {
            throw new BusinessException("Can only approve PENDING registrations", HttpStatus.BAD_REQUEST);
        }

        // Approve
        registration.setStatus(ApprovalStatus.APPROVED);
        shiftRegistrationRepository.save(registration);

        // Create assignment if not exists
        if (!shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, registration.getStaff().getId())) {
            ShiftAssignment assignment = ShiftAssignment.builder()
                    .shift(registration.getShift())
                    .staff(registration.getStaff())
                    .source(AssignmentSource.OPEN_SHIFT) // using OPEN_SHIFT or MANUAL
                    .build();
            shiftAssignmentRepository.save(assignment);
        }

        return mapToDTO(registration);
    }

    @Transactional
    public ShiftRegistrationDTO rejectRegistration(UUID storeId, UUID shiftId, UUID registrationId) {
        getShiftAndVerifyStore(shiftId, storeId);
        
        ShiftRegistration registration = shiftRegistrationRepository.findByIdAndShiftId(registrationId, shiftId)
                .orElseThrow(() -> new BusinessException("Registration not found", HttpStatus.NOT_FOUND));
                
        if (registration.getStatus() != ApprovalStatus.PENDING) {
            throw new BusinessException("Can only reject PENDING registrations", HttpStatus.BAD_REQUEST);
        }

        registration.setStatus(ApprovalStatus.REJECTED);
        return mapToDTO(shiftRegistrationRepository.save(registration));
    }

    private Shift getShiftAndVerifyStore(UUID shiftId, UUID storeId) {
        return shiftRepository.findByIdAndStoreId(shiftId, storeId)
                .orElseThrow(() -> new BusinessException("Shift not found in this store", HttpStatus.NOT_FOUND));
    }

    private ShiftRegistrationDTO mapToDTO(ShiftRegistration entity) {
        return ShiftRegistrationDTO.builder()
                .id(entity.getId())
                .shiftId(entity.getShift().getId())
                .staffId(entity.getStaff().getId())
                .staffName(entity.getStaff().getFullName())
                .status(entity.getStatus())
                .registeredAt(entity.getRegisteredAt())
                .build();
    }
}
