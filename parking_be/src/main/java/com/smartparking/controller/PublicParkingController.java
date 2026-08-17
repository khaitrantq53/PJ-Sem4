package com.smartparking.controller;

import com.smartparking.common.VehicleType;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.dto.PageResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.feedback.ReviewService;
import com.smartparking.feedback.dto.ReviewDtos;
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
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/parking-lots")
public class PublicParkingController {
    private final ParkingLotService parkingLotService;
    private final ReviewService reviewService;

    public PublicParkingController(ParkingLotService parkingLotService,
                                   ReviewService reviewService) {
        this.parkingLotService = parkingLotService;
        this.reviewService = reviewService;
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

    @GetMapping("/{parkingLotId}/capacities")
    ApiResponse<List<ParkingDtos.CapacityResponse>> capacities(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(parkingLotService.publicCapacities(parkingLotId), RequestContext.requestId());
    }

    @GetMapping("/{parkingLotId}/pricing-rules")
    ApiResponse<List<ParkingDtos.PricingRuleResponse>> pricingRules(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(parkingLotService.publicPricingRules(parkingLotId), RequestContext.requestId());
    }

    @GetMapping("/{parkingLotId}/services")
    ApiResponse<List<ParkingDtos.ParkingServiceResponse>> services(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(parkingLotService.publicServices(parkingLotId), RequestContext.requestId());
    }

    @GetMapping("/{parkingLotId}/reviews")
    PageResponse<ReviewDtos.ReviewResponse> reviews(@PathVariable UUID parkingLotId, Pageable pageable) {
        return PageResponse.of(reviewService.publicReviews(parkingLotId, pageable), RequestContext.requestId());
    }

    @GetMapping("/{parkingLotId}/availability")
    ApiResponse<ParkingDtos.AvailabilityResponse> availability(@PathVariable UUID parkingLotId,
                                                               @RequestParam VehicleType vehicleType,
                                                               @RequestParam OffsetDateTime startTime,
                                                               @RequestParam OffsetDateTime endTime) {
        return ApiResponse.ok(parkingLotService.availability(parkingLotId, vehicleType, startTime, endTime), RequestContext.requestId());
    }
}
