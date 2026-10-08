package com.shiftsync.audit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import com.shiftsync.attendance.repository.AttendanceRepository;
import com.shiftsync.attendance.entity.Attendance;
import com.shiftsync.attendance.enums.AttendanceStatus;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.shift.repository.ShiftRepository;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.entity.Shift;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@org.springframework.transaction.annotation.Transactional
public class AttendancePhotoMemoryVerificationTest {
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private ShiftAssignmentRepository shiftAssignmentRepository;
    @Autowired private ShiftRepository shiftRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private com.shiftsync.auth.repository.UserRepository userRepository;

    @Test
    public void testPhotoLoadingMemoryImpact() throws Exception {
        Store st = new Store();
        st.setName("Test Store");
        storeRepository.save(st);

        com.shiftsync.auth.entity.User staff = new com.shiftsync.auth.entity.User();
        staff.setFullName("Test Staff");
        staff.setEmail("teststaff-" + java.util.UUID.randomUUID().toString() + "@x.com");
        staff.setPasswordHash("pass");
        staff.setSystemRole(com.shiftsync.shared.security.SystemRole.STAFF);
        userRepository.save(staff);

        byte[] dummyPhoto = new byte[1024 * 1024]; 
        
        for (int i = 0; i < 5; i++) {
            Shift shift = new Shift();
            shift.setStore(st);
            shift.setShiftDate(LocalDate.now());
            shift.setStartTime(LocalTime.of(8 + i,0));
            shift.setEndTime(LocalTime.of(9 + i,0));
            shift.setAvailabilityDeadline(java.time.ZonedDateTime.now());
            shiftRepository.save(shift);

            ShiftAssignment assignment = new ShiftAssignment();
            assignment.setShift(shift);
            assignment.setStaff(staff);
            shiftAssignmentRepository.save(assignment);

            Attendance a = new Attendance();
            a.setShiftAssignment(assignment);
            a.setCheckInTime(java.time.OffsetDateTime.now());
            a.setStatus(AttendanceStatus.PRESENT);
            a.setCheckInPhoto(dummyPhoto);
            attendanceRepository.save(a);
        }
        
        long startMem = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        long start = System.currentTimeMillis();
        
        List<Attendance> attendances = attendanceRepository.findAll();
        
        long endMem = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        long end = System.currentTimeMillis();
        
        long usedBytes = endMem - startMem;
        
        System.out.println("Query Time: " + (end - start) + "ms");
        System.out.println("Records loaded: " + attendances.size());
        System.out.println("Memory Diff: " + (usedBytes / 1024 / 1024) + "MB");
        
        assertTrue(attendances.size() >= 5);
        for (Attendance a : attendances) {
            if (a.getCheckInPhoto() != null) {
                assertTrue(a.getCheckInPhoto().length > 0);
            }
        }
    }
}
