package com.smartparking.common.dto;

import java.util.List;
import java.util.Map;

public record ErrorBody(
        String code,
        String message,
        List<FieldErrorBody> fieldErrors,
        Map<String, Object> context
) {
}
