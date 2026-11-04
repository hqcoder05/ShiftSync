package com.shiftsync.job;

import com.shiftsync.notification.entity.NotificationType;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import com.shiftsync.store.entity.StoreConfiguration;
import com.shiftsync.store.repository.StoreConfigurationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ShiftReminderJob {

    private final StoreConfigurationRepository storeConfigurationRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final NotificationService notificationService;

    // Run every 15 minutes
    @Scheduled(cron = "0 0/15 * * * ?")
    @Transactional(readOnly = true)
    public void sendShiftReminders() {
        sendShiftRemindersAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
    }

    void sendShiftRemindersAt(LocalDateTime now) {
        log.info("Bắt đầu tác vụ nhắc ca làm...");
        
        List<StoreConfiguration> configs = storeConfigurationRepository.findAll();

        for (StoreConfiguration config : configs) {
            int reminderHours = config.getShiftReminderHours();
            LocalDateTime targetTime = now.plusHours(reminderHours);
            
            // We want to find shifts starting within the next 15-minute window around targetTime
            // Specifically: shiftDate + startTime is between [targetTime, targetTime + 15 mins]
            LocalDateTime windowEnd = targetTime.plusMinutes(15);
            
            // Fetch assignments for this store on targetDate where shift.startTime is in [windowStart, windowEnd)
            List<ShiftAssignment> upcomingAssignments = shiftAssignmentRepository.findPublishedReminders(
                    config.getStoreId(), targetTime.toLocalDate(), targetTime.toLocalTime(), windowEnd.toLocalDate(), windowEnd.toLocalTime());
                    
            if (!upcomingAssignments.isEmpty()) {
                log.info("Tìm thấy {} phân công bắt đầu sau khoảng {} giờ tại cửa hàng {}", upcomingAssignments.size(), reminderHours, config.getStoreId());
                
                for (ShiftAssignment sa : upcomingAssignments) {
                    if (sa.getShift().getStatus() != com.shiftsync.shift.enums.ShiftStatus.PUBLISHED) continue;
                    String title = "Upcoming Shift Reminder";
                    String body = String.format("You have a shift starting in %d hours at %s.", 
                            reminderHours, sa.getShift().getStartTime().toString());
                    
                    notificationService.sendNotification(
                            sa.getStaff().getId(), 
                            NotificationType.SHIFT_REMINDER, 
                            title, 
                            body, 
                            null
                    );
                }
            }
        }
        
        log.info("Đã hoàn tất tác vụ nhắc ca làm.");
    }
}
