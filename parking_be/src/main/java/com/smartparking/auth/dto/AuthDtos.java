package com.smartparking.auth.dto;

import com.smartparking.common.AccountStatus;
import com.smartparking.common.OtpPurpose;
import com.smartparking.common.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
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

    public record OtpSendRequest(
            @NotBlank @Size(max = 255) String destination,
            @NotNull OtpPurpose purpose
    ) {
    }

    public record OtpVerifyRequest(
            @NotBlank @Size(max = 255) String destination,
            @NotNull OtpPurpose purpose,
            @NotBlank @Size(min = 4, max = 12) String otp
    ) {
    }

    public record ConfirmRegistrationRequest(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 4, max = 12) String otp
    ) {
    }

    public record OtpResponse(OffsetDateTime expiresAt) {
    }

    public record ForgotPasswordRequest(@NotBlank @Size(max = 255) String username) {
    }

    public record ResetPasswordRequest(
            @NotBlank @Size(max = 255) String username,
            @NotBlank @Size(min = 4, max = 12) String otp,
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
