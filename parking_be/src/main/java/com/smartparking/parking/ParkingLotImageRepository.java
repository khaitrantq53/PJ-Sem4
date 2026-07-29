package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ParkingLotImageRepository extends JpaRepository<ParkingLotImage, UUID> {
}
