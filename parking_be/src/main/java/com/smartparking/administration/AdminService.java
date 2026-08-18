package com.smartparking.administration;

import com.smartparking.administration.dto.AdminDtos;
import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.parking.dto.ParkingDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface AdminService {
    Page<AdminDtos.UserResponse> users(Pageable pageable);

    AdminDtos.UserResponse user(UUID userId);

    AdminDtos.UserResponse createStaff(CurrentUser currentUser, AdminDtos.CreateStaffRequest request);

    AdminDtos.UserResponse approveStaff(CurrentUser currentUser, UUID staffId);

    AdminDtos.UserResponse rejectStaff(CurrentUser currentUser, UUID staffId, AdminDtos.ReasonRequest request);

    Page<AdminDtos.StaffParkingLotDetailResponse> staffParkingLots(UUID staffId, Pageable pageable);

    AdminDtos.UserResponse updateUserStatus(CurrentUser currentUser, UUID userId, AdminDtos.StatusRequest request);

    Page<ParkingDtos.ParkingLotListResponse> pendingParkingLots(Pageable pageable);

    ParkingDtos.ParkingLotResponse parkingLot(UUID parkingLotId);

    AdminDtos.ParkingCommandResponse approveParking(CurrentUser currentUser, UUID parkingLotId);

    AdminDtos.ParkingCommandResponse rejectParking(CurrentUser currentUser, UUID parkingLotId, AdminDtos.ReasonRequest request);

    AdminDtos.ParkingCommandResponse suspendParking(CurrentUser currentUser, UUID parkingLotId, AdminDtos.ReasonRequest request);

    AdminDtos.ParkingCommandResponse activateParking(CurrentUser currentUser, UUID parkingLotId);

    AdminDtos.ParkingCommandResponse approveClosure(CurrentUser currentUser, UUID parkingLotId);

    AdminDtos.ParkingCommandResponse rejectClosure(CurrentUser currentUser, UUID parkingLotId, AdminDtos.ReasonRequest request);

    Page<ParkingDtos.ParkingLotUpdateRequestResponse> parkingLotUpdateRequests(Pageable pageable);

    ParkingDtos.ParkingLotUpdateRequestResponse parkingLotUpdateRequest(UUID requestId);

    ParkingDtos.ParkingLotUpdateRequestResponse approveParkingLotUpdate(CurrentUser currentUser, UUID requestId);

    ParkingDtos.ParkingLotUpdateRequestResponse rejectParkingLotUpdate(CurrentUser currentUser, UUID requestId,
                                                                       AdminDtos.ReasonRequest request);

    Page<BookingDtos.BookingListResponse> bookings(AdminDtos.AdminBookingFilter filter, Pageable pageable);

    Page<BookingDtos.BookingListResponse> customerBookings(UUID customerId, Pageable pageable);

    BookingDtos.BookingResponse booking(UUID bookingId);

    AdminDtos.BookingExceptionCommandResponse resolveBookingException(CurrentUser currentUser, UUID bookingId,
                                                                      AdminDtos.ResolveBookingExceptionRequest request);

    AdminDtos.SystemDashboardSummaryResponse dashboardSummary();
}
