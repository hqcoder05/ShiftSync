package com.shiftsync.shared.security;

import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class StoreAccessService {

    private final EmploymentRepository employmentRepository;

    public StoreAccessService(EmploymentRepository employmentRepository) {
        this.employmentRepository = employmentRepository;
    }

    public boolean canAccessStore(Authentication auth, UUID storeId) {
        if (auth == null || auth.getPrincipal() == null) {
            return false;
        }

        CustomUserDetails details = (CustomUserDetails) auth.getPrincipal();
        
        // ADMIN can access all stores
        if (details.getUser().getSystemRole() == SystemRole.ADMIN) {
            return true;
        }
        
        // Otherwise, verify the user is actively employed at the store
        return employmentRepository.isStaffInStore(details.getId(), storeId, EmploymentStatus.ACTIVE);
    }
}
