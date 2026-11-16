package com.shiftsync.auth.bootstrap;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.security.SystemRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InitialAdminBootstrapTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @Test
    void createsExactlyOneAdminWhenNoAdminExistsAndRuntimeConfigurationIsValid() {
        when(userRepository.countBySystemRole(SystemRole.ADMIN)).thenReturn(0L);
        when(userRepository.findByEmail("admin@example.test")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password123!")).thenReturn("bcrypt-hash");

        new InitialAdminBootstrap(userRepository, passwordEncoder, "admin@example.test", "Password123!", "QA Admin", false)
                .run(new DefaultApplicationArguments());

        ArgumentCaptor<User> captured = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captured.capture());
        assertEquals(SystemRole.ADMIN, captured.getValue().getSystemRole());
        assertEquals("admin@example.test", captured.getValue().getEmail());
        assertEquals("bcrypt-hash", captured.getValue().getPasswordHash());
    }

    @Test
    void doesNotCreateOrOverwriteWhenAnAdminAlreadyExists() throws Exception {
        when(userRepository.countBySystemRole(SystemRole.ADMIN)).thenReturn(1L);

        new InitialAdminBootstrap(userRepository, passwordEncoder, "admin@example.test", "Password123!", "QA Admin", false)
                .run(new DefaultApplicationArguments());

        verify(userRepository, never()).findByEmail(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void doesNotCreateWhenConfigurationIsInvalidOrEmailAlreadyBelongsToAnotherAccount() throws Exception {
        when(userRepository.countBySystemRole(SystemRole.ADMIN)).thenReturn(0L);

        new InitialAdminBootstrap(userRepository, passwordEncoder, "invalid-email", "short", "QA Admin", false)
                .run(new DefaultApplicationArguments());

        verify(userRepository, never()).save(any());
    }

    @Test
    void allowsAnExplicitlyRequestedAdditionalAdminWithoutOverwritingAnExistingAccount() throws Exception {
        when(userRepository.countBySystemRole(SystemRole.ADMIN)).thenReturn(3L);
        when(userRepository.findByEmail("second-admin@example.test")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password123!")).thenReturn("bcrypt-hash");

        new InitialAdminBootstrap(userRepository, passwordEncoder, "second-admin@example.test", "Password123!", "QA Admin", true)
                .run(new DefaultApplicationArguments());

        verify(userRepository).save(any(User.class));
    }
}
