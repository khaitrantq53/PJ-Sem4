package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ParkingServiceRepository extends JpaRepository<ParkingServiceEntity, UUID> {
    List<ParkingServiceEntity> findByParkingLotIdAndIdInAndActiveTrue(UUID parkingLotId, Collection<UUID> ids);
}
