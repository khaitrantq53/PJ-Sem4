package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ParkingLotStaffRepository extends JpaRepository<ParkingLotStaff, UUID> {
    boolean existsByParkingLotIdAndStaffId(UUID parkingLotId, UUID staffId);
}
