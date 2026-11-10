package com.shiftsync.schedulehistory.controller;

import com.shiftsync.schedulehistory.dto.ScheduleHistoryDTOs.HistoryDTO;
import com.shiftsync.schedulehistory.service.ScheduleHistoryService;
import com.shiftsync.shared.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/stores/{storeId}/schedule-history")
@PreAuthorize("isAuthenticated()")
public class ScheduleHistoryController {
    private final ScheduleHistoryService service;
    @GetMapping
    public List<HistoryDTO> history(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return service.history(storeId, user.getId(), startDate, endDate);
    }
}
