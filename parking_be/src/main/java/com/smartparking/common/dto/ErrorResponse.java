package com.smartparking.common.dto;

public record ErrorResponse(boolean success, ErrorBody error, ApiMeta meta) {
}
