package com.shiftsync.shift.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.layout.entity.StoreZone;
import com.shiftsync.layout.repository.StoreZoneRepository;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.ShiftZoneSwapRequest;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.enums.AssignmentSource;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class DigitalTwinConcurrencyIntegrationTest {

    @Autowired
    private ShiftAssignmentService shiftAssignmentService;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private ShiftAssignmentRepository shiftAssignmentRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private StoreZoneRepository storeZoneRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmploymentRepository employmentRepository;

    @Autowired
    private ContractTypeRepository contractTypeRepository;

    private Employment createEmployment(User user, Store store, ContractType ct) {
        return employmentRepository.save(Employment.builder()
                .user(user)
                .store(store)
                .contractType(ct)
                .hourlyRate(BigDecimal.valueOf(25.0))
                .status(EmploymentStatus.ACTIVE)
                .joinedDate(LocalDate.now().minusMonths(6))
                .build());
    }

    private ContractType createContractType(Store store, String name) {
        ContractType ct = new ContractType();
        ct.setStore(store);
        ct.setName(name);
        ct.setMaxWeeklyHours(40);
        ct.setOtMultiplier(BigDecimal.valueOf(1.5));
        ct.setDefaultHourlyRate(BigDecimal.valueOf(25.0));
        return contractTypeRepository.save(ct);
    }

    @Test
    public void testConcurrentSwap_DeadlockFreeAndConsistent() throws Exception {
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        Store store = storeRepository.save(Store.builder()
                .name("Store Concurrency " + uuid)
                .openTime(LocalTime.of(6, 0))
                .closeTime(LocalTime.of(22, 0))
                .build());

        ContractType ct = createContractType(store, "FullTime " + uuid);

        StoreZone zoneA = storeZoneRepository.save(StoreZone.builder()
                .name("Zone A " + uuid)
                .store(store)
                .x(1.0).y(1.0).z(0.0).capacity(2)
                .build());

        StoreZone zoneB = storeZoneRepository.save(StoreZone.builder()
                .name("Zone B " + uuid)
                .store(store)
                .x(5.0).y(5.0).z(0.0).capacity(2)
                .build());

        User staffA = userRepository.save(User.builder()
                .fullName("Staff A " + uuid)
                .email("staffA_" + uuid + "@test.com")
                .passwordHash("hash")
                .systemRole(SystemRole.STAFF)
                .build());

        User staffB = userRepository.save(User.builder()
                .fullName("Staff B " + uuid)
                .email("staffB_" + uuid + "@test.com")
                .passwordHash("hash")
                .systemRole(SystemRole.STAFF)
                .build());

        createEmployment(staffA, store, ct);
        createEmployment(staffB, store, ct);

        Shift shift = shiftRepository.save(Shift.builder()
                .store(store)
                .shiftDate(LocalDate.now().plusDays(5))
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(16, 0))
                .availabilityDeadline(ZonedDateTime.now().plusDays(2))
                .status(ShiftStatus.DRAFT)
                .build());

        shiftAssignmentRepository.save(ShiftAssignment.builder()
                .shift(shift)
                .staff(staffA)
                .zone(zoneA)
                .source(AssignmentSource.MANUAL)
                .build());

        shiftAssignmentRepository.save(ShiftAssignment.builder()
                .shift(shift)
                .staff(staffB)
                .zone(zoneB)
                .source(AssignmentSource.MANUAL)
                .build());

        // Concurrently invoke SWAP in opposite order (A <-> B vs B <-> A)
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);

        // Thread 1: Swap A <-> B
        executor.submit(() -> {
            try {
                startLatch.await();
                shiftAssignmentService.swapStaffZones(store.getId(), shift.getId(), ShiftZoneSwapRequest.builder()
                        .staffAId(staffA.getId())
                        .staffBId(staffB.getId())
                        .targetZoneForAId(zoneB.getId())
                        .targetZoneForBId(zoneA.getId())
                        .build());
                successCount.incrementAndGet();
            } catch (Exception ignored) {
            } finally {
                doneLatch.countDown();
            }
        });

        // Thread 2: Swap B <-> A
        executor.submit(() -> {
            try {
                startLatch.await();
                shiftAssignmentService.swapStaffZones(store.getId(), shift.getId(), ShiftZoneSwapRequest.builder()
                        .staffAId(staffB.getId())
                        .staffBId(staffA.getId())
                        .targetZoneForAId(zoneA.getId())
                        .targetZoneForBId(zoneB.getId())
                        .build());
                successCount.incrementAndGet();
            } catch (Exception ignored) {
            } finally {
                doneLatch.countDown();
            }
        });

        startLatch.countDown();
        boolean completedInTime = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completedInTime, "Deadlock detected! Both threads timed out waiting for pessimistic locks.");
        assertEquals(2, successCount.get(), "Both swap operations should complete sequentially without deadlocks.");

        // Verification: Final state in DB must be valid assignments with non-null zones
        ShiftAssignment finalA = shiftAssignmentRepository.findByShiftIdAndStaffId(shift.getId(), staffA.getId()).orElseThrow();
        ShiftAssignment finalB = shiftAssignmentRepository.findByShiftIdAndStaffId(shift.getId(), staffB.getId()).orElseThrow();

        assertNotNull(finalA.getZone(), "Staff A must have a valid zone assigned");
        assertNotNull(finalB.getZone(), "Staff B must have a valid zone assigned");
        assertFalse(finalA.isDeleted(), "Staff A must remain active");
        assertFalse(finalB.isDeleted(), "Staff B must remain active");
    }

    @Test
    public void testConcurrentSwapAndUnassign_NoZombieResurrection() throws Exception {
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        Store store = storeRepository.save(Store.builder()
                .name("Store Unassign " + uuid)
                .openTime(LocalTime.of(6, 0))
                .closeTime(LocalTime.of(22, 0))
                .build());

        ContractType ct = createContractType(store, "PartTime " + uuid);

        StoreZone zoneA = storeZoneRepository.save(StoreZone.builder()
                .name("Zone A " + uuid).store(store).x(1.0).y(1.0).z(0.0).capacity(2).build());
        StoreZone zoneB = storeZoneRepository.save(StoreZone.builder()
                .name("Zone B " + uuid).store(store).x(5.0).y(5.0).z(0.0).capacity(2).build());

        User staffA = userRepository.save(User.builder()
                .fullName("Staff A " + uuid).email("staffA_" + uuid + "@test.com").passwordHash("hash").systemRole(SystemRole.STAFF).build());
        User staffB = userRepository.save(User.builder()
                .fullName("Staff B " + uuid).email("staffB_" + uuid + "@test.com").passwordHash("hash").systemRole(SystemRole.STAFF).build());

        createEmployment(staffA, store, ct);
        createEmployment(staffB, store, ct);

        Shift shift = shiftRepository.save(Shift.builder()
                .store(store)
                .shiftDate(LocalDate.now().plusDays(6))
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0))
                .availabilityDeadline(ZonedDateTime.now().plusDays(2))
                .status(ShiftStatus.DRAFT)
                .build());

        shiftAssignmentRepository.save(ShiftAssignment.builder().shift(shift).staff(staffA).zone(zoneA).source(AssignmentSource.MANUAL).build());
        shiftAssignmentRepository.save(ShiftAssignment.builder().shift(shift).staff(staffB).zone(zoneB).source(AssignmentSource.MANUAL).build());

        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        // Thread 1: Unassign Staff A
        executor.submit(() -> {
            try {
                startLatch.await();
                shiftAssignmentService.unassignStaffFromShift(store.getId(), shift.getId(), staffA.getId());
            } catch (Exception ignored) {
            } finally {
                doneLatch.countDown();
            }
        });

        // Thread 2: Swap Staff A and Staff B
        executor.submit(() -> {
            try {
                startLatch.await();
                shiftAssignmentService.swapStaffZones(store.getId(), shift.getId(), ShiftZoneSwapRequest.builder()
                        .staffAId(staffA.getId())
                        .staffBId(staffB.getId())
                        .targetZoneForAId(zoneB.getId())
                        .targetZoneForBId(zoneA.getId())
                        .build());
            } catch (Exception ignored) {
            } finally {
                doneLatch.countDown();
            }
        });

        startLatch.countDown();
        doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Verify: Staff A MUST NOT be resurrected as active (deleted = false) if unassigned!
        Optional<ShiftAssignment> activeA = shiftAssignmentRepository.findByShiftIdAndStaffId(shift.getId(), staffA.getId());
        assertTrue(activeA.isEmpty(), "Staff A should be unassigned and NOT resurrected as active record!");
    }
}
