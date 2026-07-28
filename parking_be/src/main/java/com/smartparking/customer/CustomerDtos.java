package com.smartparking.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class CustomerDtos {
    private CustomerDtos() {
    }

    public record ProfileUpdateRequest(@NotBlank @Size(max = 255) String fullName, Long version) {
    }

    public record ProfileResponse(UUID accountId, String email, String phone, String fullName, String avatarFileId,
                                  Long version, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }
}
