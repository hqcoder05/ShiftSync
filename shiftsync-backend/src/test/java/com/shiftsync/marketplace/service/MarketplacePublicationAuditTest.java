package com.shiftsync.marketplace.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.availability.repository.*;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.*;
import com.shiftsync.shift.service.*;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.repository.*;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.Test;
import org.redisson.api.*;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Actual publish/list/claim and capacity validator; DB, transaction callback and lock simulated. */
class MarketplacePublicationAuditTest {
    final ShiftRepository shifts=mock(ShiftRepository.class);
    final ShiftAssignmentRepository assignments=mock(ShiftAssignmentRepository.class);
    final EmploymentRepository employment=mock(EmploymentRepository.class);
    final NotificationService notifications=mock(NotificationService.class);
    final Store store=Store.builder().id(UUID.randomUUID()).build();
    final User staff=User.builder().id(UUID.randomUUID()).fullName("Audit staff").systemRole(SystemRole.STAFF).build();
    final Shift shift=Shift.builder().id(UUID.randomUUID()).store(store).shiftDate(LocalDate.of(2030,11,4))
            .startTime(LocalTime.of(9,0)).endTime(LocalTime.of(17,0)).status(ShiftStatus.DRAFT).isOpen(false).build();
    int assignedCount;
    MarketplaceService service() throws Exception {
        when(shifts.findByIdAndStoreId(shift.getId(),store.getId())).thenReturn(Optional.of(shift));
        when(shifts.findByStoreIdAndStatusAndIsOpenTrue(store.getId(),ShiftStatus.PUBLISHED)).thenReturn(List.of(shift));
        when(assignments.countByShiftId(shift.getId())).thenAnswer(call->(long)assignedCount);
        when(employment.findByStoreIdAndStatusAndUserSystemRole(any(),any(),any()))
                .thenReturn(List.of(Employment.builder().user(staff).build()));
        var redis=mock(RedissonClient.class);var lock=mock(RLock.class);
        when(redis.getLock(anyString())).thenReturn(lock);
        when(lock.tryLock(5,10,TimeUnit.SECONDS)).thenReturn(true);
        when(lock.isHeldByCurrentThread()).thenReturn(true);
        var tx=mock(TransactionTemplate.class);
        doAnswer(call->{Consumer<TransactionStatus> callback=call.getArgument(0);
            callback.accept(mock(TransactionStatus.class));return null;}).when(tx).executeWithoutResult(any());
        var time=mock(ShiftValidationService.class);var staffSkills=mock(StaffSkillRepository.class);
        var validator=new ShiftAssignmentValidator(mock(AvailabilityRepository.class),mock(BlackoutDateRepository.class),
                assignments,staffSkills,mock(SkillRepository.class),time);
        return new MarketplaceService(shifts,assignments,redis,time,validator,mock(UserRepository.class),employment,
                staffSkills,notifications,tx);
    }

    @Test void fullyStaffedGenericShiftIsPublishedAndListedButEveryFurtherClaimIsFull() throws Exception {
        assignedCount=1;var service=service();
        service.publishToMarketplace(store.getId(),shift.getId());
        assertTrue(shift.isOpen());assertEquals(ShiftStatus.PUBLISHED,shift.getStatus());
        assertEquals(1,service.getOpenShifts(store.getId()).size());
        var rejected=assertThrows(BusinessException.class,()->service.claimOpenShift(store.getId(),shift.getId(),staff.getId()));
        assertEquals(409,rejected.getStatus().value());
        verify(assignments,never()).save(any());
    }
    @Test void explicitZeroDemandShiftIsPublishedButCapacityValidatorRejectsAllClaims() throws Exception {
        shift.getRequirements().add(ShiftSkillRequirement.builder().skill(Skill.builder().id(UUID.randomUUID()).name("Barista").build())
                .requiredCount(0).build());
        var service=service();service.publishToMarketplace(store.getId(),shift.getId());
        assertTrue(shift.isOpen());assertEquals(1,service.getOpenShifts(store.getId()).size());
        var rejected=assertThrows(BusinessException.class,()->service.claimOpenShift(store.getId(),shift.getId(),staff.getId()));
        assertEquals("Slot full: Shift requirement capacity reached",rejected.getMessage());
        verify(assignments,never()).save(any());
    }
    @Test void pastShiftPublicationNotifiesStaffButTheShiftIsImmediatelyInvisibleAndUnclaimable() throws Exception {
        shift.setShiftDate(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(1));
        var service=service();service.publishToMarketplace(store.getId(),shift.getId());
        assertTrue(shift.isOpen());assertEquals(ShiftStatus.PUBLISHED,shift.getStatus());
        assertTrue(service.getOpenShifts(store.getId()).isEmpty());
        assertThrows(BusinessException.class,()->service.claimOpenShift(store.getId(),shift.getId(),staff.getId()));
        verify(notifications).sendNotification(eq(staff.getId()),eq(com.shiftsync.notification.entity.NotificationType.OPEN_SHIFT_AVAILABLE),
                anyString(),anyString(),isNull());
        verify(assignments,never()).save(any());
    }
}
