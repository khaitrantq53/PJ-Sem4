package com.smartparking.parking.dto;

import com.smartparking.common.ParkingLotStatus;
import com.smartparking.common.VehicleType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    public record CapacityRequest(@Min(0) int totalCapacity, @NotNull Long version) {
    }

    public record CapacityResponse(UUID parkingLotId, VehicleType vehicleType, int totalCapacity, long reserved, long blocked,
                                   long checkedIn, long available, Long version) {
    }

    public record AvailabilityRequest(@NotNull VehicleType vehicleType, @NotNull OffsetDateTime startTime,
                                      @NotNull OffsetDateTime endTime) {
    }

    public record AvailabilityResponse(UUID parkingLotId, VehicleType vehicleType, long available,
                                       OffsetDateTime startTime, OffsetDateTime endTime) {
    }

    public record ReasonRequest(@NotBlank String reason, Long expectedVersion) {
    }

    public record ParkingLotDetailResponse(ParkingLotResponse parkingLot, List<CapacityResponse> capacities) {
    }
}
