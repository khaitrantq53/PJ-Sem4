package com.smartparking.customer;

import com.smartparking.common.AccountStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class CustomerDtos {
    private CustomerDtos() {
    }

    public record ProfileUpdateRequest(
            @NotBlank @Size(max = 255) String fullName,
            @Email @Size(max = 255) String email,
            @Size(max = 32) String phone,
            Long version
    ) {
    }

    public record ProfileResponse(UUID accountId, String email, String phone, String fullName,
                                  String avatarFileId, String avatarUrl,
                                  AccountStatus status, boolean emailVerified, boolean phoneVerified,
                                  Long version, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }
}
