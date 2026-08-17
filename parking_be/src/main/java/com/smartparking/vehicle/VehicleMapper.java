package com.smartparking.vehicle;

import com.smartparking.vehicle.dto.VehicleDtos;
import org.springframework.stereotype.Component;

@Component
public class VehicleMapper {
    private final VehicleImageRepository vehicleImageRepository;

    public VehicleMapper(VehicleImageRepository vehicleImageRepository) {
        this.vehicleImageRepository = vehicleImageRepository;
    }

    public VehicleDtos.VehicleResponse toResponse(Vehicle vehicle) {
        VehicleImage image = vehicleImageRepository.findFirstByVehicleIdOrderByCreatedAtDesc(vehicle.getId()).orElse(null);
        return new VehicleDtos.VehicleResponse(
                vehicle.getId(),
                vehicle.getCustomer().getId(),
                vehicle.getPlateNumber(),
                vehicle.getVehicleType(),
                vehicle.getBrand(),
                vehicle.getColor(),
                image == null ? null : image.getId(),
                image == null ? null : "/api/v1/public/files/vehicle-images/" + image.getId(),
                vehicle.isDefaultVehicle(),
                vehicle.getStatus(),
                vehicle.getVersion(),
                vehicle.getCreatedAt(),
                vehicle.getUpdatedAt()
        );
    }
}
