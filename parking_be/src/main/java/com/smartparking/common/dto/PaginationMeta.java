package com.smartparking.common.dto;

public record PaginationMeta(
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {
}
