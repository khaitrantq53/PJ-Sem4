package com.smartparking.parking;

import com.smartparking.parking.dto.ParkingDtos;
import org.springframework.stereotype.Component;

@Component
public class ParkingLotMapper {
    public ParkingDtos.ParkingLotResponse toResponse(ParkingLot parkingLot) {
        return new ParkingDtos.ParkingLotResponse(
                parkingLot.getId(),
                parkingLot.getName(),
                parkingLot.getAddress(),
                parkingLot.getLatitude(),
                parkingLot.getLongitude(),
                parkingLot.getStatus(),
                parkingLot.getDescription(),
                parkingLot.getVersion(),
                parkingLot.getCreatedAt(),
                parkingLot.getUpdatedAt()
        );
    }

    public ParkingDtos.ParkingLotListResponse toListResponse(ParkingLot parkingLot) {
        return new ParkingDtos.ParkingLotListResponse(
                parkingLot.getId(),
                parkingLot.getName(),
                parkingLot.getAddress(),
                parkingLot.getLatitude(),
                parkingLot.getLongitude(),
                parkingLot.getStatus(),
                parkingLot.getVersion(),
                parkingLot.getUpdatedAt()
        );
    }
}
