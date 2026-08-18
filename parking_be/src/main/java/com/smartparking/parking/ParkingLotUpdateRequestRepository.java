package com.smartparking.parking;

import com.smartparking.common.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ParkingLotUpdateRequestRepository extends JpaRepository<ParkingLotUpdateRequest, UUID> {
    boolean existsByParkingLotIdAndStatus(UUID parkingLotId, RequestStatus status);

    Page<ParkingLotUpdateRequest> findByStatus(RequestStatus status, Pageable pageable);
}
