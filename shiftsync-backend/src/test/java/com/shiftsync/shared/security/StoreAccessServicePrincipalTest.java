package com.shiftsync.shared.security;

import com.shiftsync.employment.repository.EmploymentRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.*;

class StoreAccessServicePrincipalTest {
    @Test void anonymousOrUnexpectedPrincipalCannotAccessStoreOrEmployee() {
        var employments = mock(EmploymentRepository.class);
        var access = new StoreAccessService(employments);
        var anonymous = new UsernamePasswordAuthenticationToken("anonymousUser", "");
        UUID id = UUID.randomUUID();
        assertFalse(access.canAccessStore(anonymous, id));
        assertFalse(access.canManagerAccessUser(anonymous, id));
        assertFalse(access.canAccessStore(null, id));
        assertFalse(access.canManagerAccessUser(null, id));
        var user = com.shiftsync.auth.entity.User.builder().id(id).systemRole(SystemRole.ADMIN).build();
        var unauthenticated = new UsernamePasswordAuthenticationToken(new CustomUserDetails(user), "");
        assertFalse(access.canAccessStore(unauthenticated, id));
        assertFalse(access.canManagerAccessUser(unauthenticated, id));
        verifyNoInteractions(employments);
    }
}
