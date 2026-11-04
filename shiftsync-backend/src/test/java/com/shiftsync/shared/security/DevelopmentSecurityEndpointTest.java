package com.shiftsync.shared.security;

import com.shiftsync.shared.test.SecurityTestController;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DevelopmentSecurityEndpointTest {
    @Test void developmentControllerCannotMintTokens() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new SecurityTestController()).build();
        mvc.perform(get("/api/test/security/public")).andExpect(status().isOk());
        mvc.perform(get("/api/test/security/generate-token").param("email", "admin@example.invalid").param("role", "ADMIN"))
                .andExpect(status().isNotFound());
    }
}
