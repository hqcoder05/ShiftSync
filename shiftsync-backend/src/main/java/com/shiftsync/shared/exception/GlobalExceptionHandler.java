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
    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingServletRequestParameter(
            org.springframework.web.bind.MissingServletRequestParameterException ex) {
        String message = String.format("Thiếu tham số bắt buộc '%s' (kiểu %s)",
            ex.getParameterName(), ex.getParameterType());
        return new ResponseEntity<>(
            buildResponse("BAD_REQUEST", message, null),
            HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleHttpRequestMethodNotSupported(
            org.springframework.web.HttpRequestMethodNotSupportedException ex) {
        String message = String.format("Phương thức yêu cầu '%s' không được hỗ trợ", ex.getMethod());
        return new ResponseEntity<>(
            buildResponse("METHOD_NOT_ALLOWED", message, null),
            HttpStatus.METHOD_NOT_ALLOWED
        );
    }

    @ExceptionHandler(org.springframework.web.servlet.NoHandlerFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoHandlerFoundException(
            org.springframework.web.servlet.NoHandlerFoundException ex) {
        return new ResponseEntity<>(
            buildResponse("NOT_FOUND", "Không tìm thấy tài nguyên: " + ex.getRequestURL(), null),
            HttpStatus.NOT_FOUND
        );
    }

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
        logger.warn("Loi nghiep vu: trang thai={}, thong bao={}", ex.getStatus(), ex.getMessage());
        return new ResponseEntity<>(
            buildResponse(ex.getStatus().name(), ex.getMessage(), null),
            ex.getStatus()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = error instanceof FieldError field ? field.getField() : error.getObjectName();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        return new ResponseEntity<>(
            buildResponse("VALIDATION_FAILED", "Dữ liệu yêu cầu không hợp lệ", errors),
            HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        return new ResponseEntity<>(
            buildResponse("BAD_REQUEST", "Dữ liệu JSON không hợp lệ", null),
            HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleHttpMediaTypeNotSupported(org.springframework.web.HttpMediaTypeNotSupportedException ex) {
        return new ResponseEntity<>(
            buildResponse("UNSUPPORTED_MEDIA_TYPE", "Định dạng Content-Type không được hỗ trợ: " + ex.getContentType(), null),
            HttpStatus.UNSUPPORTED_MEDIA_TYPE
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDeniedException(AccessDeniedException ex) {
        return new ResponseEntity<>(
            buildResponse("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này", null),
            HttpStatus.FORBIDDEN
        );
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(AuthenticationException ex) {
        return new ResponseEntity<>(
            buildResponse("UNAUTHORIZED", "Xac thuc khong thanh cong", null),
            HttpStatus.UNAUTHORIZED
        );
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(NoResourceFoundException ex) {
        return new ResponseEntity<>(
            buildResponse("NOT_FOUND", "Không tìm thấy tài nguyên", null),
            HttpStatus.NOT_FOUND
        );
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleMethodArgumentTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        String requiredType = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown";
        String message = String.format("Tham số '%s' phải có kiểu %s", ex.getName(), requiredType);
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
        logger.warn("Dữ liệu vi phạm ràng buộc hoặc bị xung đột: {}", ex.getClass().getSimpleName());
        return new ResponseEntity<>(
            buildResponse("DATA_INTEGRITY_VIOLATION", "Dữ liệu bị xung đột hoặc vi phạm ràng buộc", null),
            HttpStatus.CONFLICT
        );
    }

    @ExceptionHandler(org.springframework.dao.ConcurrencyFailureException.class)
    public ResponseEntity<Map<String, Object>> handleConcurrentScheduleChange(org.springframework.dao.ConcurrencyFailureException ex) {
        logger.warn("Giao dịch đồng thời bị từ chối: {}", ex.getClass().getSimpleName());
        return new ResponseEntity<>(buildResponse("CONCURRENT_MODIFICATION",
                "Dữ liệu vừa thay đổi trong một thao tác khác. Vui lòng tải lại lịch và thử lại.", null), HttpStatus.CONFLICT);
    }

    @ExceptionHandler({
        org.springframework.orm.ObjectOptimisticLockingFailureException.class,
        jakarta.persistence.OptimisticLockException.class
    })
    public ResponseEntity<Map<String, Object>> handleOptimisticLocking(Exception ex) {
        logger.warn("Xung đột khi cập nhật đồng thời: {}", ex.getMessage());
        return new ResponseEntity<>(
            buildResponse("OPTIMISTIC_LOCK_CONFLICT", "Dữ liệu đã được thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại.", null),
            HttpStatus.CONFLICT
        );
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        logger.warn("Tệp tải lên vượt quá kích thước cho phép: {}", ex.getMessage());
        return new ResponseEntity<>(
            buildResponse("PAYLOAD_TOO_LARGE", "Tệp tải lên vượt quá kích thước cho phép", null),
            HttpStatus.PAYLOAD_TOO_LARGE
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        logger.error("Lỗi chưa được xử lý: ", ex);
        return new ResponseEntity<>(
            buildResponse("INTERNAL_SERVER_ERROR", "Đã xảy ra lỗi không mong muốn", null),
            HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}

