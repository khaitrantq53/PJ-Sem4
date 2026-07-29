package com.smartparking.controller;

import com.smartparking.administration.AdminService;
import com.smartparking.administration.dto.AdminDtos;
import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.VehicleType;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.dto.PageResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/bookings")
public class AdminBookingController {
    private final AdminService adminService;

    public AdminBookingController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping
    PageResponse<BookingDtos.BookingListResponse> list(@RequestParam(required = false) UUID parkingLotId,
                                                       @RequestParam(required = false) BookingStatus status,
                                                       @RequestParam(required = false)
                                                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startFrom,
                                                       @RequestParam(required = false)
                                                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endTo,
                                                       @RequestParam(required = false) VehicleType vehicleType,
                                                       @RequestParam(required = false) String bookingCode,
                                                       @RequestParam(required = false) String plateNumber,
                                                       Pageable pageable) {
        AdminDtos.AdminBookingFilter filter = new AdminDtos.AdminBookingFilter(parkingLotId, status, startFrom, endTo,
                vehicleType, bookingCode, plateNumber);
        return PageResponse.of(adminService.bookings(filter, pageable), RequestContext.requestId());
    }

    @GetMapping("/{bookingId}")
    ApiResponse<BookingDtos.BookingResponse> detail(@PathVariable UUID bookingId) {
        return ApiResponse.ok(adminService.booking(bookingId), RequestContext.requestId());
    }

    @PostMapping("/{bookingId}/resolve-exception")
    ApiResponse<AdminDtos.BookingExceptionCommandResponse> resolveException(
            @PathVariable UUID bookingId,
            @Valid @RequestBody AdminDtos.ResolveBookingExceptionRequest request) {
        return ApiResponse.ok(adminService.resolveBookingException(SecurityUtils.currentUser(), bookingId, request),
                RequestContext.requestId());
    }
}
