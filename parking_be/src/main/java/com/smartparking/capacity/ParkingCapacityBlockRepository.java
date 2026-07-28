package com.smartparking.capacity;

import com.smartparking.common.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface ParkingCapacityBlockRepository extends JpaRepository<ParkingCapacityBlock, UUID> {
    @Query("""
            select coalesce(sum(b.quantity), 0)
            from ParkingCapacityBlock b
            where b.parkingLot.id = :parkingLotId
              and b.vehicleType = :vehicleType
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    long countBlocked(UUID parkingLotId, VehicleType vehicleType, OffsetDateTime startTime, OffsetDateTime endTime);
}
