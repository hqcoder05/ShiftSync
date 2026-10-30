package com.shiftsync.shift.service;

import com.shiftsync.shift.dto.*;
import com.shiftsync.shift.entity.*;
import java.util.*;

/** Materialize the result while the transaction is still open, before dry-run rollback. */
final class AutoSchedulePlanMapper {
    private AutoSchedulePlanMapper() {}
    static ShiftDTO snapshot(UUID storeId,Shift shift,List<ShiftAssignment> assignments,List<RequirementCoverageDTO> coverage) {
        var active=assignments.stream().filter(assignment->!assignment.isDeleted())
                .sorted(Comparator.comparing((ShiftAssignment assignment)->assignment.getStaff().getId())
                        .thenComparing(ShiftAssignment::getRequiredSkillId,Comparator.nullsFirst(Comparator.naturalOrder())))
                .map(assignment->ShiftAssignmentResponseDTO.builder()
                        .id(assignment.getId()).shiftId(shift.getId()).staffId(assignment.getStaff().getId())
                        .staffName(assignment.getStaff().getFullName()).requiredSkillId(assignment.getRequiredSkillId())
                        .skillName(coverage.stream().filter(row->row.getSkillId()!=null&&row.getSkillId().equals(assignment.getRequiredSkillId()))
                                .map(RequirementCoverageDTO::getSkillName).filter(Objects::nonNull).findFirst().orElse(null))
                        .zoneId(assignment.getZone()==null?null:assignment.getZone().getId())
                        .zoneName(assignment.getZone()==null?null:assignment.getZone().getName())
                        .workstationId(assignment.getWorkstation()==null?null:assignment.getWorkstation().getId())
                        .workstationName(assignment.getWorkstation()==null?null:assignment.getWorkstation().getName())
                        .source(assignment.getSource()).assignedAt(assignment.getAssignedAt()).build()).toList();
        var requirements=coverage.stream().map(row->ShiftSkillRequirementDTO.builder().id(row.getRequirementId())
                .skillId(row.getSkillId()).skillName(row.getSkillName()).zoneId(row.getZoneId()).zoneName(row.getZoneName())
                .requiredStaff(row.getRequiredCount()).assignedCount(row.getAssignedCount()).shortageCount(row.getShortageCount()).build()).toList();
        return ShiftDTO.builder().id(shift.getId()).storeId(storeId).shiftDate(shift.getShiftDate())
                .startTime(shift.getStartTime()).endTime(shift.getEndTime()).status(shift.getStatus())
                .availabilityDeadline(shift.getAvailabilityDeadline()).note(shift.getNote()).color(shift.getColor())
                .isOpen(shift.isOpen()).shiftAssignments(active).skillRequirements(requirements)
                .requiredStaff(coverage.stream().mapToInt(RequirementCoverageDTO::getRequiredCount).sum())
                .assignedStaffCount(active.size()).shortageStaff(coverage.stream().mapToInt(RequirementCoverageDTO::getShortageCount).sum()).build();
    }
}
