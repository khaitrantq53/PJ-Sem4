package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ParkingLotUpdateServiceRepository extends JpaRepository<ParkingLotUpdateService, UUID> {
    List<ParkingLotUpdateService> findByRequestId(UUID requestId);
}
