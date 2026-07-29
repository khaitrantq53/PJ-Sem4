package com.smartparking.booking.dto;

import com.smartparking.common.AvailableAction;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.DeliveryMethod;
import com.smartparking.common.PaymentMethod;
import com.smartparking.common.PaymentStatus;
import com.smartparking.common.RequestStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class BookingDtos {
    private BookingDtos() {
    }

    public record BookingRequest(
            @NotNull UUID parkingLotId,
            @NotNull UUID vehicleId,
            @NotNull OffsetDateTime startTime,
            @NotNull OffsetDateTime endTime,
            @NotNull DeliveryMethod deliveryMethod,
            List<UUID> serviceIds,
            String promotionCode,
            @NotNull PaymentMethod paymentMethod
    ) {
    }

    public record Money(BigDecimal amount, String currency) {
    }

    public record PriceBreakdown(
            Money parkingFee,
            Money serviceFee,
            Money pickupFee,
            Money discount,
            Money platformFee,
            Money tax,
            Money overtimeFee,
            Money total
    ) {
    }

    public record BookingPreviewResponse(
            UUID parkingLotId,
            UUID vehicleId,
            OffsetDateTime startTime,
            OffsetDateTime endTime,
            PriceBreakdown priceBreakdown,
            long availableCapacity
    ) {
    }

    public record BookingResponse(
            UUID id,
            String bookingCode,
            UUID parkingLotId,
            UUID vehicleId,
            BookingStatus status,
            PaymentStatus paymentStatus,
            PaymentMethod paymentMethod,
            OffsetDateTime startTime,
            OffsetDateTime endTime,
            PriceBreakdown priceBreakdown,
            List<AvailableAction> availableActions,
            Long version,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    public record CommandResponse(
            UUID id,
            BookingStatus previousStatus,
            BookingStatus currentStatus,
            PaymentStatus paymentStatus,
            String nextAction,
            List<AvailableAction> availableActions,
            Long version,
            OffsetDateTime updatedAt
    ) {
    }

    public record ReasonRequest(@NotBlank String reason, Long expectedVersion) {
    }

    public record ChangeRequest(
            @NotNull OffsetDateTime requestedStartTime,
            @NotNull OffsetDateTime requestedEndTime,
            @NotBlank String reason,
            Long expectedVersion
    ) {
    }

    public record ExtensionRequest(
            @NotNull OffsetDateTime requestedEndTime,
            @NotBlank String reason,
            Long expectedVersion
    ) {
    }

    public record BookingRequestResponse(
            UUID id,
            UUID bookingId,
            RequestStatus status,
            OffsetDateTime requestedStartTime,
            OffsetDateTime requestedEndTime,
            String reason,
            Long version,
            OffsetDateTime createdAt
    ) {
    }

    public record CheckInRequest(String qrCode, String conditionNotes, Long expectedVersion) {
    }

    public record CheckOutRequest(String conditionNotes, Long expectedVersion) {
    }
}
