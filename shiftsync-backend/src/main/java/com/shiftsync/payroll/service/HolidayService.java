package com.shiftsync.payroll.service;

import com.shiftsync.payroll.dto.HolidayDTO;
import com.shiftsync.payroll.entity.Holiday;
import com.shiftsync.payroll.repository.HolidayRepository;
import com.shiftsync.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HolidayService {

    private final HolidayRepository holidayRepository;

    @Transactional(readOnly = true)
    public List<HolidayDTO> getAllHolidays() {
        return holidayRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public HolidayDTO createHoliday(HolidayDTO dto) {
        // Optional: Check for duplicate date
        // But the entity has unique=true, so it might throw DataIntegrityViolationException.
        // It's safer to check first.
        holidayRepository.findAll().stream()
            .filter(h -> h.getHolidayDate().equals(dto.getHolidayDate()))
            .findFirst()
            .ifPresent(h -> {
                throw new BusinessException("A holiday already exists for this date", HttpStatus.BAD_REQUEST);
            });

        Holiday holiday = Holiday.builder()
                .holidayDate(dto.getHolidayDate())
                .name(dto.getName())
                .rateMultiplier(dto.getRateMultiplier())
                .build();
        return mapToDTO(holidayRepository.save(holiday));
    }

    @Transactional
    public HolidayDTO updateHoliday(UUID id, HolidayDTO dto) {
        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Holiday not found", HttpStatus.NOT_FOUND));

        // Check if date is changing and if new date already exists
        if (!holiday.getHolidayDate().equals(dto.getHolidayDate())) {
            holidayRepository.findAll().stream()
                .filter(h -> h.getHolidayDate().equals(dto.getHolidayDate()))
                .findFirst()
                .ifPresent(h -> {
                    throw new BusinessException("A holiday already exists for this date", HttpStatus.BAD_REQUEST);
                });
        }

        holiday.setHolidayDate(dto.getHolidayDate());
        holiday.setName(dto.getName());
        holiday.setRateMultiplier(dto.getRateMultiplier());
        return mapToDTO(holidayRepository.save(holiday));
    }

    @Transactional
    public void deleteHoliday(UUID id) {
        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Holiday not found", HttpStatus.NOT_FOUND));
        holidayRepository.delete(holiday);
    }

    private HolidayDTO mapToDTO(Holiday holiday) {
        return HolidayDTO.builder()
                .id(holiday.getId())
                .holidayDate(holiday.getHolidayDate())
                .name(holiday.getName())
                .rateMultiplier(holiday.getRateMultiplier())
                .build();
    }
}
