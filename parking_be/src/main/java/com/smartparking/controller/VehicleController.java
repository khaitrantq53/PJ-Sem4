package com.smartparking.controller;

import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import com.smartparking.vehicle.VehicleService;
import com.smartparking.vehicle.dto.VehicleDtos;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
@RequestMapping("/api/v1/customer/vehicles")
public class VehicleController {
    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<VehicleDtos.VehicleResponse> create(@Valid @RequestBody VehicleDtos.VehicleRequest request) {
        return ApiResponse.ok(vehicleService.create(SecurityUtils.currentUser(), request), RequestContext.requestId());
    }

    @GetMapping
    ApiResponse<List<VehicleDtos.VehicleResponse>> list() {
        return ApiResponse.ok(vehicleService.list(SecurityUtils.currentUser()), RequestContext.requestId());
    }

    @GetMapping("/{vehicleId}")
    ApiResponse<VehicleDtos.VehicleResponse> get(@PathVariable UUID vehicleId) {
        return ApiResponse.ok(vehicleService.get(SecurityUtils.currentUser(), vehicleId), RequestContext.requestId());
    }

    @PutMapping("/{vehicleId}")
    ApiResponse<VehicleDtos.VehicleResponse> update(@PathVariable UUID vehicleId,
                                                    @Valid @RequestBody VehicleDtos.VehicleRequest request) {
        return ApiResponse.ok(vehicleService.update(SecurityUtils.currentUser(), vehicleId, request), RequestContext.requestId());
    }

    @PatchMapping("/{vehicleId}/default")
    ApiResponse<VehicleDtos.VehicleResponse> makeDefault(@PathVariable UUID vehicleId) {
        return ApiResponse.ok(vehicleService.makeDefault(SecurityUtils.currentUser(), vehicleId), RequestContext.requestId());
    }

    @PatchMapping("/{vehicleId}/deactivate")
    ApiResponse<VehicleDtos.VehicleResponse> deactivate(@PathVariable UUID vehicleId) {
        return ApiResponse.ok(vehicleService.deactivate(SecurityUtils.currentUser(), vehicleId), RequestContext.requestId());
    }
}
