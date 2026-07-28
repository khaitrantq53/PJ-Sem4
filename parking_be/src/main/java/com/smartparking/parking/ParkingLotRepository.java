package com.smartparking.parking;

import com.smartparking.common.ParkingLotStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface ParkingLotRepository extends JpaRepository<ParkingLot, UUID> {
    Page<ParkingLot> findByStatus(ParkingLotStatus status, Pageable pageable);

    @Query("""
            select p
            from ParkingLot p
            join ParkingLotStaff s on s.parkingLot.id = p.id
            where s.staff.id = :staffId
            """)
    Page<ParkingLot> findManagedByStaff(UUID staffId, Pageable pageable);
}
