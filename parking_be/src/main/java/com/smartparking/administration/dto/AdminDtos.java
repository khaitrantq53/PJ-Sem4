package com.smartparking.administration.dto;

import com.smartparking.common.AccountStatus;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.ParkingLotStatus;
import com.smartparking.common.Role;
import com.smartparking.common.VehicleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
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

    public record UserResponse(UUID id, String email, String phone, String fullName, Role role, AccountStatus status,
                               Long version, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }

    public record ParkingCommandResponse(UUID id, ParkingLotStatus previousStatus, ParkingLotStatus currentStatus,
                                         Long version, OffsetDateTime updatedAt) {
    }

    public enum BookingExceptionAction {
        EXPIRE_PENDING_APPROVAL,
        EXPIRE_PENDING_PAYMENT,
        MARK_NO_SHOW,
        RELEASE_RESERVATION
    }

    public record ResolveBookingExceptionRequest(
            @NotNull BookingExceptionAction action,
            @NotBlank String reason,
            @NotNull Long expectedVersion
    ) {
    }

    public record BookingExceptionCommandResponse(UUID id, BookingStatus previousStatus, BookingStatus currentStatus,
                                                  Long version, OffsetDateTime updatedAt) {
    }

    public record SystemDashboardSummaryResponse(
            long totalUsers,
            long activeCustomers,
            long activeStaff,
            long activeParkingLots,
            long pendingApprovals,
            long todayBookings,
            BigDecimal revenue,
            BigDecimal refund,
            long suspendedAccounts,
            long suspendedParkingLots,
            long deviceAlerts
    ) {
    }

    public record AdminBookingFilter(UUID parkingLotId, BookingStatus status, OffsetDateTime startFrom,
                                     OffsetDateTime endTo, VehicleType vehicleType, String bookingCode,
                                     String plateNumber) {
    }
}
