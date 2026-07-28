package com.smartparking.common.dto;

import java.util.List;

public record PageResponse<T>(
        boolean success,
        List<T> data,
        PaginationMeta pagination,
        ApiMeta meta
) {
    public static <T> PageResponse<T> of(org.springframework.data.domain.Page<T> page, String requestId) {
        return new PageResponse<>(
                true,
                page.getContent(),
                new PaginationMeta(
                        page.getNumber(),
                        page.getSize(),
                        page.getTotalElements(),
                        page.getTotalPages(),
                        page.isFirst(),
                        page.isLast()
                ),
                new ApiMeta(java.time.OffsetDateTime.now(), requestId)
        );
    }
}
