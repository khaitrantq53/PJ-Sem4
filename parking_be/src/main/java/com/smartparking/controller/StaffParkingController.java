package com.smartparking.controller;

import com.smartparking.common.VehicleType;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.dto.PageResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import com.smartparking.parking.ParkingLotService;
import com.smartparking.parking.dto.ParkingDtos;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff/parking-lots")
public class StaffParkingController {
    private final ParkingLotService parkingLotService;

    public StaffParkingController(ParkingLotService parkingLotService) {
        this.parkingLotService = parkingLotService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<ParkingDtos.ParkingLotResponse> create(@Valid @RequestBody ParkingDtos.CreateParkingLotRequest request) {
        return ApiResponse.ok(parkingLotService.create(SecurityUtils.currentUser(), request), RequestContext.requestId());
    }

    @GetMapping
    PageResponse<ParkingDtos.ParkingLotResponse> list(Pageable pageable) {
        return PageResponse.of(parkingLotService.listMine(SecurityUtils.currentUser(), pageable), RequestContext.requestId());
    }

    @GetMapping("/{parkingLotId}")
    ApiResponse<ParkingDtos.ParkingLotResponse> detail(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(parkingLotService.getForStaff(SecurityUtils.currentUser(), parkingLotId), RequestContext.requestId());
    }

    @PutMapping("/{parkingLotId}")
    ApiResponse<ParkingDtos.ParkingLotResponse> update(@PathVariable UUID parkingLotId,
                                                       @Valid @RequestBody ParkingDtos.ParkingLotRequest request) {
        return ApiResponse.ok(parkingLotService.update(SecurityUtils.currentUser(), parkingLotId, request), RequestContext.requestId());
    }

    @PostMapping("/{parkingLotId}/submit-approval")
    ApiResponse<ParkingDtos.ParkingLotResponse> submitApproval(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(parkingLotService.submitApproval(SecurityUtils.currentUser(), parkingLotId), RequestContext.requestId());
    }

    @PostMapping("/{parkingLotId}/pause")
    ApiResponse<ParkingDtos.ParkingLotResponse> pause(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(parkingLotService.pause(SecurityUtils.currentUser(), parkingLotId), RequestContext.requestId());
    }

    @PostMapping("/{parkingLotId}/resume")
    ApiResponse<ParkingDtos.ParkingLotResponse> resume(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(parkingLotService.resume(SecurityUtils.currentUser(), parkingLotId), RequestContext.requestId());
    }

    @PostMapping("/{parkingLotId}/request-closure")
    ApiResponse<ParkingDtos.ParkingLotResponse> requestClosure(@PathVariable UUID parkingLotId,
                                                               @Valid @RequestBody ParkingDtos.ReasonRequest request) {
        return ApiResponse.ok(parkingLotService.requestClosure(SecurityUtils.currentUser(), parkingLotId, request.reason()), RequestContext.requestId());
    }

    @GetMapping("/{parkingLotId}/capacities")
    ApiResponse<List<ParkingDtos.CapacityResponse>> capacities(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(parkingLotService.capacities(SecurityUtils.currentUser(), parkingLotId), RequestContext.requestId());
    }

    @PutMapping("/{parkingLotId}/capacities/{vehicleType}")
    ApiResponse<ParkingDtos.CapacityResponse> updateCapacity(@PathVariable UUID parkingLotId,
                                                             @PathVariable VehicleType vehicleType,
                                                             @Valid @RequestBody ParkingDtos.CapacityRequest request) {
        return ApiResponse.ok(parkingLotService.updateCapacity(SecurityUtils.currentUser(), parkingLotId, vehicleType, request), RequestContext.requestId());
    }
}
