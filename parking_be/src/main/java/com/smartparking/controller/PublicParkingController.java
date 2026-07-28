package com.smartparking.controller;

import com.smartparking.common.VehicleType;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.dto.PageResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.parking.ParkingLotService;
import com.smartparking.parking.dto.ParkingDtos;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/parking-lots")
public class PublicParkingController {
    private final ParkingLotService parkingLotService;

    public PublicParkingController(ParkingLotService parkingLotService) {
        this.parkingLotService = parkingLotService;
    }

    @GetMapping
    PageResponse<ParkingDtos.ParkingLotResponse> list(Pageable pageable) {
        return PageResponse.of(parkingLotService.publicActive(pageable), RequestContext.requestId());
    }

    @GetMapping("/{parkingLotId}")
    ApiResponse<ParkingDtos.ParkingLotResponse> detail(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(parkingLotService.publicDetail(parkingLotId), RequestContext.requestId());
    }

    @GetMapping("/{parkingLotId}/availability")
    ApiResponse<ParkingDtos.AvailabilityResponse> availability(@PathVariable UUID parkingLotId,
                                                               @RequestParam VehicleType vehicleType,
                                                               @RequestParam OffsetDateTime startTime,
                                                               @RequestParam OffsetDateTime endTime) {
        return ApiResponse.ok(parkingLotService.availability(parkingLotId, vehicleType, startTime, endTime), RequestContext.requestId());
    }
}
