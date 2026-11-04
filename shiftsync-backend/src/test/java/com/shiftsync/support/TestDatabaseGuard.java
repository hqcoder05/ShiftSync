package com.shiftsync.support;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

/** Runs before datasource/Flyway creation in Spring Boot integration tests. */
public class TestDatabaseGuard implements EnvironmentPostProcessor, Ordered {
    @Override public int getOrder() { return Ordered.LOWEST_PRECEDENCE; }

    @Override public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        verify(environment);
    }

    public static void verify(org.springframework.core.env.Environment environment) {
        String url = environment.getProperty("spring.datasource.url", "");
        if (!url.startsWith("jdbc:postgresql://")) {
            throw new IllegalStateException("Kiểm thử yêu cầu PostgreSQL dành riêng cho test");
        }
        try {
            java.net.URI uri = java.net.URI.create(url.substring("jdbc:".length()));
            String host = uri.getHost();
            String database = uri.getPath() == null ? "" : uri.getPath().substring(1);
            boolean local = "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host) || "[::1]".equals(host) || "::1".equals(host);
            boolean testName = database.matches("(?i)[a-z0-9_]*_test(?:_[a-z0-9_]+)?");
            if (!testName || (!local && !Boolean.parseBoolean(environment.getProperty("TEST_ALLOW_REMOTE_DB", "false")))) {
                throw new IllegalStateException("Chặn kết nối kiểm thử tới cơ sở dữ liệu không được chỉ định riêng cho test");
            }
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("Địa chỉ cơ sở dữ liệu kiểm thử không hợp lệ", ex);
        }
    }
}
