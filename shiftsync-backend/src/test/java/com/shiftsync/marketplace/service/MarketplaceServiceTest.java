package com.shiftsync.marketplace.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.employment.entity.Employment;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.ShiftSkillRequirement;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.service.ShiftValidationService;
import com.shiftsync.skill.entity.Skill;
import com.shiftsync.skill.entity.StaffSkill;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.store.entity.Store;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MarketplaceServiceTest {

    @Mock private ShiftRepository shiftRepository;
    @Mock private ShiftAssignmentRepository shiftAssignmentRepository;
    @Mock private RedissonClient redissonClient;
    @Mock private ShiftValidationService shiftValidationService;
    @Mock private UserRepository userRepository;
    @Mock private EmploymentRepository employmentRepository;
    @Mock private StaffSkillRepository staffSkillRepository;
    @Mock private NotificationService notificationService;
    @Mock private TransactionTemplate transactionTemplate;
    @Mock private RLock rLock;

    @InjectMocks
    private MarketplaceService marketplaceService;

    private UUID storeId;
    private UUID shiftId;
    private UUID staffId;
    private Shift shift;
    private User staff;

    @BeforeEach
    void setUp() {
        storeId = UUID.randomUUID();
        shiftId = UUID.randomUUID();
        staffId = UUID.randomUUID();

        Store store = Store.builder().id(storeId).build();
        shift = Shift.builder()
                .id(shiftId)
                .store(store)
                .shiftDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .status(ShiftStatus.PUBLISHED)
                .isOpen(true)
                .requirements(List.of(
                        ShiftSkillRequirement.builder()
                                .skill(Skill.builder().id(UUID.randomUUID()).build())
                                .requiredCount(1)
                                .build()
                ))
                .build();
                
        staff = User.builder().id(staffId).build();
    }

    @Test
    void testClaimOpenShift_Success() throws InterruptedException {
        lenient().when(redissonClient.getLock(anyString())).thenReturn(rLock);
        lenient().when(rLock.tryLock(anyLong(), anyLong(), eq(TimeUnit.SECONDS))).thenReturn(true);
        lenient().when(rLock.isHeldByCurrentThread()).thenReturn(true);
        
        // Mock transaction template to execute the callback synchronously
        doAnswer(invocation -> {
            java.util.function.Consumer<org.springframework.transaction.TransactionStatus> action = invocation.getArgument(0);
            action.accept(new org.springframework.transaction.support.SimpleTransactionStatus());
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());

        when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
        when(shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, staffId)).thenReturn(false);
        when(shiftAssignmentRepository.countByShiftId(shiftId)).thenReturn(0L);
        when(userRepository.findById(staffId)).thenReturn(Optional.of(staff));

        marketplaceService.claimOpenShift(storeId, shiftId, staffId);

        verify(shiftAssignmentRepository).save(any(ShiftAssignment.class));
        verify(shiftRepository).save(shift);
        org.junit.jupiter.api.Assertions.assertFalse(shift.isOpen(), "Shift should be closed after claiming since requiredCount was 1");
    }

    @Test
    void testClaimOpenShift_AlreadyAssigned() throws InterruptedException {
        lenient().when(redissonClient.getLock(anyString())).thenReturn(rLock);
        lenient().when(rLock.tryLock(anyLong(), anyLong(), eq(TimeUnit.SECONDS))).thenReturn(true);
        lenient().when(rLock.isHeldByCurrentThread()).thenReturn(true);
        
        doAnswer(invocation -> {
            java.util.function.Consumer<org.springframework.transaction.TransactionStatus> action = invocation.getArgument(0);
            action.accept(new org.springframework.transaction.support.SimpleTransactionStatus());
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());

        when(shiftRepository.findByIdAndStoreId(shiftId, storeId)).thenReturn(Optional.of(shift));
        when(shiftAssignmentRepository.existsByShiftIdAndStaffId(shiftId, staffId)).thenReturn(true);

        assertThrows(RuntimeException.class, () -> marketplaceService.claimOpenShift(storeId, shiftId, staffId));
        
        verify(shiftAssignmentRepository, never()).save(any());
    }
}
