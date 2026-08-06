package com.smartparking.parking;

import com.smartparking.parking.dto.ParkingDtos;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class ParkingLotMapper {
    public ParkingDtos.ParkingLotResponse toResponse(ParkingLot parkingLot) {
        return toResponse(parkingLot, null);
    }

    public ParkingDtos.ParkingLotResponse toResponse(ParkingLot parkingLot, BigDecimal hourlyRate) {
        return new ParkingDtos.ParkingLotResponse(
                parkingLot.getId(),
                parkingLot.getName(),
                parkingLot.getAddress(),
                parkingLot.getLatitude(),
                parkingLot.getLongitude(),
                parkingLot.getStatus(),
                parkingLot.getDescription(),
                hourlyRate,
                parkingLot.getVersion(),
                parkingLot.getCreatedAt(),
                parkingLot.getUpdatedAt()
        );
    }

    public ParkingDtos.ParkingLotListResponse toListResponse(ParkingLot parkingLot) {
        return toListResponse(parkingLot, null);
    }

    public ParkingDtos.ParkingLotListResponse toListResponse(ParkingLot parkingLot, BigDecimal hourlyRate) {
        return new ParkingDtos.ParkingLotListResponse(
                parkingLot.getId(),
                parkingLot.getName(),
                parkingLot.getAddress(),
                parkingLot.getLatitude(),
                parkingLot.getLongitude(),
                parkingLot.getStatus(),
                hourlyRate,
                parkingLot.getVersion(),
                parkingLot.getUpdatedAt()
        );
    }
}
