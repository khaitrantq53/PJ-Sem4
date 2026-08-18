package com.smartparking.parking;

import com.smartparking.parking.dto.ParkingDtos;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class ParkingLotMapper {
    private final ParkingLotImageRepository imageRepository;

    public ParkingLotMapper(ParkingLotImageRepository imageRepository) {
        this.imageRepository = imageRepository;
    }

    public ParkingDtos.ParkingLotResponse toResponse(ParkingLot parkingLot) {
        return toResponse(parkingLot, null);
    }

    public ParkingDtos.ParkingLotResponse toResponse(ParkingLot parkingLot, BigDecimal hourlyRate) {
        List<ParkingDtos.ParkingLotImageResponse> images = images(parkingLot.getId());
        return new ParkingDtos.ParkingLotResponse(
                parkingLot.getId(),
                parkingLot.getName(),
                parkingLot.getAddress(),
                parkingLot.getLatitude(),
                parkingLot.getLongitude(),
                parkingLot.getStatus(),
                parkingLot.getDescription(),
                hourlyRate,
                images,
                images.stream().map(ParkingDtos.ParkingLotImageResponse::imageUrl).toList(),
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
        List<ParkingDtos.ParkingLotImageResponse> images = images(parkingLot.getId());
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
                images,
                images.stream().map(ParkingDtos.ParkingLotImageResponse::imageUrl).toList(),
                parkingLot.getVersion(),
                parkingLot.getUpdatedAt()
        );
    }

    private List<ParkingDtos.ParkingLotImageResponse> images(java.util.UUID parkingLotId) {
        return imageRepository.findByParkingLotIdOrderByCreatedAtAsc(parkingLotId).stream()
                .map(image -> new ParkingDtos.ParkingLotImageResponse(
                        image.getId(),
                        "/api/v1/public/files/parking-lot-images/" + image.getId(),
                        image.getContentType(),
                        image.getFileSize()
                ))
                .toList();
    }
}
