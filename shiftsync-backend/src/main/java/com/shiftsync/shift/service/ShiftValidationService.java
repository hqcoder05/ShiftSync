package com.shiftsync.shift.service;

import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.employment.entity.Employment;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShiftValidationService {

    private final ShiftRepository shiftRepository;
    private final EmploymentRepository employmentRepository;
    private final com.shiftsync.store.repository.StoreConfigurationRepository storeConfigurationRepository;
    private final com.shiftsync.payroll.service.CompensationRevisionResolver compensationRevisions;

    public void validateNoOverlapAndWeeklyHours(Shift newShift, UUID staffId, UUID excludedShiftId) {
        List<Employment> employments=employmentRepository.findByUserIdAndStatus(staffId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE);
        if (employments.isEmpty()) throw new BusinessException("Không tìm thấy hợp đồng đang hoạt động", HttpStatus.BAD_REQUEST);
        int configuredLimit=Integer.MAX_VALUE;
        java.util.Set<UUID> storeIds=new java.util.HashSet<>();
        if(newShift.getStore()!=null) storeIds.add(newShift.getStore().getId());
        for(var employment:employments) if(employment.getStore()!=null) storeIds.add(employment.getStore().getId());
        var configs=storeIds.isEmpty() ? java.util.Map.<UUID,com.shiftsync.store.entity.StoreConfiguration>of()
                : storeConfigurationRepository.findByStoreIdIn(storeIds).stream().collect(java.util.stream.Collectors.toMap(
                        com.shiftsync.store.entity.StoreConfiguration::getStoreId,config->config));
        if (newShift.getStore() != null) {
            var config = configs.get(newShift.getStore().getId());
            if (config != null && config.getMaxHourPerWeek() != null && config.getMaxHourPerWeek() > 0) {
                configuredLimit = config.getMaxHourPerWeek();
            }
        }
        int restHours=StaffRestPolicy.hours(employments,newShift.getStore()==null?null:newShift.getStore().getId(),configs);
        java.time.LocalDate startOfWeek = ShiftTimeRange.weekStart(newShift.getShiftDate());
        java.time.LocalDate endOfWeek = ShiftTimeRange.weekStart(ShiftDateRange.lastWorkingDate(newShift)).plusDays(6);
        java.time.LocalDate queryStart=startOfWeek.minusDays(1);
        java.time.LocalDate restStart=ShiftTimeRange.start(newShift).minusHours(restHours).toLocalDate().minusDays(1);
        if(restStart.isBefore(queryStart)) queryStart=restStart;
        java.time.LocalDate restEnd=ShiftTimeRange.end(newShift).plusHours(restHours).toLocalDate();
        if(restEnd.isAfter(endOfWeek)) endOfWeek=restEnd;

        // Include Sunday shifts carrying work into Monday, and all weeks touched
        // by the new shift. Query spans every store employing this staff member.
        List<Shift> activeShifts = shiftRepository.findActiveShiftsForStaffInPeriod(staffId, queryStart, endOfWeek)
                .stream().filter(s -> excludedShiftId == null || !excludedShiftId.equals(s.getId())).toList();

        for (Shift s : activeShifts) {
            if (ShiftTimeRange.overlaps(newShift, s)) {
                String msg = String.format("Ca làm việc bị trùng giờ với ca đã phân công từ %s đến %s.",
                        ShiftTimeRange.start(s), ShiftTimeRange.end(s));
                throw new BusinessException(msg, HttpStatus.CONFLICT);
            }
        }

        if(!ShiftTimeRange.hasRequiredRest(activeShifts,newShift,restHours)) {
            throw new BusinessException("Cần nghỉ ít nhất " + restHours + " giờ giữa hai ca, kể cả ca ở chi nhánh khác.",HttpStatus.BAD_REQUEST);
        }

        final int storeLimit=configuredLimit;
        if (!ShiftTimeRange.fitsWeeklyLimit(activeShifts, newShift,
                day -> Math.min(storeLimit, StaffContractLimit.weeklyHours(employments, day, compensationRevisions)))) {
            throw new BusinessException("Nhận thêm ca này sẽ vượt quá số giờ làm việc tối đa trong tuần theo hợp đồng có hiệu lực", HttpStatus.BAD_REQUEST);
        }
    }
}
