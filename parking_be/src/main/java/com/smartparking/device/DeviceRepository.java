package com.smartparking.device;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface DeviceRepository extends JpaRepository<Device, UUID> {
    @Query("""
            select count(d)
            from Device d
            join ParkingLotStaff s on s.parkingLot.id = d.parkingLot.id
            where s.staff.id = :staffId
              and (:parkingLotId is null or d.parkingLot.id = :parkingLotId)
              and d.status = 'OFFLINE'
            """)
    long countOfflineForStaff(UUID staffId, UUID parkingLotId);
}
