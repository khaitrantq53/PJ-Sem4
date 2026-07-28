package com.smartparking.administration;

import com.smartparking.administration.dto.AdminDtos;
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

    AdminDtos.UserResponse updateUserStatus(CurrentUser currentUser, UUID userId, AdminDtos.StatusRequest request);

    Page<ParkingDtos.ParkingLotResponse> pendingParkingLots(Pageable pageable);

    ParkingDtos.ParkingLotResponse parkingLot(UUID parkingLotId);

    AdminDtos.ParkingCommandResponse approveParking(CurrentUser currentUser, UUID parkingLotId);

    AdminDtos.ParkingCommandResponse rejectParking(CurrentUser currentUser, UUID parkingLotId, AdminDtos.ReasonRequest request);

    AdminDtos.ParkingCommandResponse suspendParking(CurrentUser currentUser, UUID parkingLotId, AdminDtos.ReasonRequest request);

    AdminDtos.ParkingCommandResponse activateParking(CurrentUser currentUser, UUID parkingLotId);

    AdminDtos.ParkingCommandResponse approveClosure(CurrentUser currentUser, UUID parkingLotId);
}
