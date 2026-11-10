package com.shiftsync.availability.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.dto.*;
import com.shiftsync.availability.entity.*;
import com.shiftsync.availability.mapper.AvailabilityMapper;
import com.shiftsync.availability.repository.*;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.shared.exception.BusinessException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class AvailabilityWeekService {
    private final AvailabilityWeekRepository weekRepository;
    private final AvailabilityRepository recurringRepository;
    private final UserRepository userRepository;
    private final EmploymentRepository employmentRepository;
    @PersistenceContext private EntityManager entityManager;
    private Clock clock = Clock.system(AvailabilityDeadline.BUSINESS_ZONE);

    @Transactional(readOnly = true)
    public AvailabilityWeekResponse getMine(String email, LocalDate weekStart) {
        return getForStaff(userByEmail(email).getId(), weekStart);
    }

    @Transactional(readOnly = true)
    public AvailabilityWeekResponse getForStaff(UUID staffId, LocalDate weekStart) {
        validateMonday(weekStart);
        return response(staffId, weekStart, weekRepository.findByUserIdAndWeekStart(staffId, weekStart).orElse(null));
    }

    @Transactional(readOnly = true)
    public List<AvailabilityWeekResponse> getForStore(UUID storeId, LocalDate weekStart) {
        validateMonday(weekStart);
        return employmentRepository.findByStoreIdAndStatus(storeId, EmploymentStatus.ACTIVE).stream()
                .map(e -> e.getUser().getId()).distinct()
                .map(id -> getForStaff(id, weekStart)).toList();
    }

    @Transactional
    public AvailabilityWeekResponse saveMine(String email, LocalDate weekStart, AvailabilityWeekRequest request) {
        validateMonday(weekStart);
        User user = userByEmail(email);
        // Serialize even the first save of a week, before a snapshot row exists.
        entityManager.lock(user, LockModeType.PESSIMISTIC_WRITE);
        ZonedDateTime now = ZonedDateTime.now(clock);
        AvailabilityDeadline.requireOpen(weekStart, now);
        validateSlots(request.getSlots());
        AvailabilityWeek week = weekRepository.findByUserIdAndWeekStart(user.getId(), weekStart).orElse(null);
        long currentRevision = week == null ? 0 : week.getRevision();
        if (request.getRevision() == null || request.getRevision() != currentRevision) {
            throw new BusinessException("Lịch rảnh đã được cập nhật trên thiết bị khác. Vui lòng tải lại trước khi lưu.", HttpStatus.CONFLICT);
        }
        if (week == null) {
            week = new AvailabilityWeek();
            week.setUser(user);
            week.setWeekStart(weekStart);
        }
        week.setRevision(currentRevision + 1);
        week.setSubmittedAt(now.toInstant());
        week.getSlots().clear();
        for (AvailabilityRequest slot : request.getSlots()) {
            week.getSlots().add(new AvailabilityWeekSlot(UUID.randomUUID(), slot.getDayOfWeek(), slot.getStartTime(), slot.getEndTime()));
        }
        // Empty snapshots are intentional: falling back to a recurring template would undo a user's deletion.
        return response(user.getId(), weekStart, weekRepository.saveAndFlush(week));
    }

    /** Weekly declarations override a legacy template, including an explicitly empty week. */
    @Transactional(readOnly = true)
    public boolean coversShift(UUID staffId, LocalDate shiftDate, LocalTime start, LocalTime end) {
        LocalDate monday = shiftDate.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        Optional<AvailabilityWeek> week = weekRepository.findByUserIdAndWeekStart(staffId, monday);
        short day = (short) (shiftDate.getDayOfWeek().getValue() % 7);
        if (week.isPresent()) {
            return week.get().getSlots().stream().anyMatch(s -> s.getDayOfWeek() == day && !s.getStartTime().isAfter(start) && !s.getEndTime().isBefore(end));
        }
        return recurringRepository.coversShiftTime(staffId, day, start, end);
    }

    /** Bulk data for a scheduling range; keyed by ISO week so a cross-week range stays correct. */
    @Transactional(readOnly = true)
    public Map<UUID, Map<LocalDate, List<Availability>>> getSchedulingWeeks(List<UUID> staffIds, LocalDate start, LocalDate end) {
        if (staffIds.isEmpty()) return Collections.emptyMap();
        LocalDate first = start.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate last = end.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        Map<UUID, Map<LocalDate, List<Availability>>> result = new HashMap<>();
        for (AvailabilityWeek week : weekRepository.findByUserIdInAndWeekStartBetween(staffIds, first, last)) {
            List<Availability> slots = week.getSlots().stream().map(s -> Availability.builder()
                    .id(s.getId()).user(week.getUser()).dayOfWeek(s.getDayOfWeek()).startTime(s.getStartTime()).endTime(s.getEndTime()).build()).toList();
            result.computeIfAbsent(week.getUser().getId(), ignored -> new HashMap<>()).put(week.getWeekStart(), slots);
        }
        return result;
    }

    private AvailabilityWeekResponse response(UUID staffId, LocalDate weekStart, AvailabilityWeek week) {
        ZonedDateTime now = ZonedDateTime.now(clock);
        boolean editable = AvailabilityDeadline.isEditable(weekStart, now);
        List<AvailabilityResponse> slots;
        String source;
        if (week != null) {
            source = "REGISTERED";
            slots = week.getSlots().stream().map(s -> AvailabilityResponse.builder().id(s.getId()).staffId(staffId)
                    .dayOfWeek(s.getDayOfWeek()).startTime(s.getStartTime()).endTime(s.getEndTime()).build()).toList();
        } else if (!weekStart.isBefore(AvailabilityDeadline.nextWeekStart(now))) {
            source = "TEMPLATE";
            slots = recurringRepository.findByUserId(staffId).stream().map(AvailabilityMapper::toDTO).toList();
        } else {
            source = "UNRECORDED";
            slots = List.of();
        }
        return AvailabilityWeekResponse.builder().staffId(staffId).weekStart(weekStart).source(source)
                .revision(week == null ? 0 : week.getRevision()).submittedAt(week == null ? null : week.getSubmittedAt())
                .deadlineAt(AvailabilityDeadline.deadlineAt(weekStart)).editable(editable).slots(slots).build();
    }

    private User userByEmail(String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));
    }

    private void validateMonday(LocalDate weekStart) {
        if (weekStart == null || weekStart.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new BusinessException("weekStart must be the Monday of the requested week", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateSlots(List<AvailabilityRequest> slots) {
        if (slots == null || slots.size() > 70) throw new BusinessException("Invalid weekly slots", HttpStatus.BAD_REQUEST);
        Map<Short, List<AvailabilityRequest>> days = slots.stream().peek(s -> {
            if (s == null || s.getDayOfWeek() == null || s.getDayOfWeek() < 0 || s.getDayOfWeek() > 6 || s.getStartTime() == null || s.getEndTime() == null || !s.getEndTime().isAfter(s.getStartTime())) {
                throw new BusinessException("End time must be after start time and day must be between 0 and 6", HttpStatus.BAD_REQUEST);
            }
        }).collect(Collectors.groupingBy(AvailabilityRequest::getDayOfWeek));
        for (List<AvailabilityRequest> day : days.values()) {
            day.sort(Comparator.comparing(AvailabilityRequest::getStartTime));
            for (int i = 1; i < day.size(); i++) {
                if (day.get(i).getStartTime().isBefore(day.get(i - 1).getEndTime())) {
                    throw new BusinessException("Time slot overlaps with existing availability on this day", HttpStatus.CONFLICT);
                }
            }
        }
    }
}
