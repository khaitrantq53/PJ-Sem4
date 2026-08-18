package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ParkingLotUpdatePricingRuleRepository extends JpaRepository<ParkingLotUpdatePricingRule, UUID> {
    List<ParkingLotUpdatePricingRule> findByRequestId(UUID requestId);
}
