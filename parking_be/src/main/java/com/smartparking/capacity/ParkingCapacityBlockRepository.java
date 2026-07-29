package com.smartparking.capacity;

import com.smartparking.common.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface ParkingCapacityBlockRepository extends JpaRepository<ParkingCapacityBlock, UUID> {
    List<ParkingCapacityBlock> findByParkingLotId(UUID parkingLotId);

    @Query("""
            select coalesce(sum(b.quantity), 0)
            from ParkingCapacityBlock b
            where b.parkingLot.id = :parkingLotId
              and b.vehicleType = :vehicleType
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    long countBlocked(UUID parkingLotId, VehicleType vehicleType, OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select coalesce(sum(b.quantity), 0)
            from ParkingCapacityBlock b
            where b.parkingLot.id = :parkingLotId
              and b.vehicleType = :vehicleType
              and b.id <> :excludedBlockId
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    long countBlockedExcluding(UUID parkingLotId, VehicleType vehicleType, UUID excludedBlockId,
                               OffsetDateTime startTime, OffsetDateTime endTime);
}
