package com.smartparking.common.exception;

import java.util.Collections;
import java.util.Map;

public class BusinessException extends RuntimeException {
    private final ErrorCode code;
    private final Map<String, Object> context;

    public BusinessException(ErrorCode code, String message) {
        this(code, message, Collections.emptyMap());
    }

    public BusinessException(ErrorCode code, String message, Map<String, Object> context) {
        super(message);
        this.code = code;
        this.context = context;
    }

    public ErrorCode code() {
        return code;
    }

    public Map<String, Object> context() {
        return context;
    }
}
