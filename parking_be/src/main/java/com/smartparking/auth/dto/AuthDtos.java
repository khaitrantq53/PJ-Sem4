package com.smartparking.auth.dto;

import com.smartparking.common.AccountStatus;
import com.smartparking.common.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record CustomerRegisterRequest(
            @Email String email,
            String phone,
            @NotBlank @Size(min = 8, max = 128) String password,
            @NotBlank @Size(max = 255) String fullName
    ) {
    }

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password
    ) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 128) String newPassword
    ) {
    }

    public record AuthResponse(
            String accessToken,
            String refreshToken,
            AccountSummary account
    ) {
    }

    public record AccountSummary(
            UUID id,
            String email,
            String phone,
            Role role,
            AccountStatus status
    ) {
    }
}
