package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ParkingLotUpdateImageRepository extends JpaRepository<ParkingLotUpdateImage, UUID> {
    List<ParkingLotUpdateImage> findByRequestIdOrderByCreatedAtAsc(UUID requestId);
}
