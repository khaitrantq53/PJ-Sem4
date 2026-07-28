package com.smartparking.pricing;

import com.smartparking.common.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ParkingPricingRuleRepository extends JpaRepository<ParkingPricingRule, UUID> {
    Optional<ParkingPricingRule> findFirstByParkingLotIdAndVehicleTypeAndActiveTrue(UUID parkingLotId, VehicleType vehicleType);
}
