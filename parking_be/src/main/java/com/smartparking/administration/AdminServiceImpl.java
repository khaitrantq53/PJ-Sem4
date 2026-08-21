package com.smartparking.administration;

import com.smartparking.account.Account;
import com.smartparking.account.AccountCredential;
import com.smartparking.account.AccountCredentialRepository;
import com.smartparking.account.AccountRepository;
import com.smartparking.account.CustomerProfileRepository;
import com.smartparking.account.StaffProfile;
import com.smartparking.account.StaffProfileRepository;
import com.smartparking.administration.dto.AdminDtos;
import com.smartparking.audit.AuditService;
import com.smartparking.auth.RefreshTokenRepository;
import com.smartparking.booking.Booking;
import com.smartparking.booking.BookingCapacityReservationRepository;
import com.smartparking.booking.BookingMapper;
import com.smartparking.booking.BookingRepository;
import com.smartparking.booking.BookingStatusHistory;
import com.smartparking.booking.BookingStatusHistoryRepository;
import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.capacity.ParkingCapacityBlockRepository;
import com.smartparking.capacity.ParkingVehicleCapacity;
import com.smartparking.capacity.ParkingVehicleCapacityRepository;
import com.smartparking.common.AccountStatus;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.ParkingLotStatus;
import com.smartparking.common.RequestStatus;
import com.smartparking.common.Role;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.device.OccupancyDiscrepancyAlertRepository;
import com.smartparking.parking.ParkingLot;
import com.smartparking.parking.ParkingLotImage;
import com.smartparking.parking.ParkingLotImageRepository;
import com.smartparking.parking.ParkingLotMapper;
import com.smartparking.parking.ParkingLotRepository;
import com.smartparking.parking.ParkingLotUpdateCapacity;
import com.smartparking.parking.ParkingLotUpdateCapacityRepository;
import com.smartparking.parking.ParkingLotUpdateImage;
import com.smartparking.parking.ParkingLotUpdateImageRepository;
import com.smartparking.parking.ParkingLotUpdatePricingRule;
import com.smartparking.parking.ParkingLotUpdatePricingRuleRepository;
import com.smartparking.parking.ParkingLotUpdateRequest;
import com.smartparking.parking.ParkingLotUpdateRequestRepository;
import com.smartparking.parking.ParkingLotUpdateService;
import com.smartparking.parking.ParkingLotUpdateServiceRepository;
import com.smartparking.parking.ParkingServiceEntity;
import com.smartparking.parking.ParkingServiceRepository;
import com.smartparking.parking.ParkingStatusHistory;
import com.smartparking.parking.ParkingStatusHistoryRepository;
import com.smartparking.parking.dto.ParkingDtos;
import com.smartparking.payment.PaymentRepository;
import com.smartparking.payment.RefundRepository;
import com.smartparking.pricing.ParkingPricingRule;
import com.smartparking.pricing.ParkingPricingRuleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class AdminServiceImpl implements AdminService {
    private static final DateTimeFormatter DAY_LABEL_FORMAT = DateTimeFormatter.ofPattern("dd MMM", Locale.ENGLISH);

    private final AccountRepository accountRepository;
    private final AccountCredentialRepository credentialRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingStatusHistoryRepository parkingStatusHistoryRepository;
    private final ParkingLotMapper parkingLotMapper;
    private final ParkingVehicleCapacityRepository capacityRepository;
    private final ParkingCapacityBlockRepository blockRepository;
    private final ParkingPricingRuleRepository pricingRuleRepository;
    private final ParkingServiceRepository serviceRepository;
    private final ParkingLotUpdateRequestRepository updateRequestRepository;
    private final ParkingLotUpdateCapacityRepository updateCapacityRepository;
    private final ParkingLotUpdatePricingRuleRepository updatePricingRuleRepository;
    private final ParkingLotUpdateServiceRepository updateServiceRepository;
    private final ParkingLotUpdateImageRepository updateImageRepository;
    private final ParkingLotImageRepository parkingLotImageRepository;
    private final BookingRepository bookingRepository;
    private final BookingMapper bookingMapper;
    private final BookingStatusHistoryRepository bookingStatusHistoryRepository;
    private final BookingCapacityReservationRepository reservationRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final OccupancyDiscrepancyAlertRepository alertRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final SmartParkingProperties properties;

    public AdminServiceImpl(AccountRepository accountRepository,
                            AccountCredentialRepository credentialRepository,
                            CustomerProfileRepository customerProfileRepository,
                            StaffProfileRepository staffProfileRepository,
                            RefreshTokenRepository refreshTokenRepository,
                            ParkingLotRepository parkingLotRepository,
                            ParkingStatusHistoryRepository parkingStatusHistoryRepository,
                            ParkingLotMapper parkingLotMapper,
                            ParkingVehicleCapacityRepository capacityRepository,
                            ParkingCapacityBlockRepository blockRepository,
                            ParkingPricingRuleRepository pricingRuleRepository,
                            ParkingServiceRepository serviceRepository,
                            ParkingLotUpdateRequestRepository updateRequestRepository,
                            ParkingLotUpdateCapacityRepository updateCapacityRepository,
                            ParkingLotUpdatePricingRuleRepository updatePricingRuleRepository,
                            ParkingLotUpdateServiceRepository updateServiceRepository,
                            ParkingLotUpdateImageRepository updateImageRepository,
                            ParkingLotImageRepository parkingLotImageRepository,
                            BookingRepository bookingRepository,
                            BookingMapper bookingMapper,
                            BookingStatusHistoryRepository bookingStatusHistoryRepository,
                            BookingCapacityReservationRepository reservationRepository,
                            PaymentRepository paymentRepository,
                            RefundRepository refundRepository,
                            OccupancyDiscrepancyAlertRepository alertRepository,
                            PasswordEncoder passwordEncoder,
                            AuditService auditService,
                            SmartParkingProperties properties) {
        this.accountRepository = accountRepository;
        this.credentialRepository = credentialRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.staffProfileRepository = staffProfileRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.parkingStatusHistoryRepository = parkingStatusHistoryRepository;
        this.parkingLotMapper = parkingLotMapper;
        this.capacityRepository = capacityRepository;
        this.blockRepository = blockRepository;
        this.pricingRuleRepository = pricingRuleRepository;
        this.serviceRepository = serviceRepository;
        this.updateRequestRepository = updateRequestRepository;
        this.updateCapacityRepository = updateCapacityRepository;
        this.updatePricingRuleRepository = updatePricingRuleRepository;
        this.updateServiceRepository = updateServiceRepository;
        this.updateImageRepository = updateImageRepository;
        this.parkingLotImageRepository = parkingLotImageRepository;
        this.bookingRepository = bookingRepository;
        this.bookingMapper = bookingMapper;
        this.bookingStatusHistoryRepository = bookingStatusHistoryRepository;
        this.reservationRepository = reservationRepository;
        this.paymentRepository = paymentRepository;
        this.refundRepository = refundRepository;
        this.alertRepository = alertRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.properties = properties;
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
    @Transactional(readOnly = true)
    public Page<AdminDtos.StaffParkingLotDetailResponse> staffParkingLots(UUID staffId, Pageable pageable) {
        Account account = account(staffId);
        if (account.getRole() != Role.STAFF) {
            throw new BusinessException(ErrorCode.BOOKING_ACCESS_DENIED, "Account không phải staff");
        }
        return parkingLotRepository.findManagedByStaff(staffId, pageable).map(this::staffParkingLotDetail);
    }

    @Override
    @Transactional
    public AdminDtos.UserResponse updateUserStatus(CurrentUser currentUser, UUID userId, AdminDtos.StatusRequest request) {
        Account account = account(userId);
        assertVersion(account.getVersion(), request.expectedVersion());
        AccountStatus previous = account.getStatus();
        AccountStatus target = request.status();
        if (previous == target) {
            return userResponse(account);
        }

        String action;
        switch (target) {
            case ACTIVE -> {
                if (account.getRole() == Role.CUSTOMER && previous == AccountStatus.PENDING_APPROVAL) {
                    throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Customer phải xác thực email để kích hoạt tài khoản");
                }
                if (previous != AccountStatus.PENDING_APPROVAL
                        && previous != AccountStatus.SUSPENDED
                        && previous != AccountStatus.LOCKED) {
                    throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Account chỉ được activate từ PENDING_APPROVAL, SUSPENDED hoặc LOCKED");
                }
                action = previous == AccountStatus.PENDING_APPROVAL ? "APPROVE_ACCOUNT" : "ACTIVATE_ACCOUNT";
            }
            case SUSPENDED -> {
                if (previous != AccountStatus.ACTIVE) {
                    throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Account chỉ được suspend từ ACTIVE");
                }
                action = "SUSPEND_ACCOUNT";
            }
            case LOCKED -> {
                if (previous == AccountStatus.REJECTED) {
                    throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Account REJECTED không thể lock");
                }
                action = "LOCK_ACCOUNT";
            }
            default -> throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Trạng thái account không được hỗ trợ bởi command này");
        }

        account.setStatus(target);
        if (target != AccountStatus.ACTIVE) {
            refreshTokenRepository.revokeActiveTokensByAccountId(account.getId(), OffsetDateTime.now());
        }
        auditService.record(currentUser.id(), currentUser.role(), action, "ACCOUNT", account.getId().toString(), previous.name(), account.getStatus().name(), request.reason());
        return userResponse(account);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ParkingDtos.ParkingLotListResponse> pendingParkingLots(Pageable pageable) {
        return parkingLotRepository.findByStatus(ParkingLotStatus.PENDING_APPROVAL, pageable).map(parkingLotMapper::toListResponse);
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
        ParkingLotStatus targetStatus = adminRejectParkingTargetStatus();
        if (targetStatus != ParkingLotStatus.DRAFT) {
            throw new BusinessException(ErrorCode.BUSINESS_DECISION_REQUIRED, "Parking lot reject target status chưa được hỗ trợ bởi schema hiện tại");
        }
        return transition(currentUser, parkingLotId, ParkingLotStatus.PENDING_APPROVAL, targetStatus, "REJECT_PARKING", request.reason());
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
        parkingHistory(parkingLot, previous, ParkingLotStatus.SUSPENDED, currentUser, request.reason());
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
        ParkingLotStatus next = parkingLot.getPreviousStatus();
        if (next != ParkingLotStatus.ACTIVE && next != ParkingLotStatus.PAUSED) {
            throw new BusinessException(ErrorCode.BUSINESS_DECISION_REQUIRED, "Parking SUSPENDED thiếu trạng thái trước đó để activate");
        }
        parkingLot.setStatus(next);
        parkingLot.setPreviousStatus(null);
        parkingHistory(parkingLot, previous, next, currentUser, null);
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
        parkingHistory(parkingLot, previous, ParkingLotStatus.CLOSED, currentUser, null);
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
        parkingHistory(parkingLot, previous, restored, currentUser, request.reason());
        auditService.record(currentUser.id(), currentUser.role(), "REJECT_CLOSURE", "PARKING_LOT", parkingLotId.toString(), previous.name(), restored.name(), request.reason());
        return parkingCommand(parkingLot, previous);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ParkingDtos.ParkingLotUpdateRequestResponse> parkingLotUpdateRequests(Pageable pageable) {
        return updateRequestRepository.findByStatus(RequestStatus.PENDING, pageable).map(this::updateRequestResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ParkingDtos.ParkingLotUpdateRequestResponse parkingLotUpdateRequest(UUID requestId) {
        return updateRequestResponse(updateRequest(requestId));
    }

    @Override
    @Transactional
    public ParkingDtos.ParkingLotUpdateRequestResponse approveParkingLotUpdate(CurrentUser currentUser, UUID requestId) {
        Account admin = account(currentUser.id());
        ParkingLotUpdateRequest request = updateRequest(requestId);
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Bản chỉnh sửa không ở trạng thái PENDING");
        }
        ParkingLot parkingLot = request.getParkingLot();
        assertVersion(parkingLot.getVersion(), request.getExpectedVersion());

        parkingLot.setName(request.getName());
        parkingLot.setAddress(request.getAddress());
        parkingLot.setLatitude(request.getLatitude());
        parkingLot.setLongitude(request.getLongitude());
        parkingLot.setDescription(request.getDescription());

        ParkingLotStatus previousStatus = parkingLot.getStatus();
        if (previousStatus == ParkingLotStatus.PENDING_APPROVAL) {
            parkingLot.setStatus(ParkingLotStatus.ACTIVE);
            parkingHistory(parkingLot, previousStatus, ParkingLotStatus.ACTIVE, currentUser, "Approved initial parking lot details");
        }

        UUID parkingLotId = parkingLot.getId();
        List<ParkingLotUpdateCapacity> capacities = updateCapacityRepository.findByRequestId(requestId);
        for (ParkingLotUpdateCapacity capacityRequest : capacities) {
            applyCapacityUpdate(parkingLot, capacityRequest);
        }
        updatePricingRuleRepository.findByRequestId(requestId).forEach(ruleRequest -> applyPricingRuleUpdate(parkingLot, ruleRequest));
        updateServiceRepository.findByRequestId(requestId).forEach(serviceRequest -> applyServiceUpdate(parkingLot, serviceRequest));
        applyImageUpdate(parkingLot, updateImageRepository.findByRequestIdOrderByCreatedAtAsc(requestId));

        request.setStatus(RequestStatus.APPROVED);
        request.setDecidedBy(admin);
        request.setDecidedAt(OffsetDateTime.now());
        request.setDecisionReason(null);
        auditService.record(currentUser.id(), currentUser.role(), "APPROVE_PARKING_UPDATE", "PARKING_LOT",
                parkingLotId.toString(), requestId.toString(), parkingLot.getStatus().name(), null);
        return updateRequestResponse(request);
    }

    @Override
    @Transactional
    public ParkingDtos.ParkingLotUpdateRequestResponse rejectParkingLotUpdate(CurrentUser currentUser, UUID requestId,
                                                                              AdminDtos.ReasonRequest reasonRequest) {
        Account admin = account(currentUser.id());
        ParkingLotUpdateRequest request = updateRequest(requestId);
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Bản chỉnh sửa không ở trạng thái PENDING");
        }
        request.setStatus(RequestStatus.REJECTED);
        request.setDecidedBy(admin);
        request.setDecidedAt(OffsetDateTime.now());
        request.setDecisionReason(reasonRequest.reason());
        auditService.record(currentUser.id(), currentUser.role(), "REJECT_PARKING_UPDATE", "PARKING_LOT",
                request.getParkingLot().getId().toString(), requestId.toString(), RequestStatus.REJECTED.name(), reasonRequest.reason());
        return updateRequestResponse(request);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingDtos.BookingListResponse> bookings(AdminDtos.AdminBookingFilter filter, Pageable pageable) {
        return bookingRepository.findAll(adminBookingSpecification(filter), pageable)
                .map(bookingMapper::toListResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingDtos.BookingListResponse> customerBookings(UUID customerId, Pageable pageable) {
        Account customer = accountRepository.findById(customerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Customer không tồn tại"));
        if (customer.getRole() != Role.CUSTOMER) {
            throw new BusinessException(ErrorCode.BOOKING_ACCESS_DENIED, "Account không phải customer");
        }
        return bookingRepository.findByCustomerId(customerId, pageable).map(bookingMapper::toListResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingDtos.BookingResponse booking(UUID bookingId) {
        return bookingMapper.toResponse(getBooking(bookingId));
    }

    @Override
    @Transactional
    public AdminDtos.BookingExceptionCommandResponse resolveBookingException(CurrentUser currentUser, UUID bookingId,
                                                                             AdminDtos.ResolveBookingExceptionRequest request) {
        Booking booking = getBooking(bookingId);
        assertVersion(booking.getVersion(), request.expectedVersion());
        BookingStatus previous = booking.getStatus();
        OffsetDateTime now = OffsetDateTime.now();
        switch (request.action()) {
            case EXPIRE_PENDING_APPROVAL -> expirePendingApproval(booking, now);
            case EXPIRE_PENDING_PAYMENT -> expirePendingPayment(booking, now);
            case MARK_NO_SHOW -> markNoShow(booking, now);
            case RELEASE_RESERVATION -> releaseTerminalReservation(booking);
        }
        if (booking.getStatus() != previous) {
            bookingHistory(booking, previous, booking.getStatus(), currentUser, request.reason());
        }
        auditService.record(currentUser.id(), currentUser.role(), "RESOLVE_BOOKING_EXCEPTION_" + request.action().name(),
                "BOOKING", bookingId.toString(), previous.name(), booking.getStatus().name(), request.reason());
        return new AdminDtos.BookingExceptionCommandResponse(booking.getId(), previous, booking.getStatus(),
                booking.getVersion(), booking.getUpdatedAt());
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDtos.SystemDashboardSummaryResponse dashboardSummary() {
        ZoneId zoneId = ZoneId.systemDefault();
        OffsetDateTime startOfDay = LocalDate.now(zoneId).atStartOfDay(zoneId).toOffsetDateTime();
        OffsetDateTime nextDay = startOfDay.plusDays(1);
        long accountPendingApprovals = accountRepository.countByStatus(AccountStatus.PENDING_APPROVAL);
        long parkingPendingApprovals = parkingLotRepository.countByStatus(ParkingLotStatus.PENDING_APPROVAL);
        return new AdminDtos.SystemDashboardSummaryResponse(
                accountRepository.count(),
                accountRepository.countByRoleAndStatus(Role.CUSTOMER, AccountStatus.ACTIVE),
                accountRepository.countByRoleAndStatus(Role.STAFF, AccountStatus.ACTIVE),
                parkingLotRepository.countByStatus(ParkingLotStatus.ACTIVE),
                accountPendingApprovals + parkingPendingApprovals,
                bookingRepository.countTodayAll(startOfDay, nextDay),
                paymentRepository.revenueTodayAll(startOfDay, nextDay),
                refundRepository.refundTodayAll(startOfDay, nextDay),
                accountRepository.countByStatus(AccountStatus.SUSPENDED),
                parkingLotRepository.countByStatus(ParkingLotStatus.SUSPENDED),
                alertRepository.count()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDtos.PerformanceResponse dashboardPerformance(String metric, String range) {
        String normalizedMetric = normalizePerformanceMetric(metric);
        String normalizedRange = normalizePerformanceRange(range);
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime todayStart = now.toLocalDate().atStartOfDay().atOffset(now.getOffset());
        List<AdminDtos.PerformanceBucketResponse> buckets = new ArrayList<>();

        if ("today".equals(normalizedRange)) {
            for (int hour = 0; hour < 24; hour += 4) {
                OffsetDateTime startTime = todayStart.plusHours(hour);
                OffsetDateTime endTime = startTime.plusHours(4);
                String label = "%02d-%02d".formatted(hour, Math.min(hour + 3, 23));
                buckets.add(new AdminDtos.PerformanceBucketResponse(
                        label,
                        startTime,
                        endTime,
                        adminPerformanceValue(normalizedMetric, startTime, endTime)
                ));
            }
        } else {
            int days = Integer.parseInt(normalizedRange);
            OffsetDateTime firstDay = todayStart.minusDays(days - 1L);
            for (int index = 0; index < days; index++) {
                OffsetDateTime startTime = firstDay.plusDays(index);
                OffsetDateTime endTime = startTime.plusDays(1);
                buckets.add(new AdminDtos.PerformanceBucketResponse(
                        startTime.format(DAY_LABEL_FORMAT),
                        startTime,
                        endTime,
                        adminPerformanceValue(normalizedMetric, startTime, endTime)
                ));
            }
        }

        return new AdminDtos.PerformanceResponse(normalizedMetric, normalizedRange, properties.pricing().currency(), buckets);
    }

    private String normalizePerformanceMetric(String metric) {
        String normalized = metric == null ? "bookings" : metric.trim().toLowerCase(Locale.ROOT);
        return "revenue".equals(normalized) ? "revenue" : "bookings";
    }

    private String normalizePerformanceRange(String range) {
        String normalized = range == null ? "today" : range.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "7", "30" -> normalized;
            default -> "today";
        };
    }

    private BigDecimal adminPerformanceValue(String metric, OffsetDateTime startTime, OffsetDateTime endTime) {
        if ("revenue".equals(metric)) {
            return paymentRepository.revenueAllBetween(startTime, endTime);
        }

        return BigDecimal.valueOf(bookingRepository.countAllBetween(startTime, endTime));
    }

    private AdminDtos.ParkingCommandResponse transition(CurrentUser currentUser, UUID parkingLotId, ParkingLotStatus expected,
                                                        ParkingLotStatus next, String action, String reason) {
        ParkingLot parkingLot = parking(parkingLotId);
        if (parkingLot.getStatus() != expected) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Parking lot không đúng trạng thái yêu cầu");
        }
        parkingLot.setPreviousStatus(null);
        parkingLot.setStatus(next);
        parkingHistory(parkingLot, expected, next, currentUser, reason);
        auditService.record(currentUser.id(), currentUser.role(), action, "PARKING_LOT", parkingLotId.toString(), expected.name(), next.name(), reason);
        return parkingCommand(parkingLot, expected);
    }

    private void expirePendingApproval(Booking booking, OffsetDateTime now) {
        if (booking.getStatus() != BookingStatus.PENDING_APPROVAL
                || booking.getApprovalExpiresAt() == null
                || booking.getApprovalExpiresAt().isAfter(now)) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Booking không đủ điều kiện hết hạn duyệt");
        }
        booking.setStatus(BookingStatus.EXPIRED);
        releaseReservation(booking);
    }

    private void expirePendingPayment(Booking booking, OffsetDateTime now) {
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT
                || booking.getHoldExpiresAt() == null
                || booking.getHoldExpiresAt().isAfter(now)) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Booking không đủ điều kiện hết hạn thanh toán");
        }
        booking.setStatus(BookingStatus.EXPIRED);
        releaseReservation(booking);
    }

    private void markNoShow(Booking booking, OffsetDateTime now) {
        if (booking.getStatus() != BookingStatus.CONFIRMED || booking.getStartTime().isAfter(now)) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Booking không đủ điều kiện no-show");
        }
        booking.setStatus(BookingStatus.NO_SHOW);
        releaseReservation(booking);
    }

    private void releaseTerminalReservation(Booking booking) {
        if (booking.getStatus() != BookingStatus.CANCELLED
                && booking.getStatus() != BookingStatus.DECLINED
                && booking.getStatus() != BookingStatus.EXPIRED
                && booking.getStatus() != BookingStatus.CHECKED_OUT
                && booking.getStatus() != BookingStatus.NO_SHOW) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Chỉ release reservation cho booking đã kết thúc");
        }
        releaseReservation(booking);
    }

    private void releaseReservation(Booking booking) {
        reservationRepository.findByBookingIdAndReleasedFalse(booking.getId())
                .ifPresentOrElse(reservation -> reservation.setReleased(true), () -> {
                    throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Capacity reservation không tồn tại hoặc đã release");
                });
    }

    private void bookingHistory(Booking booking, BookingStatus previous, BookingStatus current, CurrentUser user, String reason) {
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(booking);
        history.setPreviousStatus(previous);
        history.setCurrentStatus(current);
        history.setActorId(user.id());
        history.setActorRole(user.role());
        history.setReason(reason);
        bookingStatusHistoryRepository.save(history);
    }

    private void parkingHistory(ParkingLot parkingLot, ParkingLotStatus previous, ParkingLotStatus current, CurrentUser user, String reason) {
        ParkingStatusHistory history = new ParkingStatusHistory();
        history.setParkingLot(parkingLot);
        history.setPreviousStatus(previous);
        history.setCurrentStatus(current);
        history.setActorId(user.id());
        history.setActorRole(user.role());
        history.setReason(reason);
        parkingStatusHistoryRepository.save(history);
    }

    private Account account(UUID userId) {
        return accountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "User không tồn tại"));
    }

    private ParkingLot parking(UUID parkingLotId) {
        return parkingLotRepository.findById(parkingLotId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_NOT_FOUND, "Parking lot không tồn tại"));
    }

    private ParkingLotUpdateRequest updateRequest(UUID requestId) {
        return updateRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "Bản chỉnh sửa bãi đỗ không tồn tại"));
    }

    private void applyCapacityUpdate(ParkingLot parkingLot, ParkingLotUpdateCapacity request) {
        UUID parkingLotId = parkingLot.getId();
        OffsetDateTime from = OffsetDateTime.now().minusYears(100);
        OffsetDateTime to = OffsetDateTime.now().plusYears(100);
        long reserved = bookingRepository.countActiveReservations(parkingLotId, request.getVehicleType(),
                List.of(BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN), from, to);
        long blocked = blockRepository.countBlocked(parkingLotId, request.getVehicleType(), from, to);
        if (request.getTotalCapacity() < reserved + blocked) {
            throw new BusinessException(ErrorCode.PARKING_CAPACITY_INVALID, "Không được giảm total dưới số slot đang được giữ/chặn");
        }
        ParkingVehicleCapacity capacity = capacityRepository.findByParkingLotIdAndVehicleType(parkingLotId, request.getVehicleType())
                .orElseGet(() -> {
                    ParkingVehicleCapacity created = new ParkingVehicleCapacity();
                    created.setParkingLot(parkingLot);
                    created.setVehicleType(request.getVehicleType());
                    return created;
                });
        capacity.setTotalCapacity(request.getTotalCapacity());
        capacityRepository.save(capacity);
    }

    private void applyPricingRuleUpdate(ParkingLot parkingLot, ParkingLotUpdatePricingRule request) {
        ParkingPricingRule rule = pricingRuleRepository
                .findByParkingLotIdAndVehicleTypeAndStartTimeAndEndTime(parkingLot.getId(), request.getVehicleType(),
                        request.getStartTime(), request.getEndTime())
                .orElseGet(() -> {
                    ParkingPricingRule created = new ParkingPricingRule();
                    created.setParkingLot(parkingLot);
                    created.setVehicleType(request.getVehicleType());
                    return created;
                });
        rule.setHourlyRate(request.getHourlyRate());
        rule.setStartTime(request.getStartTime());
        rule.setEndTime(request.getEndTime());
        rule.setActive(request.isActive());
        pricingRuleRepository.save(rule);
    }

    private void applyServiceUpdate(ParkingLot parkingLot, ParkingLotUpdateService request) {
        ParkingServiceEntity service = serviceRepository.findByParkingLotIdAndNameIgnoreCase(parkingLot.getId(), request.getName().trim())
                .orElseGet(() -> {
                    ParkingServiceEntity created = new ParkingServiceEntity();
                    created.setParkingLot(parkingLot);
                    return created;
                });
        service.setName(request.getName().trim());
        service.setPrice(request.getPrice());
        service.setActive(request.isActive());
        serviceRepository.save(service);
    }

    private void applyImageUpdate(ParkingLot parkingLot, List<ParkingLotUpdateImage> images) {
        if (images.isEmpty()) {
            return;
        }
        parkingLotImageRepository.deleteByParkingLotId(parkingLot.getId());
        images.forEach(requestImage -> {
            ParkingLotImage image = new ParkingLotImage();
            image.setParkingLot(parkingLot);
            image.setBucket(requestImage.getBucket());
            image.setObjectKey(requestImage.getObjectKey());
            image.setContentType(requestImage.getContentType());
            image.setFileSize(requestImage.getFileSize());
            image.setChecksum(requestImage.getChecksum());
            parkingLotImageRepository.save(image);
        });
    }

    private Booking getBooking(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Booking không tồn tại"));
    }

    private AdminDtos.UserResponse userResponse(Account account) {
        return new AdminDtos.UserResponse(account.getId(), account.getEmail(), account.getPhone(), accountFullName(account), account.getRole(), account.getStatus(),
                account.getVersion(), account.getCreatedAt(), account.getUpdatedAt());
    }

    private String accountFullName(Account account) {
        if (account.getRole() == Role.CUSTOMER) {
            return customerProfileRepository.findByAccountId(account.getId())
                    .map(profile -> profile.getFullName())
                    .orElse(null);
        }
        if (account.getRole() == Role.STAFF) {
            return staffProfileRepository.findByAccountId(account.getId())
                    .map(profile -> profile.getFullName())
                    .orElse(null);
        }
        return null;
    }

    private AdminDtos.ParkingCommandResponse parkingCommand(ParkingLot parkingLot, ParkingLotStatus previous) {
        return new AdminDtos.ParkingCommandResponse(parkingLot.getId(), previous, parkingLot.getStatus(), parkingLot.getVersion(), parkingLot.getUpdatedAt());
    }

    private AdminDtos.StaffParkingLotDetailResponse staffParkingLotDetail(ParkingLot parkingLot) {
        UUID parkingLotId = parkingLot.getId();
        return new AdminDtos.StaffParkingLotDetailResponse(
                parkingLotMapper.toResponse(parkingLot, pricingRuleRepository.findLowestActiveHourlyRate(parkingLotId).orElse(null)),
                capacityRepository.findByParkingLotId(parkingLotId).stream()
                        .map(this::capacityResponse)
                        .toList(),
                pricingRuleRepository.findByParkingLotId(parkingLotId).stream()
                        .map(this::pricingRuleResponse)
                        .toList(),
                serviceRepository.findByParkingLotId(parkingLotId).stream()
                        .map(this::serviceResponse)
                        .toList()
        );
    }

    private ParkingDtos.CapacityResponse capacityResponse(ParkingVehicleCapacity capacity) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime distantFuture = now.plusYears(100);
        UUID parkingLotId = capacity.getParkingLot().getId();
        long reserved = bookingRepository.countActiveReservations(parkingLotId, capacity.getVehicleType(),
                List.of(BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED), now, distantFuture);
        long checkedIn = bookingRepository.countCurrentCheckedInCapacity(parkingLotId, capacity.getVehicleType(),
                List.of(BookingStatus.CHECKED_IN));
        long blocked = blockRepository.countBlocked(parkingLotId, capacity.getVehicleType(), now, distantFuture);
        long available = Math.max(0, capacity.getTotalCapacity() - reserved - checkedIn - blocked);
        return new ParkingDtos.CapacityResponse(parkingLotId, capacity.getVehicleType(), capacity.getTotalCapacity(),
                reserved, blocked, checkedIn, available, capacity.getVersion());
    }

    private ParkingDtos.PricingRuleResponse pricingRuleResponse(ParkingPricingRule rule) {
        return new ParkingDtos.PricingRuleResponse(rule.getId(), rule.getParkingLot().getId(), rule.getVehicleType(),
                rule.getHourlyRate(), rule.getStartTime(), rule.getEndTime(), rule.isActive(),
                rule.getVersion(), rule.getCreatedAt(), rule.getUpdatedAt());
    }

    private ParkingDtos.ParkingServiceResponse serviceResponse(ParkingServiceEntity service) {
        return new ParkingDtos.ParkingServiceResponse(service.getId(), service.getParkingLot().getId(), service.getName(),
                service.getPrice(), service.isActive(), service.getVersion(), service.getCreatedAt(), service.getUpdatedAt());
    }

    private ParkingDtos.ParkingLotUpdateRequestResponse updateRequestResponse(ParkingLotUpdateRequest request) {
        UUID requestId = request.getId();
        return new ParkingDtos.ParkingLotUpdateRequestResponse(
                request.getId(),
                request.getParkingLot().getId(),
                request.getParkingLot().getName(),
                request.getRequestedBy().getId(),
                accountFullName(request.getRequestedBy()),
                request.getRequestedBy().getEmail(),
                request.getStatus(),
                request.getName(),
                request.getAddress(),
                request.getLatitude(),
                request.getLongitude(),
                request.getDescription(),
                request.getExpectedVersion(),
                request.getDecisionReason(),
                request.getVersion(),
                request.getCreatedAt(),
                request.getUpdatedAt(),
                updateCapacityRepository.findByRequestId(requestId).stream()
                        .map(capacity -> new ParkingDtos.CapacityDraftResponse(capacity.getId(), capacity.getVehicleType(), capacity.getTotalCapacity()))
                        .toList(),
                updatePricingRuleRepository.findByRequestId(requestId).stream()
                        .map(rule -> new ParkingDtos.PricingRuleDraftResponse(rule.getId(), rule.getVehicleType(),
                                rule.getHourlyRate(), rule.getStartTime(), rule.getEndTime(), rule.isActive()))
                        .toList(),
                updateServiceRepository.findByRequestId(requestId).stream()
                        .map(service -> new ParkingDtos.ParkingServiceDraftResponse(service.getId(), service.getName(),
                                service.getPrice(), service.isActive()))
                        .toList(),
                updateImageRepository.findByRequestIdOrderByCreatedAtAsc(requestId).stream()
                        .map(this::updateImageResponse)
                        .toList()
        );
    }

    private ParkingDtos.ParkingLotUpdateImageResponse updateImageResponse(ParkingLotUpdateImage image) {
        return new ParkingDtos.ParkingLotUpdateImageResponse(
                image.getId(),
                "/api/v1/public/files/parking-lot-update-images/" + image.getId(),
                image.getContentType(),
                image.getFileSize()
        );
    }

    private void assertVersion(Long currentVersion, Long expectedVersion) {
        if (expectedVersion != null && !expectedVersion.equals(currentVersion)) {
            throw new BusinessException(ErrorCode.RESOURCE_VERSION_CONFLICT, "Version không khớp");
        }
    }

    private ParkingLotStatus adminRejectParkingTargetStatus() {
        if (properties.businessDecisions() == null
                || properties.businessDecisions().adminRejectParkingTargetStatus() == null) {
            throw new BusinessException(ErrorCode.BUSINESS_DECISION_REQUIRED, "Admin reject parking target status chưa được chốt");
        }
        return properties.businessDecisions().adminRejectParkingTargetStatus();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private Specification<Booking> adminBookingSpecification(AdminDtos.AdminBookingFilter filter) {
        return (root, query, builder) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
            if (filter.parkingLotId() != null) {
                predicates.add(builder.equal(root.get("parkingLot").get("id"), filter.parkingLotId()));
            }
            if (filter.status() != null) {
                predicates.add(builder.equal(root.get("status"), filter.status()));
            }
            if (filter.startFrom() != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("startTime"), filter.startFrom()));
            }
            if (filter.endTo() != null) {
                predicates.add(builder.lessThanOrEqualTo(root.get("endTime"), filter.endTo()));
            }
            if (filter.createdFrom() != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("createdAt"), filter.createdFrom()));
            }
            if (filter.createdTo() != null) {
                predicates.add(builder.lessThan(root.get("createdAt"), filter.createdTo()));
            }
            if (filter.vehicleType() != null) {
                predicates.add(builder.equal(root.get("vehicleType"), filter.vehicleType()));
            }

            String bookingCode = blankToNull(filter.bookingCode());
            if (bookingCode != null) {
                predicates.add(builder.like(builder.lower(root.get("bookingCode")), "%" + bookingCode.toLowerCase() + "%"));
            }

            String plateNumber = blankToNull(filter.plateNumber());
            if (plateNumber != null) {
                predicates.add(builder.like(builder.lower(root.get("vehicle").get("plateNumber")), "%" + plateNumber.toLowerCase() + "%"));
            }

            return builder.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}
