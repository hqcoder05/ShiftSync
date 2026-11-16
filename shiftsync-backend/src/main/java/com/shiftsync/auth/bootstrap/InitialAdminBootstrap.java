package com.shiftsync.auth.bootstrap;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.shared.security.SystemRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Locale;

/**
 * Creates the first system administrator only for an empty-admin installation.
 * Credentials are supplied at runtime through environment variables and are
 * intentionally never stored in application properties or source control.
 */
@Component
public class InitialAdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InitialAdminBootstrap.class);
    private static final String PASSWORD_PATTERN = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;
    private final String fullName;
    private final boolean allowWhenAdminExists;

    public InitialAdminBootstrap(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.admin.email:}") String email,
            @Value("${app.bootstrap.admin.password:}") String password,
            @Value("${app.bootstrap.admin.full-name:System Administrator}") String fullName,
            @Value("${app.bootstrap.admin.allow-existing:false}") boolean allowWhenAdminExists) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        this.password = password == null ? "" : password;
        this.fullName = fullName == null ? "System Administrator" : fullName.trim();
        this.allowWhenAdminExists = allowWhenAdminExists;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.countBySystemRole(SystemRole.ADMIN) > 0 && !allowWhenAdminExists) {
            return;
        }

        if (!isValidConfiguration()) {
            if (StringUtils.hasText(email) || StringUtils.hasText(password)) {
                log.warn("Không thể khởi tạo ADMIN đầu tiên: cấu hình bootstrap không hợp lệ.");
            }
            return;
        }

        if (userRepository.findByEmail(email).isPresent()) {
            log.warn("Không thể khởi tạo ADMIN đầu tiên: email bootstrap đã thuộc một tài khoản khác.");
            return;
        }

        userRepository.save(User.builder()
                .fullName(fullName)
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .gender("OTHER")
                .systemRole(SystemRole.ADMIN)
                .build());
        log.info("Đã khởi tạo tài khoản ADMIN đầu tiên từ cấu hình runtime.");
    }

    private boolean isValidConfiguration() {
        return StringUtils.hasText(fullName)
                && email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
                && password.matches(PASSWORD_PATTERN);
    }
}
