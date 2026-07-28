package com.smartparking.common.dto;

public record ApiResponse<T>(boolean success, T data, ApiMeta meta) {
    public static <T> ApiResponse<T> ok(T data, String requestId) {
        return new ApiResponse<>(true, data, new ApiMeta(java.time.OffsetDateTime.now(), requestId));
    }
}
