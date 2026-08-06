package com.smartparking.pricing;

import com.smartparking.common.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParkingPricingRuleRepository extends JpaRepository<ParkingPricingRule, UUID> {
    Optional<ParkingPricingRule> findFirstByParkingLotIdAndVehicleTypeAndActiveTrue(UUID parkingLotId, VehicleType vehicleType);

    List<ParkingPricingRule> findByParkingLotId(UUID parkingLotId);

    Optional<ParkingPricingRule> findByParkingLotIdAndVehicleTypeAndActiveTrue(UUID parkingLotId, VehicleType vehicleType);

    @Query("""
            select min(rule.hourlyRate)
            from ParkingPricingRule rule
            where rule.parkingLot.id = :parkingLotId
              and rule.active = true
            """)
    Optional<BigDecimal> findLowestActiveHourlyRate(@Param("parkingLotId") UUID parkingLotId);
}
