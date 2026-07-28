package com.smartparking.capacity;

import com.smartparking.common.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

public interface ParkingVehicleCapacityRepository extends JpaRepository<ParkingVehicleCapacity, UUID> {
    Optional<ParkingVehicleCapacity> findByParkingLotIdAndVehicleType(UUID parkingLotId, VehicleType vehicleType);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ParkingVehicleCapacity c where c.parkingLot.id = :parkingLotId and c.vehicleType = :vehicleType")
    Optional<ParkingVehicleCapacity> lockByParkingLotIdAndVehicleType(UUID parkingLotId, VehicleType vehicleType);
}
