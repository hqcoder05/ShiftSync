package com.shiftsync;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.employment.entity.ContractType;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.ContractTypeRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.availability.entity.Availability;
import com.shiftsync.availability.repository.AvailabilityRepository;
import com.shiftsync.workforce.dto.WorkforceRequestCreateDTO;
import com.shiftsync.workforce.dto.WorkforceProposalCreateDTO;
import com.shiftsync.workforce.enums.WorkforceRequestStatus;
import com.shiftsync.workforce.service.WorkforceRequestService;
import com.shiftsync.workforce.repository.WorkforceRequestRepository;
import com.shiftsync.workforce.repository.WorkforceProposalRepository;
import com.shiftsync.workforce.entity.WorkforceRequest;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
public class PostFixVerificationTest {

    @Autowired private StoreRepository storeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ContractTypeRepository contractTypeRepository;
    @Autowired private EmploymentRepository employmentRepository;
    @Autowired private ShiftRepository shiftRepository;
    @Autowired private AvailabilityRepository availabilityRepository;
    @Autowired private WorkforceRequestService workforceRequestService;
    @Autowired private WorkforceRequestRepository workforceRequestRepository;
    @Autowired private WorkforceProposalRepository workforceProposalRepository;
    @Autowired private ShiftAssignmentRepository shiftAssignmentRepository;

    @Test
    public void testWORKFORCE001_Concurrency() throws InterruptedException {
        Store reqStore = storeRepository.save(Store.builder().name("ReqStoreSync").build());
        Store targetStore = storeRepository.save(Store.builder().name("TargetStoreSync").build());

        User creator = userRepository.save(User.builder()
                .fullName("Creator")
                .email("sync_" + UUID.randomUUID().toString() + "@test.com").passwordHash("hash").systemRole(SystemRole.MANAGER).build());

        User staff1 = userRepository.save(User.builder()
                .fullName("Staff1")
                .email("sync1_" + UUID.randomUUID().toString() + "@test.com").passwordHash("hash").systemRole(SystemRole.STAFF).build());
        User staff2 = userRepository.save(User.builder()
                .fullName("Staff2")
                .email("sync2_" + UUID.randomUUID().toString() + "@test.com").passwordHash("hash").systemRole(SystemRole.STAFF).build());
        User staff3 = userRepository.save(User.builder()
                .fullName("Staff3")
                .email("sync3_" + UUID.randomUUID().toString() + "@test.com").passwordHash("hash").systemRole(SystemRole.STAFF).build());

        ContractType ct = contractTypeRepository.save(ContractType.builder()
                .name("Standard")
                .store(targetStore)
                .maxWeeklyHours(40)
                .otMultiplier(BigDecimal.valueOf(1.5))
                .defaultHourlyRate(BigDecimal.valueOf(100))
                .build());

        employmentRepository.save(Employment.builder().store(targetStore).user(staff1).status(EmploymentStatus.ACTIVE).hourlyRate(BigDecimal.valueOf(100)).joinedDate(LocalDate.now().minusDays(10)).contractType(ct).build());
        employmentRepository.save(Employment.builder().store(targetStore).user(staff2).status(EmploymentStatus.ACTIVE).hourlyRate(BigDecimal.valueOf(100)).joinedDate(LocalDate.now().minusDays(10)).contractType(ct).build());
        employmentRepository.save(Employment.builder().store(targetStore).user(staff3).status(EmploymentStatus.ACTIVE).hourlyRate(BigDecimal.valueOf(100)).joinedDate(LocalDate.now().minusDays(10)).contractType(ct).build());

        Shift shift = shiftRepository.save(Shift.builder()
                .store(reqStore)
                .shiftDate(LocalDate.now().plusDays(2))
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(12, 0))
                .availabilityDeadline(java.time.ZonedDateTime.now().plusDays(1))
                .status(ShiftStatus.PUBLISHED)
                .build());

        WorkforceRequestCreateDTO reqDto = new WorkforceRequestCreateDTO();
        reqDto.setTargetStoreId(targetStore.getId());
        reqDto.setShiftId(shift.getId());
        reqDto.setNeededCount(2); // We need 2 staff

        var createdReq = workforceRequestService.createRequest(reqStore.getId(), reqDto, creator.getId());
        UUID reqId = createdReq.getId();

        short dow = (short) (shift.getShiftDate().getDayOfWeek().getValue() % 7);
        availabilityRepository.save(Availability.builder().user(staff1).dayOfWeek(dow).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build());
        availabilityRepository.save(Availability.builder().user(staff2).dayOfWeek(dow).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build());
        availabilityRepository.save(Availability.builder().user(staff3).dayOfWeek(dow).startTime(LocalTime.of(0, 0)).endTime(LocalTime.of(23, 59)).build());

        WorkforceProposalCreateDTO prop1 = new WorkforceProposalCreateDTO(); prop1.setStaffId(staff1.getId());
        var p1 = workforceRequestService.proposeStaff(targetStore.getId(), reqId, prop1, creator.getId());

        WorkforceProposalCreateDTO prop2 = new WorkforceProposalCreateDTO(); prop2.setStaffId(staff2.getId());
        var p2 = workforceRequestService.proposeStaff(targetStore.getId(), reqId, prop2, creator.getId());
        
        WorkforceProposalCreateDTO prop3 = new WorkforceProposalCreateDTO(); prop3.setStaffId(staff3.getId());
        var p3 = workforceRequestService.proposeStaff(targetStore.getId(), reqId, prop3, creator.getId());

        ExecutorService executor = Executors.newFixedThreadPool(3);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(3);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        Runnable r1 = () -> {
            try { latch.await(); workforceRequestService.respondToProposal(p1.getId(), true, staff1.getId()); successCount.incrementAndGet(); } 
            catch (Exception e) { failCount.incrementAndGet(); } finally { done.countDown(); }
        };
        Runnable r2 = () -> {
            try { latch.await(); workforceRequestService.respondToProposal(p2.getId(), true, staff2.getId()); successCount.incrementAndGet(); } 
            catch (Exception e) { failCount.incrementAndGet(); } finally { done.countDown(); }
        };
        Runnable r3 = () -> {
            try { latch.await(); workforceRequestService.respondToProposal(p3.getId(), true, staff3.getId()); successCount.incrementAndGet(); } 
            catch (Exception e) { failCount.incrementAndGet(); } finally { done.countDown(); }
        };

        executor.submit(r1); executor.submit(r2); executor.submit(r3);
        latch.countDown();
        done.await();

        WorkforceRequest finalReq = workforceRequestRepository.findById(reqId).orElseThrow();
        long acceptedCount = workforceProposalRepository.countByWorkforceRequestIdAndStatus(reqId, com.shiftsync.workforce.enums.WorkforceProposalStatus.ACCEPTED);
        
        System.out.println("Concurrent acceptances: " + successCount.get() + " success, " + failCount.get() + " fail.");
        System.out.println("Final accepted count: " + acceptedCount);
        System.out.println("Final status: " + finalReq.getStatus());
        
        assertThat(acceptedCount).isLessThanOrEqualTo(2);
        assertThat(finalReq.getStatus()).isEqualTo(WorkforceRequestStatus.COMPLETED);
        assertThat(successCount.get()).isEqualTo(2);
        assertThat(failCount.get()).isEqualTo(1);
    }
}
