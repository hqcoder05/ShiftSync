package com.shiftsync.shared.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private Map<String, Object> buildResponse(String code, String message, Object details) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("message", message);
        if (details != null) {
            body.put("details", details);
        }
        body.put("timestamp", OffsetDateTime.now());
        return body;
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessException(BusinessException ex) {
        logger.warn("[BusinessException] status={}, message={}", ex.getStatus(), ex.getMessage());
        return new ResponseEntity<>(
            buildResponse(ex.getStatus().name(), ex.getMessage(), null), 
            ex.getStatus()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        return new ResponseEntity<>(
            buildResponse("VALIDATION_FAILED", "Invalid request payload", errors), 
            HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        return new ResponseEntity<>(
            buildResponse("BAD_REQUEST", "Malformed JSON request", null), 
            HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleHttpMediaTypeNotSupported(org.springframework.web.HttpMediaTypeNotSupportedException ex) {
        return new ResponseEntity<>(
            buildResponse("UNSUPPORTED_MEDIA_TYPE", "Content-Type is not supported: " + ex.getContentType(), null), 
            HttpStatus.UNSUPPORTED_MEDIA_TYPE
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDeniedException(AccessDeniedException ex) {
        return new ResponseEntity<>(
            buildResponse("FORBIDDEN", "You do not have permission to perform this action", null), 
            HttpStatus.FORBIDDEN
        );
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(AuthenticationException ex) {
        return new ResponseEntity<>(
            buildResponse("UNAUTHORIZED", "Authentication failed", null), 
            HttpStatus.UNAUTHORIZED
        );
    }
    
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(NoResourceFoundException ex) {
        return new ResponseEntity<>(
            buildResponse("NOT_FOUND", "Resource not found", null), 
            HttpStatus.NOT_FOUND
        );
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleMethodArgumentTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        String requiredType = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown";
        String message = String.format("Parameter '%s' should be of type %s", ex.getName(), requiredType);
        return new ResponseEntity<>(
            buildResponse("BAD_REQUEST", message, null), 
            HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        return new ResponseEntity<>(
            buildResponse("BAD_REQUEST", ex.getMessage(), null), 
            HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(org.springframework.dao.DataIntegrityViolationException ex) {
        logger.warn("Data integrity violation: {}", ex.getMessage());
        return new ResponseEntity<>(
            buildResponse("DATA_INTEGRITY_VIOLATION", "Database constraint violation or conflict occurred", null), 
            HttpStatus.CONFLICT
        );
    }

    @ExceptionHandler({
        org.springframework.orm.ObjectOptimisticLockingFailureException.class,
        jakarta.persistence.OptimisticLockException.class
    })
    public ResponseEntity<Map<String, Object>> handleOptimisticLocking(Exception ex) {
        logger.warn("Optimistic locking conflict: {}", ex.getMessage());
        return new ResponseEntity<>(
            buildResponse("OPTIMISTIC_LOCK_CONFLICT", "This record was modified by another transaction. Please refresh and try again.", null), 
            HttpStatus.CONFLICT
        );
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        logger.warn("Max upload size exceeded: {}", ex.getMessage());
        return new ResponseEntity<>(
            buildResponse("PAYLOAD_TOO_LARGE", "Uploaded file exceeds the maximum permitted size limit", null), 
            HttpStatus.PAYLOAD_TOO_LARGE
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        logger.error("Unhandled exception: ", ex);
        return new ResponseEntity<>(
            buildResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", null), 
            HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}
