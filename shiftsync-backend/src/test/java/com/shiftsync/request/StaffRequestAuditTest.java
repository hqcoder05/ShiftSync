package com.shiftsync.request;

import com.shiftsync.auth.entity.User;
import com.shiftsync.request.controller.StaffRequestController;
import com.shiftsync.request.entity.StaffRequest;
import com.shiftsync.request.repository.StaffRequestRepository;
import com.shiftsync.request.service.StaffRequestService;
import com.shiftsync.shared.security.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Characterizes broken ownership checks; passing demonstrates current defects. */
class StaffRequestAuditTest {
    @Test void differentStaffWithSameNameCanReadPrivateRequest() {
        var repository=mock(StaffRequestRepository.class);
        var service=new StaffRequestService(repository);
        var controller=new StaffRequestController(service);
        var victimRequest=StaffRequest.builder().id(UUID.randomUUID()).requesterName("Nguyen Van An")
                .content("Private medical request").requestType("support").build();
        when(repository.findById(victimRequest.getId())).thenReturn(Optional.of(victimRequest));
        var unrelatedUser=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).fullName("Nguyen Van An").build();
        var response=controller.getRequestById(new CustomUserDetails(unrelatedUser),victimRequest.getId());
        assertEquals("Private medical request",response.getBody().getContent());
    }

    @Test void renamingProfileMakesPreviouslyOwnedRequestInaccessible() {
        var repository=mock(StaffRequestRepository.class);
        var controller=new StaffRequestController(new StaffRequestService(repository));
        var oldRequest=StaffRequest.builder().id(UUID.randomUUID()).requesterName("Old Name").build();
        when(repository.findById(oldRequest.getId())).thenReturn(Optional.of(oldRequest));
        var owner=User.builder().id(UUID.randomUUID()).systemRole(SystemRole.STAFF).fullName("New Name").build();
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                ()->controller.getRequestById(new CustomUserDetails(owner),oldRequest.getId()));
    }
}
