package com.smartparking.common.exception;

import com.smartparking.common.dto.ApiMeta;
import com.smartparking.common.dto.ErrorBody;
import com.smartparking.common.dto.ErrorResponse;
import com.smartparking.common.dto.FieldErrorBody;
import com.smartparking.common.security.RequestContext;
import jakarta.persistence.OptimisticLockException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ErrorResponse> handleBusiness(BusinessException exception) {
        return ResponseEntity.status(exception.code().status()).body(error(
                exception.code().name(),
                exception.getMessage(),
                List.of(),
                exception.context()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        List<FieldErrorBody> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldErrorBody(error.getField(), error.getDefaultMessage()))
                .toList();
        return ResponseEntity.badRequest().body(error("REQUEST_VALIDATION_FAILED", "Request không hợp lệ", fieldErrors, Map.of()));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ErrorResponse> handleConstraint(ConstraintViolationException exception) {
        List<FieldErrorBody> fieldErrors = exception.getConstraintViolations().stream()
                .map(error -> new FieldErrorBody(error.getPropertyPath().toString(), error.getMessage()))
                .toList();
        return ResponseEntity.badRequest().body(error("REQUEST_VALIDATION_FAILED", "Request không hợp lệ", fieldErrors, Map.of()));
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, OptimisticLockException.class})
    ResponseEntity<ErrorResponse> handleOptimisticLock(RuntimeException exception) {
        return ResponseEntity.status(ErrorCode.RESOURCE_VERSION_CONFLICT.status()).body(error(
                ErrorCode.RESOURCE_VERSION_CONFLICT.name(),
                "Dữ liệu đã được cập nhật bởi giao dịch khác",
                List.of(),
                Map.of()
        ));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException exception) {
        return ResponseEntity.status(ErrorCode.ACCESS_DENIED.status()).body(error(
                ErrorCode.ACCESS_DENIED.name(),
                "Không có quyền thực hiện thao tác",
                List.of(),
                Map.of()
        ));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> handleUnexpected(Exception exception) {
        return ResponseEntity.internalServerError().body(error(
                ErrorCode.INTERNAL_SERVER_ERROR.name(),
                "Lỗi hệ thống",
                List.of(),
                Map.of()
        ));
    }

    private ErrorResponse error(String code, String message, List<FieldErrorBody> fieldErrors, Map<String, Object> context) {
        return new ErrorResponse(false, new ErrorBody(code, message, fieldErrors, context),
                new ApiMeta(OffsetDateTime.now(), RequestContext.requestId()));
    }
}
