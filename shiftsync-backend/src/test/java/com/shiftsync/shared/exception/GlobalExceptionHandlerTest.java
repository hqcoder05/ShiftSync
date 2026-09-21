package com.shiftsync.shared.exception;

import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    public void testMethodArgumentTypeMismatchReturns400() throws Exception {
        MethodParameter param = new MethodParameter(
                GlobalExceptionHandlerTest.class.getDeclaredMethod("dummyMethod", Integer.class), 0);
        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                "abc", Integer.class, "age", param, new NumberFormatException());

        ResponseEntity<Map<String, Object>> response = handler.handleMethodArgumentTypeMismatch(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("BAD_REQUEST", response.getBody().get("code"));
        assertTrue(response.getBody().get("message").toString().contains("Parameter 'age' should be of type Integer"));
    }

    @Test
    public void testIllegalArgumentExceptionReturns400() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid input value");
        ResponseEntity<Map<String, Object>> response = handler.handleIllegalArgumentException(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("BAD_REQUEST", response.getBody().get("code"));
        assertEquals("Invalid input value", response.getBody().get("message"));
    }

    @Test
    public void testMaxUploadSizeExceededExceptionReturns413() {
        org.springframework.web.multipart.MaxUploadSizeExceededException ex =
                new org.springframework.web.multipart.MaxUploadSizeExceededException(10485760);
        ResponseEntity<Map<String, Object>> response = handler.handleMaxUploadSizeExceeded(ex);

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("PAYLOAD_TOO_LARGE", response.getBody().get("code"));
        assertEquals("Uploaded file exceeds the maximum permitted size limit", response.getBody().get("message"));
    }

    public void dummyMethod(Integer age) {}
}