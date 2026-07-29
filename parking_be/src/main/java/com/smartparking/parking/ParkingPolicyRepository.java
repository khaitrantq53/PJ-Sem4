package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParkingPolicyRepository extends JpaRepository<ParkingPolicy, UUID> {
    List<ParkingPolicy> findByParkingLotId(UUID parkingLotId);

    Optional<ParkingPolicy> findByParkingLotIdAndPolicyKey(UUID parkingLotId, String policyKey);
}
