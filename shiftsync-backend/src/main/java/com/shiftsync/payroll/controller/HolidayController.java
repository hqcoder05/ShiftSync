package com.shiftsync.payroll.controller;

import com.shiftsync.payroll.dto.HolidayDTO;
import com.shiftsync.payroll.service.HolidayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/holidays")
@RequiredArgsConstructor
public class HolidayController {

    private final HolidayService holidayService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<HolidayDTO>> getAllHolidays() {
        return ResponseEntity.ok(holidayService.getAllHolidays());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<HolidayDTO> createHoliday(@Valid @RequestBody HolidayDTO dto) {
        return new ResponseEntity<>(holidayService.createHoliday(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<HolidayDTO> updateHoliday(@PathVariable UUID id, @Valid @RequestBody HolidayDTO dto) {
        return ResponseEntity.ok(holidayService.updateHoliday(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deleteHoliday(@PathVariable UUID id) {
        holidayService.deleteHoliday(id);
        return ResponseEntity.noContent().build();
    }
}