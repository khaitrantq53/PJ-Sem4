package com.smartparking.vehiclecondition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface VehicleConditionImageRepository extends JpaRepository<VehicleConditionImage, UUID> {
}
