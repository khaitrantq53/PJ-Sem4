package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ParkingOperatingHourRepository extends JpaRepository<ParkingOperatingHour, UUID> {
    List<ParkingOperatingHour> findByParkingLotId(UUID parkingLotId);
}
