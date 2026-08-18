package com.smartparking.controller;

import com.smartparking.administration.AdminService;
import com.smartparking.administration.dto.AdminDtos;
import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.dto.PageResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import com.smartparking.parking.dto.ParkingDtos;
import com.smartparking.vehicle.VehicleService;
import com.smartparking.vehicle.dto.VehicleDtos;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    private final AdminService adminService;
    private final VehicleService vehicleService;

    public AdminController(AdminService adminService, VehicleService vehicleService) {
        this.adminService = adminService;
        this.vehicleService = vehicleService;
    }

    @GetMapping("/users")
    PageResponse<AdminDtos.UserResponse> users(Pageable pageable) {
        return PageResponse.of(adminService.users(pageable), RequestContext.requestId());
    }

    @GetMapping("/users/{userId}")
    ApiResponse<AdminDtos.UserResponse> user(@PathVariable UUID userId) {
        return ApiResponse.ok(adminService.user(userId), RequestContext.requestId());
    }

    @PatchMapping("/users/{userId}/status")
    ApiResponse<AdminDtos.UserResponse> status(@PathVariable UUID userId,
                                               @Valid @RequestBody AdminDtos.StatusRequest request) {
        return ApiResponse.ok(adminService.updateUserStatus(SecurityUtils.currentUser(), userId, request), RequestContext.requestId());
    }

    @GetMapping("/users/{userId}/vehicles")
    ApiResponse<List<VehicleDtos.VehicleResponse>> userVehicles(@PathVariable UUID userId) {
        return ApiResponse.ok(vehicleService.listByCustomerForAdmin(userId), RequestContext.requestId());
    }

    @GetMapping("/users/{userId}/bookings")
    PageResponse<BookingDtos.BookingListResponse> userBookings(@PathVariable UUID userId, Pageable pageable) {
        return PageResponse.of(adminService.customerBookings(userId, pageable), RequestContext.requestId());
    }

    @PostMapping("/staff")
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<AdminDtos.UserResponse> createStaff(@Valid @RequestBody AdminDtos.CreateStaffRequest request) {
        return ApiResponse.ok(adminService.createStaff(SecurityUtils.currentUser(), request), RequestContext.requestId());
    }

    @PostMapping("/staff/{staffId}/approve")
    ApiResponse<AdminDtos.UserResponse> approveStaff(@PathVariable UUID staffId) {
        return ApiResponse.ok(adminService.approveStaff(SecurityUtils.currentUser(), staffId), RequestContext.requestId());
    }

    @PostMapping("/staff/{staffId}/reject")
    ApiResponse<AdminDtos.UserResponse> rejectStaff(@PathVariable UUID staffId,
                                                    @Valid @RequestBody AdminDtos.ReasonRequest request) {
        return ApiResponse.ok(adminService.rejectStaff(SecurityUtils.currentUser(), staffId, request), RequestContext.requestId());
    }

    @GetMapping("/staff/{staffId}/parking-lots")
    PageResponse<AdminDtos.StaffParkingLotDetailResponse> staffParkingLots(@PathVariable UUID staffId, Pageable pageable) {
        return PageResponse.of(adminService.staffParkingLots(staffId, pageable), RequestContext.requestId());
    }

    @GetMapping("/parking-lots/pending")
    PageResponse<ParkingDtos.ParkingLotListResponse> pendingParking(Pageable pageable) {
        return PageResponse.of(adminService.pendingParkingLots(pageable), RequestContext.requestId());
    }

    @GetMapping("/parking-lots/update-requests")
    PageResponse<ParkingDtos.ParkingLotUpdateRequestResponse> parkingUpdateRequests(Pageable pageable) {
        return PageResponse.of(adminService.parkingLotUpdateRequests(pageable), RequestContext.requestId());
    }

    @GetMapping("/parking-lots/update-requests/{requestId}")
    ApiResponse<ParkingDtos.ParkingLotUpdateRequestResponse> parkingUpdateRequest(@PathVariable UUID requestId) {
        return ApiResponse.ok(adminService.parkingLotUpdateRequest(requestId), RequestContext.requestId());
    }

    @PostMapping("/parking-lots/update-requests/{requestId}/approve")
    ApiResponse<ParkingDtos.ParkingLotUpdateRequestResponse> approveParkingUpdate(@PathVariable UUID requestId) {
        return ApiResponse.ok(adminService.approveParkingLotUpdate(SecurityUtils.currentUser(), requestId), RequestContext.requestId());
    }

    @PostMapping("/parking-lots/update-requests/{requestId}/reject")
    ApiResponse<ParkingDtos.ParkingLotUpdateRequestResponse> rejectParkingUpdate(@PathVariable UUID requestId,
                                                                                 @Valid @RequestBody AdminDtos.ReasonRequest request) {
        return ApiResponse.ok(adminService.rejectParkingLotUpdate(SecurityUtils.currentUser(), requestId, request), RequestContext.requestId());
    }

    @GetMapping("/parking-lots/{parkingLotId}")
    ApiResponse<ParkingDtos.ParkingLotResponse> parking(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(adminService.parkingLot(parkingLotId), RequestContext.requestId());
    }

    @PostMapping("/parking-lots/{parkingLotId}/approve")
    ApiResponse<AdminDtos.ParkingCommandResponse> approveParking(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(adminService.approveParking(SecurityUtils.currentUser(), parkingLotId), RequestContext.requestId());
    }

    @PostMapping("/parking-lots/{parkingLotId}/reject")
    ApiResponse<AdminDtos.ParkingCommandResponse> rejectParking(@PathVariable UUID parkingLotId,
                                                               @Valid @RequestBody AdminDtos.ReasonRequest request) {
        return ApiResponse.ok(adminService.rejectParking(SecurityUtils.currentUser(), parkingLotId, request), RequestContext.requestId());
    }

    @PostMapping("/parking-lots/{parkingLotId}/suspend")
    ApiResponse<AdminDtos.ParkingCommandResponse> suspendParking(@PathVariable UUID parkingLotId,
                                                                @Valid @RequestBody AdminDtos.ReasonRequest request) {
        return ApiResponse.ok(adminService.suspendParking(SecurityUtils.currentUser(), parkingLotId, request), RequestContext.requestId());
    }

    @PostMapping("/parking-lots/{parkingLotId}/activate")
    ApiResponse<AdminDtos.ParkingCommandResponse> activateParking(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(adminService.activateParking(SecurityUtils.currentUser(), parkingLotId), RequestContext.requestId());
    }

    @PostMapping("/parking-lots/{parkingLotId}/approve-closure")
    ApiResponse<AdminDtos.ParkingCommandResponse> approveClosure(@PathVariable UUID parkingLotId) {
        return ApiResponse.ok(adminService.approveClosure(SecurityUtils.currentUser(), parkingLotId), RequestContext.requestId());
    }

    @PostMapping("/parking-lots/{parkingLotId}/reject-closure")
    ApiResponse<AdminDtos.ParkingCommandResponse> rejectClosure(@PathVariable UUID parkingLotId,
                                                               @Valid @RequestBody AdminDtos.ReasonRequest request) {
        return ApiResponse.ok(adminService.rejectClosure(SecurityUtils.currentUser(), parkingLotId, request), RequestContext.requestId());
    }
}
