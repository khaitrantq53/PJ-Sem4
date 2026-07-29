package com.smartparking.common.idempotency;

import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;

import java.util.UUID;

public final class IdempotencyKey {
    private IdempotencyKey() {
    }

    public static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value.trim()).toString();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(ErrorCode.IDEMPOTENCY_KEY_INVALID, "Idempotency-Key phải là UUID");
        }
    }
}
