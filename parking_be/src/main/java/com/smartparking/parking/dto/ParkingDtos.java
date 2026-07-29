package com.smartparking.parking.dto;

import com.smartparking.common.ParkingLotStatus;
import com.smartparking.common.VehicleType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class ParkingDtos {
    private ParkingDtos() {
    }

    public record ParkingLotRequest(
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 500) String address,
            @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
            @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
            String description,
            @NotNull Long version
    ) {
    }

    public record CreateParkingLotRequest(
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 500) String address,
            @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
            @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
            String description
    ) {
    }

    public record ParkingLotResponse(
            UUID id,
            String name,
            String address,
            BigDecimal latitude,
            BigDecimal longitude,
            ParkingLotStatus status,
            String description,
            Long version,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    public record ParkingLotListResponse(
            UUID id,
            String name,
            String address,
            BigDecimal latitude,
            BigDecimal longitude,
            ParkingLotStatus status,
            Long version,
            OffsetDateTime updatedAt
    ) {
    }

    public record CapacityRequest(@Min(0) int totalCapacity, @NotNull Long version) {
    }

    public record CapacityResponse(UUID parkingLotId, VehicleType vehicleType, int totalCapacity, long reserved, long blocked,
                                   long checkedIn, long available, Long version) {
    }

    public record CapacityBlockRequest(
            @NotNull VehicleType vehicleType,
            @Positive int quantity,
            @NotNull OffsetDateTime startTime,
            @NotNull OffsetDateTime endTime,
            @NotBlank String reason
    ) {
    }

    public record CapacityBlockResponse(
            UUID id,
            UUID parkingLotId,
            VehicleType vehicleType,
            int quantity,
            OffsetDateTime startTime,
            OffsetDateTime endTime,
            String reason,
            Long version,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    public record AvailabilityRequest(@NotNull VehicleType vehicleType, @NotNull OffsetDateTime startTime,
                                      @NotNull OffsetDateTime endTime) {
    }

    public record AvailabilityResponse(UUID parkingLotId, VehicleType vehicleType, long available,
                                       OffsetDateTime startTime, OffsetDateTime endTime) {
    }

    public record ParkingLotSearchCriteria(
            BigDecimal latitude,
            BigDecimal longitude,
            BigDecimal maxDistanceKm,
            String address,
            VehicleType vehicleType,
            OffsetDateTime startTime,
            OffsetDateTime endTime,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            UUID serviceId,
            BigDecimal minRating
    ) {
    }

    public record ReasonRequest(@NotBlank String reason, Long expectedVersion) {
    }

    public record ParkingLotDetailResponse(ParkingLotResponse parkingLot, List<CapacityResponse> capacities) {
    }

    public record PricingRuleRequest(
            @NotNull VehicleType vehicleType,
            @NotNull @DecimalMin("0.00") BigDecimal hourlyRate,
            @NotNull Boolean active,
            Long version
    ) {
    }

    public record PricingRuleResponse(
            UUID id,
            UUID parkingLotId,
            VehicleType vehicleType,
            BigDecimal hourlyRate,
            boolean active,
            Long version,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    public record ParkingServiceRequest(
            @NotBlank @Size(max = 255) String name,
            @NotNull @DecimalMin("0.00") BigDecimal price,
            @NotNull Boolean active,
            Long version
    ) {
    }

    public record ParkingServiceResponse(
            UUID id,
            UUID parkingLotId,
            String name,
            BigDecimal price,
            boolean active,
            Long version,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    public record PromotionRequest(
            @NotBlank @Size(max = 80) String code,
            @NotBlank @Size(max = 255) String name,
            @NotNull @DecimalMin("0.00") BigDecimal discountAmount,
            @NotNull Boolean active,
            @NotNull OffsetDateTime startsAt,
            @NotNull OffsetDateTime endsAt,
            Long version
    ) {
    }

    public record PromotionResponse(
            UUID id,
            UUID parkingLotId,
            String code,
            String name,
            BigDecimal discountAmount,
            boolean active,
            OffsetDateTime startsAt,
            OffsetDateTime endsAt,
            Long version,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    public record PolicyRequest(
            @NotBlank @Size(max = 120) String policyKey,
            @NotBlank String policyValue,
            Long version
    ) {
    }

    public record PolicyResponse(
            UUID id,
            UUID parkingLotId,
            String policyKey,
            String policyValue,
            Long version,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }
}
