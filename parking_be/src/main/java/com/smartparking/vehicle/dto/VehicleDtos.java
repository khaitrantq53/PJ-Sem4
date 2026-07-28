package com.smartparking.vehicle.dto;

import com.smartparking.common.VehicleStatus;
import com.smartparking.common.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class VehicleDtos {
    private VehicleDtos() {
    }

    public record VehicleRequest(
            @NotBlank @Size(max = 50) String plateNumber,
            @NotNull VehicleType vehicleType,
            @Size(max = 120) String brand,
            @Size(max = 80) String color,
            Boolean defaultVehicle
    ) {
    }

    public record VehicleResponse(
            UUID id,
            UUID customerId,
            String plateNumber,
            VehicleType vehicleType,
            String brand,
            String color,
            boolean defaultVehicle,
            VehicleStatus status,
            Long version,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }
}
