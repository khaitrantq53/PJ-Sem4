package com.smartparking.vehicle;

import com.smartparking.vehicle.dto.VehicleDtos;
import org.springframework.stereotype.Component;

@Component
public class VehicleMapper {
    public VehicleDtos.VehicleResponse toResponse(Vehicle vehicle) {
        return new VehicleDtos.VehicleResponse(
                vehicle.getId(),
                vehicle.getCustomer().getId(),
                vehicle.getPlateNumber(),
                vehicle.getVehicleType(),
                vehicle.getBrand(),
                vehicle.getColor(),
                vehicle.isDefaultVehicle(),
                vehicle.getStatus(),
                vehicle.getVersion(),
                vehicle.getCreatedAt(),
                vehicle.getUpdatedAt()
        );
    }
}
