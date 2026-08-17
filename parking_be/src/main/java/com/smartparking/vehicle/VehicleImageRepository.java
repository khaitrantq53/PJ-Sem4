package com.smartparking.vehicle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VehicleImageRepository extends JpaRepository<VehicleImage, UUID> {
    Optional<VehicleImage> findFirstByVehicleIdOrderByCreatedAtDesc(UUID vehicleId);
}
