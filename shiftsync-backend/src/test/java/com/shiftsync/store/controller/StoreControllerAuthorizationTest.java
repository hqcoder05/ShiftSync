package com.shiftsync.store.controller;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class StoreControllerAuthorizationTest {

    @Test
    void onlyAdminCanCreateStore() throws NoSuchMethodException {
        Method createStore = StoreController.class.getMethod("createStore",
                com.shiftsync.store.dto.StoreCreateRequest.class,
                com.shiftsync.shared.security.CustomUserDetails.class);
        PreAuthorize authorization = createStore.getAnnotation(PreAuthorize.class);

        assertNotNull(authorization);
        assertEquals("hasRole('ADMIN')", authorization.value());
    }
}
