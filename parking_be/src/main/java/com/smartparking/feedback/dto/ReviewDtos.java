package com.smartparking.feedback.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class ReviewDtos {
    private ReviewDtos() {
    }

    public record ReviewRequest(
            @NotNull @Min(1) @Max(5) Integer rating,
            @Size(max = 2000) String content
    ) {
    }

    public record ReviewResponse(
            UUID id,
            UUID bookingId,
            String bookingCode,
            UUID parkingLotId,
            String parkingLotName,
            UUID customerId,
            String customerName,
            int rating,
            String content,
            Long version,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }
}
