package com.shiftsync.layout.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.layout.entity.*;
import com.shiftsync.layout.repository.*;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.ShiftZoneSwapRequest;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.*;
import com.shiftsync.shift.service.ShiftAssignmentService;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.repository.*;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Passing characterizations of inconsistent spatial assignments. Persistence is mocked. */
class SpatialPlacementAuditTest {
    final Store store=Store.builder().id(UUID.randomUUID()).build();
    final Shift shift=Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(LocalDate.of(2030,11,4)).status(ShiftStatus.PUBLISHED).build();
    final ShiftRepository shifts=mock(ShiftRepository.class);
    final ShiftAssignmentRepository assignments=mock(ShiftAssignmentRepository.class);
    final StoreZoneRepository zones=mock(StoreZoneRepository.class);
    final WorkstationRepository stations=mock(WorkstationRepository.class);
    final StaffSkillRepository staffSkills=mock(StaffSkillRepository.class);
    final SkillRepository skills=mock(SkillRepository.class);
    final StoreZone oldZone=zone("Old",1),newZone=zone("New",2);
    StoreZone zone(String name,int capacity) {
        return StoreZone.builder().id(UUID.randomUUID()).store(store).name(name).capacity(capacity).x(0.0).y(0.0).z(0.0).build();
    }
    Workstation station(StoreZone zone,int capacity,boolean active) {
        return Workstation.builder().id(UUID.randomUUID()).store(store).zone(zone).name("Counter").capacity(capacity).isActive(active).build();
    }
    ShiftAssignment worker() {
        return ShiftAssignment.builder().id(UUID.randomUUID()).shift(shift)
                .staff(User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).build()).build();
    }
    SpatialAllocationService allocator(List<StoreZone> candidates,List<ShiftAssignment> staff) {
        when(shifts.findById(shift.getId())).thenReturn(Optional.of(shift));
        when(zones.findByStoreId(store.getId())).thenReturn(new ArrayList<>(candidates));
        when(assignments.findByShiftId(shift.getId())).thenReturn(staff);
        return new SpatialAllocationService(zones,mock(StoreLayoutRepository.class),stations,shifts,assignments,staffSkills,skills);
    }
    ShiftAssignmentService assignmentService() {
        when(shifts.findByIdAndStoreId(shift.getId(),store.getId())).thenReturn(Optional.of(shift));
        when(zones.findById(oldZone.getId())).thenReturn(Optional.of(oldZone));
        when(zones.findById(newZone.getId())).thenReturn(Optional.of(newZone));
        when(assignments.save(any())).thenAnswer(call->call.getArgument(0));
        return new ShiftAssignmentService(shifts,assignments,mock(EmploymentRepository.class),mock(UserRepository.class),
                mock(com.shiftsync.payroll.repository.PayrollPeriodRepository.class),null,null,staffSkills,zones,skills,null);
    }

    @Test void zoneSwapKeepsBothWorkstationsBoundToTheOriginalZones() {
        var service=assignmentService();var a=worker();var b=worker();
        a.setZone(oldZone);a.setWorkstation(station(oldZone,1,true));
        b.setZone(newZone);b.setWorkstation(station(newZone,1,true));
        when(assignments.findWithLockByShiftIdAndStaffIdIn(eq(shift.getId()),anyList())).thenReturn(List.of(a,b));
        var result=service.swapStaffZones(store.getId(),shift.getId(),ShiftZoneSwapRequest.builder()
                .staffAId(a.getStaff().getId()).staffBId(b.getStaff().getId()).build());
        assertEquals(newZone.getId(),result.getAssignmentA().getZoneId());
        assertEquals(oldZone.getId(),a.getWorkstation().getZone().getId());
        assertEquals(oldZone.getId(),result.getAssignmentB().getZoneId());
        assertEquals(newZone.getId(),b.getWorkstation().getZone().getId());
        verify(assignments).save(a);verify(assignments).save(b);
    }

    @Test void allocatorMovesZoneButRetainsOldWorkstationWhenNoNewStationIsSpecified() {
        oldZone.setCapacity(0);
        var a=worker();a.setZone(oldZone);a.setWorkstation(station(oldZone,1,true));
        var result=allocator(List.of(oldZone,newZone),List.of(a)).allocateZonesForShift(store.getId(),shift.getId());
        assertEquals(1,result.getAllocatedStaffCount());
        assertEquals(newZone.getId(),a.getZone().getId());
        assertEquals(oldZone.getId(),a.getWorkstation().getZone().getId());
        verify(assignments).saveAll(List.of(a));
    }

    @Test void allocatorExceedsExplicitWorkstationCapacityWhileZoneHasRoom() {
        var ws=station(newZone,1,true);var a=worker();var b=worker();
        targetWorkstation(ws,a,b);
        var result=allocator(List.of(newZone),List.of(a,b)).allocateZonesForShift(store.getId(),shift.getId());
        assertEquals(2,result.getAllocatedStaffCount());
        assertSame(ws,a.getWorkstation());assertSame(ws,b.getWorkstation());
        assertEquals(1,ws.getCapacity());
    }

    @Test void allocatorAssignsAnExplicitlyInactiveWorkstation() {
        var ws=station(newZone,1,false);var a=worker();targetWorkstation(ws,a);
        var result=allocator(List.of(newZone),List.of(a)).allocateZonesForShift(store.getId(),shift.getId());
        assertEquals(1,result.getAllocatedStaffCount());
        assertSame(ws,a.getWorkstation());assertFalse(ws.getIsActive());
    }

    void targetWorkstation(Workstation ws,ShiftAssignment... workers) {
        var skill=Skill.builder().id(UUID.randomUUID()).name("Role").build();
        shift.getRequirements().add(ShiftSkillRequirement.builder().id(UUID.randomUUID()).skill(skill)
                .zone(ws.getZone()).workstation(ws).requiredCount(workers.length).build());
        for(var assignment:workers)assignment.setRequiredSkillId(skill.getId());
    }
}
