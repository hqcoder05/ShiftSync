package com.shiftsync.schedulehistory.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.schedulehistory.dto.ScheduleHistoryDTOs.*;
import com.shiftsync.schedulehistory.entity.ScheduleChange;
import com.shiftsync.schedulehistory.repository.ScheduleChangeRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.*;
import com.shiftsync.shift.entity.Shift;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor
public class ScheduleHistoryService {
    public static final String NO_REASON = "Không ghi lý do";
    private final ScheduleChangeRepository repository;
    private final EmploymentRepository employmentRepository;
    private final UserRepository userRepository;

    public ShiftSnapshot snapshot(Shift shift) {
        if (shift == null) return null;
        List<String> zones = shift.getRequirements() == null ? List.of() : shift.getRequirements().stream()
                .filter(r -> r.getZone() != null).map(r -> r.getZone().getName()).filter(Objects::nonNull).distinct().sorted().toList();
        return new ShiftSnapshot(shift.getShiftDate(), shift.getStartTime(), shift.getEndTime(),
                shift.getStatus() == null ? null : shift.getStatus().name(), zones,
                shift.getRequirements() == null ? List.of() : shift.getRequirements().stream()
                    .filter(r -> r.getZone() != null).map(r -> r.getZone().getId()).filter(Objects::nonNull).distinct().sorted().toList());
    }

    public ShiftSnapshot assignmentZoneSnapshot(Shift shift, com.shiftsync.layout.entity.StoreZone zone) {
        return new ShiftSnapshot(shift.getShiftDate(), shift.getStartTime(), shift.getEndTime(),
                shift.getStatus() == null ? null : shift.getStatus().name(),
                zone == null || zone.getName() == null ? List.of() : List.of(zone.getName()),
                zone == null || zone.getId() == null ? List.of() : List.of(zone.getId()));
    }

    @Transactional
    public void record(UUID storeId, UUID shiftId, ShiftSnapshot before, ShiftSnapshot after, String reason) {
        if (Objects.equals(before, after)) return;
        String text = reason == null || reason.isBlank() ? NO_REASON : reason.trim();
        if (text.length() > 1000) throw new BusinessException("Change reason must not exceed 1000 characters", HttpStatus.BAD_REQUEST);
        UUID actorId = null;
        String actorName = "Hệ thống";
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails details) {
            actorId = details.getId();
            actorName = Objects.toString(details.getUser().getFullName(), "");
        }
        repository.save(ScheduleChange.builder().id(UUID.randomUUID()).storeId(storeId).shiftId(shiftId)
                .actorId(actorId).actorName(actorName).changedAt(OffsetDateTime.now(ZoneOffset.UTC)).reason(text)
                .beforeDate(before == null ? null : before.shiftDate()).afterDate(after == null ? null : after.shiftDate())
                .employeeVisible(visible(before) || visible(after)).before(before).after(after).build());
    }

    @Transactional(readOnly = true)
    public List<HistoryDTO> history(UUID storeId, UUID userId, LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate) || ChronoUnit.DAYS.between(startDate, endDate) > 30)
            throw new BusinessException("Choose a date range of at most 31 days", HttpStatus.BAD_REQUEST);
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));
        if (user.getSystemRole() != SystemRole.ADMIN && !employmentRepository.existsByUserIdAndStoreIdAndStatus(userId, storeId, EmploymentStatus.ACTIVE))
            throw new BusinessException("Active employment in this store is required", HttpStatus.FORBIDDEN);
        boolean manager = user.getSystemRole() == SystemRole.MANAGER || user.getSystemRole() == SystemRole.ADMIN;
        return repository.history(storeId, startDate, endDate, manager).stream().map(c -> new HistoryDTO(c.getId(), c.getStoreId(), c.getShiftId(),
                c.getActorId(), c.getActorName(), c.getChangedAt(), c.getReason(), c.getBefore(), c.getAfter())).toList();
    }
    private boolean visible(ShiftSnapshot snapshot) { return snapshot != null && !"DRAFT".equals(snapshot.status()); }
}
