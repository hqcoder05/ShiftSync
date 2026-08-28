package com.shiftsync.employment.mapper;

import com.shiftsync.employment.dto.EmploymentDTO;
import com.shiftsync.employment.entity.Employment;

public class EmploymentMapper {

    public static EmploymentDTO toDTO(Employment employment) {
        if (employment == null) {
            return null;
        }

        return EmploymentDTO.builder()
                .id(employment.getId())
                .staffId(employment.getUser() != null ? employment.getUser().getId() : null)
                .staffFullName(employment.getUser() != null ? employment.getUser().getFullName() : null)
                .staffEmail(employment.getUser() != null ? employment.getUser().getEmail() : null)
                .storeId(employment.getStore() != null ? employment.getStore().getId() : null)
                .storeName(employment.getStore() != null ? employment.getStore().getName() : null)
                .storeAddress(employment.getStore() != null ? employment.getStore().getAddress() : null)
                .employmentType(employment.getEmploymentType())
                .hourlyRate(employment.getHourlyRate())
                .status(employment.getStatus())
                .joinedDate(employment.getJoinedDate())
                .leftDate(employment.getLeftDate())
                .build();
    }
}
