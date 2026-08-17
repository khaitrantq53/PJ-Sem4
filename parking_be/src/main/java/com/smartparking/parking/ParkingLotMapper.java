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
        return toListResponse(parkingLot, null, null, 0);
    }

    public ParkingDtos.ParkingLotListResponse toListResponse(ParkingLot parkingLot, BigDecimal hourlyRate) {
        return toListResponse(parkingLot, hourlyRate, null, 0);
    }

    public ParkingDtos.ParkingLotListResponse toListResponse(ParkingLot parkingLot, BigDecimal hourlyRate,
                                                             BigDecimal averageRating, long reviewCount) {
        return new ParkingDtos.ParkingLotListResponse(
                parkingLot.getId(),
                parkingLot.getName(),
                parkingLot.getAddress(),
                parkingLot.getLatitude(),
                parkingLot.getLongitude(),
                parkingLot.getStatus(),
                hourlyRate,
                averageRating,
                reviewCount,
                parkingLot.getVersion(),
                parkingLot.getUpdatedAt()
        );
    }
}
