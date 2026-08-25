package com.shiftsync.test;

import com.shiftsync.payroll.service.PayrollCalculationService;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth/test-payroll")
public class TestController {
    
    @Autowired
    private com.shiftsync.shift.service.ShiftAssignmentService assignService;
    
    @Autowired
    private com.shiftsync.shift.service.AutoScheduleService autoService;
    @Autowired
    private com.shiftsync.shift.service.ShiftService shiftService;
    @Autowired
    private com.shiftsync.marketplace.service.MarketplaceService marketplaceService;
    @Autowired
    private com.shiftsync.shift.service.ShiftSwapService swapService;
    @Autowired
    private com.shiftsync.leave.service.LeaveRequestService leaveService;
    @Autowired
    private com.shiftsync.attendance.service.AttendanceAdjustmentService attendanceService;
    @Autowired
    private PayrollCalculationService payrollService;
    @Autowired
    private com.shiftsync.job.ShiftReminderJob reminderJob;
    @Autowired
    private com.shiftsync.notification.service.NotificationPreferenceService prefService;

    @PostMapping("/assign")
    public String assignStaff(@RequestParam UUID storeId, @RequestParam UUID shiftId, @RequestParam UUID staffId) {
        assignService.assignStaffToShift(storeId, shiftId, staffId);
        return "OK";
    }
    
    @PostMapping("/auto")
    public String autoSchedule(@RequestParam UUID storeId, @RequestParam String date) {
        com.shiftsync.shift.dto.AutoScheduleRequest req = new com.shiftsync.shift.dto.AutoScheduleRequest();
        req.setStartDate(LocalDate.parse(date));
        req.setEndDate(LocalDate.parse(date));
        autoService.autoSchedule(storeId, req);
        return "OK";
    }

    @PostMapping("/publish")
    public String publishShifts(@RequestParam UUID storeId, @RequestParam String date) {
        shiftService.publishShifts(storeId, LocalDate.parse(date), LocalDate.parse(date));
        return "OK";
    }

    @PostMapping("/open")
    public String openShift(@RequestParam UUID storeId, @RequestParam UUID shiftId) {
        marketplaceService.publishToMarketplace(storeId, shiftId);
        return "OK";
    }

    @PostMapping("/swap-approve")
    public String approveSwap(@RequestParam UUID requestId, @RequestParam UUID managerId) {
        swapService.managerApproveSwapRequest(requestId, managerId);
        return "OK";
    }

    @PostMapping("/swap-reject")
    public String rejectSwap(@RequestParam UUID requestId, @RequestParam UUID toStaffId) {
        swapService.respondToSwapRequest(requestId, toStaffId, false);
        return "OK";
    }

    @PostMapping("/leave-approve")
    public String approveLeave(@RequestParam UUID storeId, @RequestParam UUID leaveId, @RequestParam UUID managerId) {
        leaveService.approveLeaveRequest(storeId, leaveId, managerId);
        return "OK";
    }

    @PostMapping("/attendance-approve")
    public String approveAttendance(@RequestParam UUID storeId, @RequestParam UUID requestId, @RequestParam UUID managerId) {
        attendanceService.approveRequest(storeId, requestId, managerId);
        return "OK";
    }

    @PostMapping("/payroll")
    public String generatePayroll(@RequestParam UUID storeId, @RequestParam String startDate, @RequestParam String endDate) {
        payrollService.generatePayroll(storeId, LocalDate.parse(startDate), LocalDate.parse(endDate));
        return "OK";
    }

    @PostMapping("/reminder")
    public String triggerReminder() {
        reminderJob.sendShiftReminders();
        return "OK";
    }

    @PostMapping("/set-pref")
    public String setPref(@RequestParam UUID staffId, @RequestParam String type, @RequestParam boolean enabled) {
        com.shiftsync.notification.dto.UpdatePreferenceRequest req = new com.shiftsync.notification.dto.UpdatePreferenceRequest();
        req.setNotificationType(com.shiftsync.notification.entity.NotificationType.valueOf(type));
        req.setEnabled(enabled);
        prefService.updatePreference(staffId, req);
        return "OK";
    }
}
