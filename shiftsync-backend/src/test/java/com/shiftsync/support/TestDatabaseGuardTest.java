package com.shiftsync.support;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;

class TestDatabaseGuardTest {
    @Test void allowsOnlyExplicitTestDatabases() {
        var env = new MockEnvironment().withProperty("spring.datasource.url", "jdbc:postgresql://127.0.0.1:55432/shiftsync_scheduler_test");
        assertDoesNotThrow(() -> TestDatabaseGuard.verify(env));
        env.setProperty("spring.datasource.url", "jdbc:postgresql://127.0.0.1:5432/shiftsync");
        assertThrows(IllegalStateException.class, () -> TestDatabaseGuard.verify(env));
        env.setProperty("spring.datasource.url", "jdbc:postgresql://database.example:5432/shiftsync_test");
        assertThrows(IllegalStateException.class, () -> TestDatabaseGuard.verify(env));
        env.setProperty("TEST_ALLOW_REMOTE_DB", "true");
        assertDoesNotThrow(() -> TestDatabaseGuard.verify(env));
    }
}
