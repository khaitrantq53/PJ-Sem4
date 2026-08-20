package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ParkingLotStaffRepository extends JpaRepository<ParkingLotStaff, UUID> {
    boolean existsByParkingLotIdAndStaffId(UUID parkingLotId, UUID staffId);

    boolean existsByParkingLotId(UUID parkingLotId);

    boolean existsByStaffId(UUID staffId);

    Optional<ParkingLotStaff> findFirstByParkingLotId(UUID parkingLotId);
}
