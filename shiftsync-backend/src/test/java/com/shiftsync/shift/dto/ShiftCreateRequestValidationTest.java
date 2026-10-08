package com.shiftsync.shift.dto;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import com.shiftsync.shared.exception.GlobalExceptionHandler;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class ShiftCreateRequestValidationTest {

    @RestController
    static class DummyShiftController {
        @PostMapping("/api/shifts")
        public String create(@Valid @RequestBody ShiftCreateRequest request) {
            return "ok";
        }
    }

    @Test
    public void testSizeValidation() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new DummyShiftController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        String longNote = "a".repeat(501);
        String payload = "{\"shiftDate\":\"2026-10-10\",\"startTime\":\"08:00:00\",\"endTime\":\"12:00:00\",\"note\":\"" + longNote + "\"}";

        mockMvc.perform(post("/api/shifts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.details.note").value("Note must not exceed 500 characters"));
    }
}
