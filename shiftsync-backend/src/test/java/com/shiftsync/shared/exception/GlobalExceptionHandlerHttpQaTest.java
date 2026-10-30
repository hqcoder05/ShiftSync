package com.shiftsync.shared.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class GlobalExceptionHandlerHttpQaTest {

    private MockMvc mockMvc;

    @Data
    static class DummyDto {
        @NotNull(message = "Field cannot be null")
        private String requiredField;
    }

    @RestController
    static class DummyController {
        @PostMapping("/api/test/scheduling-conflict")
        public String schedulingConflict() {
            throw new org.springframework.dao.CannotSerializeTransactionException("private database details");
        }

        @PostMapping("/api/test/optimistic-conflict")
        public String optimisticConflict() {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException("Shift", "test-id");
        }
        @GetMapping("/api/test/param")
        public String testParam(@RequestParam String requiredParam) {
            return "ok";
        }

        @PostMapping("/api/test/body")
        public String testBody(@Valid @RequestBody DummyDto dto) {
            return "ok";
        }
    }

    @BeforeEach
    public void setup() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(new DummyController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    public void testMissingServletRequestParameter_Http400() throws Exception {
        mockMvc.perform(get("/api/test/param"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void serializableConflictReturnsRetryable409WithoutDatabaseDetails() throws Exception {
        mockMvc.perform(post("/api/test/scheduling-conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONCURRENT_MODIFICATION"))
                .andExpect(jsonPath("$.message").value("Dữ liệu vừa thay đổi trong một thao tác khác. Vui lòng tải lại lịch và thử lại."));
    }

    @Test
    void optimisticConflictKeepsItsSpecific409Response() throws Exception {
        mockMvc.perform(post("/api/test/optimistic-conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OPTIMISTIC_LOCK_CONFLICT"));
    }

    @Test
    public void testHttpRequestMethodNotSupported_Http405() throws Exception {
        mockMvc.perform(post("/api/test/param?requiredParam=test"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    public void testMethodArgumentNotValid_Http400() throws Exception {
        mockMvc.perform(post("/api/test/body")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    public void testHttpMessageNotReadable_MalformedJson_Http400() throws Exception {
        mockMvc.perform(post("/api/test/body")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{malformed_json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("Malformed JSON request"));
    }
}
