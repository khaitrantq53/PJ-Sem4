package com.smartparking.parking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParkingServiceRepository extends JpaRepository<ParkingServiceEntity, UUID> {
    List<ParkingServiceEntity> findByParkingLotId(UUID parkingLotId);

    Optional<ParkingServiceEntity> findByIdAndParkingLotId(UUID id, UUID parkingLotId);

    List<ParkingServiceEntity> findByParkingLotIdAndIdInAndActiveTrue(UUID parkingLotId, Collection<UUID> ids);
}
