package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ParkingLotImageRepository extends JpaRepository<ParkingLotImage, UUID> {
    List<ParkingLotImage> findByParkingLotIdOrderByCreatedAtAsc(UUID parkingLotId);

    void deleteByParkingLotId(UUID parkingLotId);
}
