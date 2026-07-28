package com.smartparking.administration;

import com.smartparking.account.Account;
import com.smartparking.account.AccountCredential;
import com.smartparking.account.AccountCredentialRepository;
import com.smartparking.account.AccountRepository;
import com.smartparking.account.StaffProfile;
import com.smartparking.account.StaffProfileRepository;
import com.smartparking.administration.dto.AdminDtos;
import com.smartparking.audit.AuditService;
import com.smartparking.common.AccountStatus;
import com.smartparking.common.ParkingLotStatus;
import com.smartparking.common.Role;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.parking.ParkingLot;
import com.smartparking.parking.ParkingLotMapper;
import com.smartparking.parking.ParkingLotRepository;
import com.smartparking.parking.dto.ParkingDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AdminServiceImpl implements AdminService {
    private final AccountRepository accountRepository;
    private final AccountCredentialRepository credentialRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingLotMapper parkingLotMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public AdminServiceImpl(AccountRepository accountRepository,
                            AccountCredentialRepository credentialRepository,
                            StaffProfileRepository staffProfileRepository,
                            ParkingLotRepository parkingLotRepository,
                            ParkingLotMapper parkingLotMapper,
                            PasswordEncoder passwordEncoder,
                            AuditService auditService) {
        this.accountRepository = accountRepository;
        this.credentialRepository = credentialRepository;
        this.staffProfileRepository = staffProfileRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.parkingLotMapper = parkingLotMapper;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AdminDtos.UserResponse> users(Pageable pageable) {
        return accountRepository.findAll(pageable).map(this::userResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDtos.UserResponse user(UUID userId) {
        return userResponse(accountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "User không tồn tại")));
    }

    @Override
    @Transactional
    public AdminDtos.UserResponse createStaff(CurrentUser currentUser, AdminDtos.CreateStaffRequest request) {
        Account account = new Account();
        account.setEmail(request.email());
        account.setPhone(request.phone());
        account.setRole(Role.STAFF);
        account.setStatus(AccountStatus.PENDING_APPROVAL);
        account = accountRepository.save(account);
        AccountCredential credential = new AccountCredential();
        credential.setAccount(account);
        credential.setPasswordHash(passwordEncoder.encode(request.password()));
        credentialRepository.save(credential);
        StaffProfile profile = new StaffProfile();
        profile.setAccount(account);
        profile.setFullName(request.fullName());
        staffProfileRepository.save(profile);
        auditService.record(currentUser.id(), currentUser.role(), "CREATE_STAFF", "ACCOUNT", account.getId().toString(), null, account.getStatus().name(), null);
        return userResponse(account);
    }

    @Override
    @Transactional
    public AdminDtos.UserResponse approveStaff(CurrentUser currentUser, UUID staffId) {
        Account account = account(staffId);
        if (account.getRole() != Role.STAFF || account.getStatus() != AccountStatus.PENDING_APPROVAL) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Staff không ở trạng thái PENDING_APPROVAL");
        }
        account.setStatus(AccountStatus.ACTIVE);
        auditService.record(currentUser.id(), currentUser.role(), "APPROVE_STAFF", "ACCOUNT", account.getId().toString(), AccountStatus.PENDING_APPROVAL.name(), AccountStatus.ACTIVE.name(), null);
        return userResponse(account);
    }

    @Override
    @Transactional
    public AdminDtos.UserResponse rejectStaff(CurrentUser currentUser, UUID staffId, AdminDtos.ReasonRequest request) {
        Account account = account(staffId);
        if (account.getRole() != Role.STAFF || account.getStatus() != AccountStatus.PENDING_APPROVAL) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Staff không ở trạng thái PENDING_APPROVAL");
        }
        account.setStatus(AccountStatus.REJECTED);
        auditService.record(currentUser.id(), currentUser.role(), "REJECT_STAFF", "ACCOUNT", account.getId().toString(), AccountStatus.PENDING_APPROVAL.name(), AccountStatus.REJECTED.name(), request.reason());
        return userResponse(account);
    }

    @Override
    @Transactional
    public AdminDtos.UserResponse updateUserStatus(CurrentUser currentUser, UUID userId, AdminDtos.StatusRequest request) {
        Account account = account(userId);
        assertVersion(account.getVersion(), request.expectedVersion());
        AccountStatus previous = account.getStatus();
        if (request.status() != AccountStatus.SUSPENDED) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Admin chỉ được suspend account qua command này");
        }
        if (previous != AccountStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Account chỉ được suspend từ ACTIVE");
        }
        account.setStatus(AccountStatus.SUSPENDED);
        auditService.record(currentUser.id(), currentUser.role(), "SUSPEND_ACCOUNT", "ACCOUNT", account.getId().toString(), previous.name(), account.getStatus().name(), request.reason());
        return userResponse(account);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ParkingDtos.ParkingLotResponse> pendingParkingLots(Pageable pageable) {
        return parkingLotRepository.findByStatus(ParkingLotStatus.PENDING_APPROVAL, pageable).map(parkingLotMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ParkingDtos.ParkingLotResponse parkingLot(UUID parkingLotId) {
        return parkingLotMapper.toResponse(parking(parkingLotId));
    }

    @Override
    @Transactional
    public AdminDtos.ParkingCommandResponse approveParking(CurrentUser currentUser, UUID parkingLotId) {
        return transition(currentUser, parkingLotId, ParkingLotStatus.PENDING_APPROVAL, ParkingLotStatus.ACTIVE, "APPROVE_PARKING", null);
    }

    @Override
    @Transactional
    public AdminDtos.ParkingCommandResponse rejectParking(CurrentUser currentUser, UUID parkingLotId, AdminDtos.ReasonRequest request) {
        return transition(currentUser, parkingLotId, ParkingLotStatus.PENDING_APPROVAL, ParkingLotStatus.DRAFT, "REJECT_PARKING", request.reason());
    }

    @Override
    @Transactional
    public AdminDtos.ParkingCommandResponse suspendParking(CurrentUser currentUser, UUID parkingLotId, AdminDtos.ReasonRequest request) {
        ParkingLot parkingLot = parking(parkingLotId);
        assertVersion(parkingLot.getVersion(), request.expectedVersion());
        if (parkingLot.getStatus() != ParkingLotStatus.ACTIVE && parkingLot.getStatus() != ParkingLotStatus.PAUSED) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Parking lot chỉ được suspend từ ACTIVE hoặc PAUSED");
        }
        ParkingLotStatus previous = parkingLot.getStatus();
        parkingLot.setPreviousStatus(previous);
        parkingLot.setStatus(ParkingLotStatus.SUSPENDED);
        auditService.record(currentUser.id(), currentUser.role(), "SUSPEND_PARKING", "PARKING_LOT", parkingLotId.toString(), previous.name(), parkingLot.getStatus().name(), request.reason());
        return parkingCommand(parkingLot, previous);
    }

    @Override
    @Transactional
    public AdminDtos.ParkingCommandResponse activateParking(CurrentUser currentUser, UUID parkingLotId) {
        ParkingLot parkingLot = parking(parkingLotId);
        if (parkingLot.getStatus() != ParkingLotStatus.SUSPENDED) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Parking lot không ở trạng thái SUSPENDED");
        }
        ParkingLotStatus previous = parkingLot.getStatus();
        ParkingLotStatus next = parkingLot.getPreviousStatus() == ParkingLotStatus.PAUSED ? ParkingLotStatus.PAUSED : ParkingLotStatus.ACTIVE;
        parkingLot.setStatus(next);
        parkingLot.setPreviousStatus(null);
        auditService.record(currentUser.id(), currentUser.role(), "ACTIVATE_PARKING", "PARKING_LOT", parkingLotId.toString(), previous.name(), next.name(), null);
        return parkingCommand(parkingLot, previous);
    }

    @Override
    @Transactional
    public AdminDtos.ParkingCommandResponse approveClosure(CurrentUser currentUser, UUID parkingLotId) {
        ParkingLot parkingLot = parking(parkingLotId);
        if (parkingLot.getStatus() != ParkingLotStatus.CLOSURE_REQUESTED) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Parking lot không ở trạng thái CLOSURE_REQUESTED");
        }
        ParkingLotStatus previous = parkingLot.getStatus();
        parkingLot.setStatus(ParkingLotStatus.CLOSED);
        parkingLot.setPreviousStatus(null);
        auditService.record(currentUser.id(), currentUser.role(), "APPROVE_CLOSURE", "PARKING_LOT", parkingLotId.toString(), previous.name(), ParkingLotStatus.CLOSED.name(), null);
        return parkingCommand(parkingLot, previous);
    }

    @Override
    @Transactional
    public AdminDtos.ParkingCommandResponse rejectClosure(CurrentUser currentUser, UUID parkingLotId, AdminDtos.ReasonRequest request) {
        ParkingLot parkingLot = parking(parkingLotId);
        assertVersion(parkingLot.getVersion(), request.expectedVersion());
        if (parkingLot.getStatus() != ParkingLotStatus.CLOSURE_REQUESTED) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Parking lot không ở trạng thái CLOSURE_REQUESTED");
        }
        ParkingLotStatus previous = parkingLot.getStatus();
        ParkingLotStatus restored = parkingLot.getPreviousStatus();
        if (restored != ParkingLotStatus.ACTIVE && restored != ParkingLotStatus.PAUSED) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Parking lot thiếu trạng thái trước closure");
        }
        parkingLot.setStatus(restored);
        parkingLot.setPreviousStatus(null);
        auditService.record(currentUser.id(), currentUser.role(), "REJECT_CLOSURE", "PARKING_LOT", parkingLotId.toString(), previous.name(), restored.name(), request.reason());
        return parkingCommand(parkingLot, previous);
    }

    private AdminDtos.ParkingCommandResponse transition(CurrentUser currentUser, UUID parkingLotId, ParkingLotStatus expected,
                                                        ParkingLotStatus next, String action, String reason) {
        ParkingLot parkingLot = parking(parkingLotId);
        if (parkingLot.getStatus() != expected) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Parking lot không đúng trạng thái yêu cầu");
        }
        parkingLot.setPreviousStatus(null);
        parkingLot.setStatus(next);
        auditService.record(currentUser.id(), currentUser.role(), action, "PARKING_LOT", parkingLotId.toString(), expected.name(), next.name(), reason);
        return parkingCommand(parkingLot, expected);
    }

    private Account account(UUID userId) {
        return accountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "User không tồn tại"));
    }

    private ParkingLot parking(UUID parkingLotId) {
        return parkingLotRepository.findById(parkingLotId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_NOT_FOUND, "Parking lot không tồn tại"));
    }

    private AdminDtos.UserResponse userResponse(Account account) {
        return new AdminDtos.UserResponse(account.getId(), account.getEmail(), account.getPhone(), account.getRole(), account.getStatus(),
                account.getVersion(), account.getCreatedAt(), account.getUpdatedAt());
    }

    private AdminDtos.ParkingCommandResponse parkingCommand(ParkingLot parkingLot, ParkingLotStatus previous) {
        return new AdminDtos.ParkingCommandResponse(parkingLot.getId(), previous, parkingLot.getStatus(), parkingLot.getVersion(), parkingLot.getUpdatedAt());
    }

    private void assertVersion(Long currentVersion, Long expectedVersion) {
        if (expectedVersion != null && !expectedVersion.equals(currentVersion)) {
            throw new BusinessException(ErrorCode.RESOURCE_VERSION_CONFLICT, "Version không khớp");
        }
    }
}
