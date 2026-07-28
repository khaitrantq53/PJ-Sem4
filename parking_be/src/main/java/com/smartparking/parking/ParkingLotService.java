package com.smartparking.parking;

import com.smartparking.common.VehicleType;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.parking.dto.ParkingDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface ParkingLotService {
    ParkingDtos.ParkingLotResponse create(CurrentUser currentUser, ParkingDtos.CreateParkingLotRequest request);

    Page<ParkingDtos.ParkingLotResponse> listMine(CurrentUser currentUser, Pageable pageable);

    ParkingDtos.ParkingLotResponse getForStaff(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.ParkingLotResponse update(CurrentUser currentUser, UUID parkingLotId, ParkingDtos.ParkingLotRequest request);

    ParkingDtos.ParkingLotResponse submitApproval(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.ParkingLotResponse pause(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.ParkingLotResponse resume(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.ParkingLotResponse requestClosure(CurrentUser currentUser, UUID parkingLotId, String reason);

    Page<ParkingDtos.ParkingLotResponse> publicActive(Pageable pageable);

    ParkingDtos.ParkingLotResponse publicDetail(UUID parkingLotId);

    ParkingDtos.CapacityResponse updateCapacity(CurrentUser currentUser, UUID parkingLotId, VehicleType vehicleType,
                                                ParkingDtos.CapacityRequest request);

    List<ParkingDtos.CapacityResponse> capacities(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.AvailabilityResponse availability(UUID parkingLotId, VehicleType vehicleType, OffsetDateTime startTime,
                                                  OffsetDateTime endTime);
}
