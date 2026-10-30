package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.shift.dto.RequirementCoverageDTO;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.layout.entity.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class AutoSchedulePlanMapperTest {
    @Test void snapshotContainsActualPeoplePlacementsAndPreservedSources(){
        UUID store=UUID.randomUUID(),skill=UUID.randomUUID();
        Shift shift=Shift.builder().id(UUID.randomUUID()).shiftDate(LocalDate.of(2030,11,3)).startTime(LocalTime.of(22,0)).endTime(LocalTime.of(6,0)).build();
        StoreZone zone=StoreZone.builder().id(UUID.randomUUID()).name("Quầy").build();
        Workstation station=Workstation.builder().id(UUID.randomUUID()).name("Máy 1").build();
        User manual=User.builder().id(new UUID(0,1)).fullName("Manual person").build(),automatic=User.builder().id(new UUID(0,2)).fullName("Auto person").build();
        var first=ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(manual).requiredSkillId(skill).source(AssignmentSource.MANUAL).build();
        var second=ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift).staff(automatic).requiredSkillId(skill).zone(zone).workstation(station).source(AssignmentSource.AUTO).build();
        var deleted=ShiftAssignment.builder().shift(shift).staff(manual).deleted(true).build();
        var coverage=RequirementCoverageDTO.builder().skillId(skill).skillName("Barista").requiredCount(3).assignedCount(2).shortageCount(1).build();
        var result=AutoSchedulePlanMapper.snapshot(store,shift,List.of(second,deleted,first),List.of(coverage));
        assertEquals(store,result.getStoreId());assertEquals(shift.getId(),result.getId());assertEquals(LocalTime.of(6,0),result.getEndTime());
        assertEquals(3,result.getRequiredStaff());assertEquals(2,result.getAssignedStaffCount());assertEquals(1,result.getShortageStaff());
        assertEquals(List.of(manual.getId(),automatic.getId()),result.getShiftAssignments().stream().map(a->a.getStaffId()).toList());
        assertEquals(AssignmentSource.MANUAL,result.getShiftAssignments().get(0).getSource());
        assertEquals(AssignmentSource.AUTO,result.getShiftAssignments().get(1).getSource());
        assertEquals(zone.getId(),result.getShiftAssignments().get(1).getZoneId());assertEquals(station.getName(),result.getShiftAssignments().get(1).getWorkstationName());
        assertEquals("Barista",result.getShiftAssignments().get(1).getSkillName());
        second.setStaff(manual);assertEquals(automatic.getId(),result.getShiftAssignments().get(1).getStaffId(),"Snapshot must not retain mutable entity references");
    }
    @Test void uncoveredGeneratedShiftHasAnExplicitEmptyAssignmentList(){
        Shift generated=Shift.builder().id(UUID.randomUUID()).shiftDate(LocalDate.of(2030,11,3)).startTime(LocalTime.of(9,0)).endTime(LocalTime.of(17,0)).build();
        var result=AutoSchedulePlanMapper.snapshot(UUID.randomUUID(),generated,List.of(),List.of(RequirementCoverageDTO.builder().requiredCount(1).shortageCount(1).build()));
        assertTrue(result.getShiftAssignments().isEmpty());assertEquals(1,result.getShortageStaff());assertEquals(0,result.getAssignedStaffCount());
    }
}
