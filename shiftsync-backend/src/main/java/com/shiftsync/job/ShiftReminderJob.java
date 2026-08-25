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
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
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
        log.info("Starting ShiftReminderJob...");
        
        List<StoreConfiguration> configs = storeConfigurationRepository.findAll();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        for (StoreConfiguration config : configs) {
            int reminderHours = config.getShiftReminderHours();
            OffsetDateTime targetTime = now.plusHours(reminderHours);
            
            // We want to find shifts starting within the next 15-minute window around targetTime
            // Specifically: shiftDate + startTime is between [targetTime, targetTime + 15 mins]
            LocalDate targetDate = targetTime.toLocalDate();
            LocalTime windowStart = targetTime.toLocalTime();
            LocalTime windowEnd = windowStart.plusMinutes(15);
            
            // Fetch assignments for this store on targetDate where shift.startTime is in [windowStart, windowEnd)
            List<ShiftAssignment> upcomingAssignments = shiftAssignmentRepository.findByShift_Store_IdAndShift_ShiftDateAndShift_StartTimeBetween(
                    config.getStoreId(), targetDate, windowStart, windowEnd);
                    
            if (!upcomingAssignments.isEmpty()) {
                log.info("Found {} assignments starting in ~{} hours for store {}", upcomingAssignments.size(), reminderHours, config.getStoreId());
                
                for (ShiftAssignment sa : upcomingAssignments) {
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
        
        log.info("Finished ShiftReminderJob.");
    }
}
