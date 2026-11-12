package com.shiftsync.store.controller;

import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class StoreSupportContactTest {
    @Test void allowsUnconfiguredContactAndValidInternationalNumber() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(new StoreSupportController.Contact(null, null)).isEmpty());
            assertTrue(validator.validate(new StoreSupportController.Contact("+84901234567", "Hỗ trợ")).isEmpty());
            assertFalse(validator.validate(new StoreSupportController.Contact("12-34", "Hỗ trợ")).isEmpty());
            assertFalse(validator.validate(new StoreSupportController.Contact("123", "a".repeat(81))).isEmpty());
        }
    }
}
