package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ParkingLotUpdateCapacityRepository extends JpaRepository<ParkingLotUpdateCapacity, UUID> {
    List<ParkingLotUpdateCapacity> findByRequestId(UUID requestId);
}
