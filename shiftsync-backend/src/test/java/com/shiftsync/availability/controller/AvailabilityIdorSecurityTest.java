package com.shiftsync.availability.controller;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.availability.dto.AvailabilityResponse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class AvailabilityIdorSecurityTest {

    @Autowired
    private AvailabilityController availabilityController;
    
    @Autowired
    private UserRepository userRepository;

    @Test
    public void managerCanViewStaffAvailabilityFromAnotherStore_IDOR() {
        // Setup Users
        User managerA = new User();
        managerA.setEmail("managera_sec_" + UUID.randomUUID() + "@test.com");
        managerA.setSystemRole(SystemRole.MANAGER);
        managerA.setFullName("Manager A");
        managerA.setPasswordHash("hash");
        managerA = userRepository.save(managerA);

        User staffB = new User();
        staffB.setEmail("staffb_sec_" + UUID.randomUUID() + "@test.com");
        staffB.setSystemRole(SystemRole.STAFF);
        staffB.setFullName("Staff B");
        staffB.setPasswordHash("hash");
        staffB = userRepository.save(staffB);
        
        // Mock Security Context
        CustomUserDetails managerDetails = new CustomUserDetails(managerA);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(managerDetails, null, managerDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
        
        // Fixed: Manager A fetching Staff B's availability should throw exception
        final UUID targetStaffId = staffB.getId();
        assertThrows(org.springframework.security.authorization.AuthorizationDeniedException.class, () -> {
            availabilityController.getStaffAvailability(targetStaffId);
        });
    }
}
