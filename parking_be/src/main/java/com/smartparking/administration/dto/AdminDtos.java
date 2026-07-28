package com.smartparking.administration.dto;

import com.smartparking.common.AccountStatus;
import com.smartparking.common.ParkingLotStatus;
import com.smartparking.common.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class AdminDtos {
    private AdminDtos() {
    }

    public record CreateStaffRequest(
            @Email String email,
            String phone,
            @NotBlank @Size(min = 8, max = 128) String password,
            @NotBlank String fullName
    ) {
    }

    public record StatusRequest(@NotNull AccountStatus status, @NotBlank String reason, Long expectedVersion) {
    }

    public record ReasonRequest(@NotBlank String reason, Long expectedVersion) {
    }

    public record UserResponse(UUID id, String email, String phone, Role role, AccountStatus status,
                               Long version, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }

    public record ParkingCommandResponse(UUID id, ParkingLotStatus previousStatus, ParkingLotStatus currentStatus,
                                         Long version, OffsetDateTime updatedAt) {
    }
}
