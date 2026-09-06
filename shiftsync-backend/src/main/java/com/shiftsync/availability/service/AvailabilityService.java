package com.shiftsync.availability.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.dto.AvailabilityRequest;
import com.shiftsync.availability.dto.AvailabilityResponse;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.mapper.AvailabilityMapper;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AvailabilityService {

    private final AvailabilityRepository availabilityRepository;
    private final UserRepository userRepository;

    public AvailabilityService(AvailabilityRepository availabilityRepository, UserRepository userRepository) {
        this.availabilityRepository = availabilityRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<AvailabilityResponse> getMyAvailability(String email) {
        User user = getUserByEmail(email);
        return availabilityRepository.findByUserId(user.getId())
                .stream()
                .map(AvailabilityMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AvailabilityResponse> getStaffAvailability(UUID userId) {
        return availabilityRepository.findByUserId(userId)
                .stream()
                .map(AvailabilityMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public AvailabilityResponse createAvailability(String email, AvailabilityRequest request) {
        validateTimeRange(request);
        User user = getUserByEmail(email);
        
        if (availabilityRepository.hasOverlappingSlot(user.getId(), request.getDayOfWeek(), request.getStartTime(), request.getEndTime(), null)) {
            throw new BusinessException("Time slot overlaps with existing availability on this day", HttpStatus.CONFLICT);
        }

        Availability availability = Availability.builder()
                .user(user)
                .dayOfWeek(request.getDayOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .build();

        return AvailabilityMapper.toDTO(availabilityRepository.save(availability));
    }

    @Transactional
    public AvailabilityResponse updateAvailability(UUID id, String email, AvailabilityRequest request) {
        validateTimeRange(request);
        User user = getUserByEmail(email);
        
        Availability availability = availabilityRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Availability slot not found", HttpStatus.NOT_FOUND));

        if (!availability.getUser().getId().equals(user.getId())) {
            throw new BusinessException("You don't have permission to modify this record", HttpStatus.FORBIDDEN);
        }

        if (availabilityRepository.hasOverlappingSlot(user.getId(), request.getDayOfWeek(), request.getStartTime(), request.getEndTime(), id)) {
            throw new BusinessException("Time slot overlaps with existing availability on this day", HttpStatus.CONFLICT);
        }

        availability.setDayOfWeek(request.getDayOfWeek());
        availability.setStartTime(request.getStartTime());
        availability.setEndTime(request.getEndTime());

        return AvailabilityMapper.toDTO(availabilityRepository.save(availability));
    }

    @Transactional
    public void deleteAvailability(UUID id, String email) {
        User user = getUserByEmail(email);
        
        Availability availability = availabilityRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Availability slot not found", HttpStatus.NOT_FOUND));

        if (!availability.getUser().getId().equals(user.getId())) {
            throw new BusinessException("You don't have permission to delete this record", HttpStatus.FORBIDDEN);
        }

        availabilityRepository.delete(availability);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));
    }

    private void validateTimeRange(AvailabilityRequest request) {
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new BusinessException("End time must be strictly after start time", HttpStatus.BAD_REQUEST);
        }
    }
}
