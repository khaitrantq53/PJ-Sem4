package com.smartparking.vehicle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface VehicleImageRepository extends JpaRepository<VehicleImage, UUID> {
}
