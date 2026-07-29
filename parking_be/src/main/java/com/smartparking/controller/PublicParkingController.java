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

import java.math.BigDecimal;
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
    PageResponse<ParkingDtos.ParkingLotListResponse> list(@RequestParam(required = false) BigDecimal latitude,
                                                          @RequestParam(required = false) BigDecimal longitude,
                                                          @RequestParam(required = false) BigDecimal maxDistanceKm,
                                                          @RequestParam(required = false) String address,
                                                          @RequestParam(required = false) VehicleType vehicleType,
                                                          @RequestParam(required = false) OffsetDateTime startTime,
                                                          @RequestParam(required = false) OffsetDateTime endTime,
                                                          @RequestParam(required = false) BigDecimal minPrice,
                                                          @RequestParam(required = false) BigDecimal maxPrice,
                                                          @RequestParam(required = false) UUID serviceId,
                                                          @RequestParam(required = false) BigDecimal minRating,
                                                          Pageable pageable) {
        ParkingDtos.ParkingLotSearchCriteria criteria = new ParkingDtos.ParkingLotSearchCriteria(
                latitude, longitude, maxDistanceKm, address, vehicleType, startTime, endTime, minPrice, maxPrice, serviceId, minRating);
        return PageResponse.of(parkingLotService.publicSearch(criteria, pageable), RequestContext.requestId());
    }

    @GetMapping("/nearby")
    PageResponse<ParkingDtos.ParkingLotListResponse> nearby(@RequestParam BigDecimal latitude,
                                                            @RequestParam BigDecimal longitude,
                                                            @RequestParam BigDecimal maxDistanceKm,
                                                            @RequestParam(required = false) VehicleType vehicleType,
                                                            @RequestParam(required = false) OffsetDateTime startTime,
                                                            @RequestParam(required = false) OffsetDateTime endTime,
                                                            Pageable pageable) {
        ParkingDtos.ParkingLotSearchCriteria criteria = new ParkingDtos.ParkingLotSearchCriteria(
                latitude, longitude, maxDistanceKm, null, vehicleType, startTime, endTime, null, null, null, null);
        return PageResponse.of(parkingLotService.publicSearch(criteria, pageable), RequestContext.requestId());
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
