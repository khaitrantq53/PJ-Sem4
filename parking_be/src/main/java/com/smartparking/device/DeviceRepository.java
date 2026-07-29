package com.smartparking.device;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.List;
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

    @Query("""
            select d
            from Device d
            where d.status <> 'OFFLINE'
              and d.lastHeartbeatAt is not null
              and d.lastHeartbeatAt < :cutoff
            """)
    List<Device> findOfflineCandidates(OffsetDateTime cutoff, Pageable pageable);
}
