package com.smartparking.booking;

import com.smartparking.audit.AuditService;
import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.capacity.ParkingCapacityBlockRepository;
import com.smartparking.capacity.ParkingVehicleCapacity;
import com.smartparking.capacity.ParkingVehicleCapacityRepository;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.PaymentMethod;
import com.smartparking.common.PaymentStatus;
import com.smartparking.common.ParkingLotStatus;
import com.smartparking.common.RecordType;
import com.smartparking.common.VehicleStatus;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.parking.ParkingLot;
import com.smartparking.parking.ParkingLotRepository;
import com.smartparking.parking.ParkingLotStaffRepository;
import com.smartparking.pricing.PricingService;
import com.smartparking.vehicle.Vehicle;
import com.smartparking.vehicle.VehicleRepository;
import com.smartparking.vehiclecondition.VehicleConditionRecord;
import com.smartparking.vehiclecondition.VehicleConditionRecordRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class BookingServiceImpl implements BookingService {
    private final BookingRepository bookingRepository;
    private final BookingCapacityReservationRepository reservationRepository;
    private final BookingStatusHistoryRepository historyRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingLotStaffRepository staffRepository;
    private final ParkingVehicleCapacityRepository capacityRepository;
    private final ParkingCapacityBlockRepository blockRepository;
    private final PricingService pricingService;
    private final BookingMapper mapper;
    private final AuditService auditService;
    private final VehicleConditionRecordRepository conditionRecordRepository;
    private final SmartParkingProperties properties;

    public BookingServiceImpl(BookingRepository bookingRepository,
                              BookingCapacityReservationRepository reservationRepository,
                              BookingStatusHistoryRepository historyRepository,
                              VehicleRepository vehicleRepository,
                              ParkingLotRepository parkingLotRepository,
                              ParkingLotStaffRepository staffRepository,
                              ParkingVehicleCapacityRepository capacityRepository,
                              ParkingCapacityBlockRepository blockRepository,
                              PricingService pricingService,
                              BookingMapper mapper,
                              AuditService auditService,
                              VehicleConditionRecordRepository conditionRecordRepository,
                              SmartParkingProperties properties) {
        this.bookingRepository = bookingRepository;
        this.reservationRepository = reservationRepository;
        this.historyRepository = historyRepository;
        this.vehicleRepository = vehicleRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.staffRepository = staffRepository;
        this.capacityRepository = capacityRepository;
        this.blockRepository = blockRepository;
        this.pricingService = pricingService;
        this.mapper = mapper;
        this.auditService = auditService;
        this.conditionRecordRepository = conditionRecordRepository;
        this.properties = properties;
    }

    @Override
    @Transactional(readOnly = true)
    public BookingDtos.BookingPreviewResponse preview(CurrentUser currentUser, BookingDtos.BookingRequest request) {
        ValidationContext context = validateBookable(currentUser, request, false);
        BookingDtos.PriceBreakdown breakdown = pricingService.calculate(context.parkingLot().getId(), context.vehicle().getVehicleType(),
                request.startTime(), request.endTime(), request.deliveryMethod(), request.serviceIds(), request.promotionCode());
        long available = available(context.capacity(), request.startTime(), request.endTime());
        return new BookingDtos.BookingPreviewResponse(context.parkingLot().getId(), context.vehicle().getId(),
                request.startTime(), request.endTime(), breakdown, available);
    }

    @Override
    @Transactional
    public BookingDtos.BookingResponse create(CurrentUser currentUser, BookingDtos.BookingRequest request, String idempotencyKey) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = bookingRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return mapper.toResponse(existing.get());
            }
        }
        ValidationContext context = validateBookable(currentUser, request, true);
        BookingDtos.PriceBreakdown breakdown = pricingService.calculate(context.parkingLot().getId(), context.vehicle().getVehicleType(),
                request.startTime(), request.endTime(), request.deliveryMethod(), request.serviceIds(), request.promotionCode());
        Booking booking = new Booking();
        booking.setBookingCode("BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        booking.setCustomer(context.vehicle().getCustomer());
        booking.setVehicle(context.vehicle());
        booking.setParkingLot(context.parkingLot());
        booking.setVehicleType(context.vehicle().getVehicleType());
        booking.setPaymentMethod(request.paymentMethod());
        booking.setDeliveryMethod(request.deliveryMethod());
        booking.setPaymentStatus(PaymentStatus.UNPAID);
        booking.setStatus(BookingStatus.PENDING_APPROVAL);
        booking.setStartTime(request.startTime());
        booking.setEndTime(request.endTime());
        booking.setHoldExpiresAt(OffsetDateTime.now().plusMinutes(properties.booking().holdTimeoutMinutes()));
        booking.setApprovalExpiresAt(OffsetDateTime.now().plusMinutes(properties.booking().approvalTimeoutMinutes()));
        applyPrice(booking, breakdown);
        booking.setIdempotencyKey(idempotencyKey);
        booking = bookingRepository.save(booking);
        reserve(booking);
        history(booking, null, BookingStatus.PENDING_APPROVAL, currentUser, null);
        auditService.record(currentUser.id(), currentUser.role(), "CREATE", "BOOKING", booking.getId().toString(), null, booking.getStatus().name(), null);
        return mapper.toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingDtos.BookingResponse> customerBookings(CurrentUser currentUser, Pageable pageable) {
        return bookingRepository.findByCustomerId(currentUser.id(), pageable).map(mapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingDtos.BookingResponse customerDetail(CurrentUser currentUser, UUID bookingId) {
        return mapper.toResponse(bookingRepository.findByIdAndCustomerId(bookingId, currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Booking không tồn tại")));
    }

    @Override
    @Transactional
    public BookingDtos.CommandResponse cancel(CurrentUser currentUser, UUID bookingId, String reason) {
        Booking booking = bookingRepository.findByIdAndCustomerId(bookingId, currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Booking không tồn tại"));
        if (!List.of(BookingStatus.PENDING_APPROVAL, BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED).contains(booking.getStatus())) {
            throw new BusinessException(ErrorCode.BOOKING_CANNOT_CANCEL, "Booking không thể hủy ở trạng thái hiện tại");
        }
        BookingStatus previous = booking.getStatus();
        booking.setStatus(BookingStatus.CANCELLED);
        releaseReservation(booking);
        history(booking, previous, booking.getStatus(), currentUser, reason);
        auditService.record(currentUser.id(), currentUser.role(), "CANCEL", "BOOKING", booking.getId().toString(), previous.name(), booking.getStatus().name(), reason);
        return mapper.command(booking, previous);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingDtos.BookingResponse> staffBookings(CurrentUser currentUser, UUID parkingLotId, Pageable pageable) {
        assertStaffAccess(currentUser, parkingLotId);
        return bookingRepository.findByParkingLotId(parkingLotId, pageable).map(mapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingDtos.BookingResponse staffDetail(CurrentUser currentUser, UUID bookingId) {
        Booking booking = getBooking(bookingId);
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        return mapper.toResponse(booking);
    }

    @Override
    @Transactional
    public BookingDtos.CommandResponse approve(CurrentUser currentUser, UUID bookingId) {
        Booking booking = getBooking(bookingId);
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        if (booking.getStatus() != BookingStatus.PENDING_APPROVAL) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Booking không ở trạng thái PENDING_APPROVAL");
        }
        BookingStatus previous = booking.getStatus();
        booking.setStatus(booking.getPaymentMethod() == PaymentMethod.CASH ? BookingStatus.CONFIRMED : BookingStatus.PENDING_PAYMENT);
        history(booking, previous, booking.getStatus(), currentUser, null);
        auditService.record(currentUser.id(), currentUser.role(), "APPROVE", "BOOKING", booking.getId().toString(), previous.name(), booking.getStatus().name(), null);
        return mapper.command(booking, previous);
    }

    @Override
    @Transactional
    public BookingDtos.CommandResponse decline(CurrentUser currentUser, UUID bookingId, String reason) {
        Booking booking = getBooking(bookingId);
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        if (booking.getStatus() != BookingStatus.PENDING_APPROVAL) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Booking không ở trạng thái PENDING_APPROVAL");
        }
        BookingStatus previous = booking.getStatus();
        booking.setStatus(BookingStatus.DECLINED);
        releaseReservation(booking);
        history(booking, previous, booking.getStatus(), currentUser, reason);
        auditService.record(currentUser.id(), currentUser.role(), "DECLINE", "BOOKING", booking.getId().toString(), previous.name(), booking.getStatus().name(), reason);
        return mapper.command(booking, previous);
    }

    @Override
    @Transactional
    public BookingDtos.CommandResponse checkIn(CurrentUser currentUser, UUID bookingId, BookingDtos.CheckInRequest request, String idempotencyKey) {
        Booking booking = getBooking(bookingId);
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        assertVersion(booking.getVersion(), request.expectedVersion());
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BusinessException(ErrorCode.CHECK_IN_NOT_ALLOWED, "Booking chưa CONFIRMED");
        }
        BookingStatus previous = booking.getStatus();
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setActualCheckInTime(OffsetDateTime.now());
        recordCondition(booking, currentUser, RecordType.CHECK_IN, request.conditionNotes());
        history(booking, previous, booking.getStatus(), currentUser, null);
        auditService.record(currentUser.id(), currentUser.role(), "CHECK_IN", "BOOKING", booking.getId().toString(), previous.name(), booking.getStatus().name(), null);
        return mapper.command(booking, previous);
    }

    @Override
    @Transactional
    public BookingDtos.CommandResponse checkOut(CurrentUser currentUser, UUID bookingId, BookingDtos.CheckOutRequest request, String idempotencyKey) {
        Booking booking = getBooking(bookingId);
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        assertVersion(booking.getVersion(), request.expectedVersion());
        if (booking.getStatus() != BookingStatus.CHECKED_IN && booking.getStatus() != BookingStatus.OVERDUE) {
            throw new BusinessException(ErrorCode.CHECK_OUT_NOT_ALLOWED, "Booking chưa CHECKED_IN hoặc OVERDUE");
        }
        BookingStatus previous = booking.getStatus();
        booking.setStatus(BookingStatus.CHECKED_OUT);
        booking.setActualCheckOutTime(OffsetDateTime.now());
        releaseReservation(booking);
        recordCondition(booking, currentUser, RecordType.CHECK_OUT, request.conditionNotes());
        history(booking, previous, booking.getStatus(), currentUser, null);
        auditService.record(currentUser.id(), currentUser.role(), "CHECK_OUT", "BOOKING", booking.getId().toString(), previous.name(), booking.getStatus().name(), null);
        return mapper.command(booking, previous);
    }

    private ValidationContext validateBookable(CurrentUser currentUser, BookingDtos.BookingRequest request, boolean lockCapacity) {
        if (!request.startTime().isBefore(request.endTime())) {
            throw new BusinessException(ErrorCode.BOOKING_TIME_INVALID, "startTime phải nhỏ hơn endTime");
        }
        Vehicle vehicle = vehicleRepository.findByIdAndCustomerId(request.vehicleId(), currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.VEHICLE_NOT_FOUND, "Vehicle không tồn tại"));
        if (vehicle.getStatus() != VehicleStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.VEHICLE_INACTIVE, "Vehicle không ACTIVE");
        }
        ParkingLot parkingLot = parkingLotRepository.findById(request.parkingLotId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_NOT_FOUND, "Parking lot không tồn tại"));
        if (parkingLot.getStatus() != ParkingLotStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.PARKING_LOT_NOT_ACTIVE, "Parking lot chưa ACTIVE");
        }
        ParkingVehicleCapacity capacity = (lockCapacity
                ? capacityRepository.lockByParkingLotIdAndVehicleType(parkingLot.getId(), vehicle.getVehicleType())
                : capacityRepository.findByParkingLotIdAndVehicleType(parkingLot.getId(), vehicle.getVehicleType()))
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_UNSUPPORTED_VEHICLE_TYPE, "Parking lot không hỗ trợ loại xe"));
        if (bookingRepository.existsVehicleOverlap(vehicle.getId(), properties.booking().activeOverlapStatuses(), request.startTime(), request.endTime())) {
            throw new BusinessException(ErrorCode.VEHICLE_BOOKING_TIME_CONFLICT, "Vehicle có booking trùng thời gian");
        }
        if (available(capacity, request.startTime(), request.endTime()) <= 0) {
            throw new BusinessException(ErrorCode.BOOKING_CAPACITY_NOT_AVAILABLE, "Không còn chỗ trong khoảng thời gian đã chọn");
        }
        return new ValidationContext(vehicle, parkingLot, capacity);
    }

    private long available(ParkingVehicleCapacity capacity, OffsetDateTime startTime, OffsetDateTime endTime) {
        long reserved = bookingRepository.countActiveReservations(capacity.getParkingLot().getId(), capacity.getVehicleType(),
                properties.booking().activeOverlapStatuses(), startTime, endTime);
        long blocked = blockRepository.countBlocked(capacity.getParkingLot().getId(), capacity.getVehicleType(), startTime, endTime);
        return capacity.getTotalCapacity() - reserved - blocked;
    }

    private void applyPrice(Booking booking, BookingDtos.PriceBreakdown breakdown) {
        booking.setParkingFee(breakdown.parkingFee().amount());
        booking.setServiceFee(breakdown.serviceFee().amount());
        booking.setPickupFee(breakdown.pickupFee().amount());
        booking.setDiscountAmount(breakdown.discount().amount());
        booking.setPlatformFee(breakdown.platformFee().amount());
        booking.setTaxAmount(breakdown.tax().amount());
        booking.setOvertimeFee(breakdown.overtimeFee().amount());
        booking.setTotalAmount(breakdown.total().amount());
        booking.setCurrency(breakdown.total().currency());
    }

    private void reserve(Booking booking) {
        BookingCapacityReservation reservation = new BookingCapacityReservation();
        reservation.setBooking(booking);
        reservation.setParkingLot(booking.getParkingLot());
        reservation.setVehicleType(booking.getVehicleType());
        reservation.setStartTime(booking.getStartTime());
        reservation.setEndTime(booking.getEndTime());
        reservation.setReleased(false);
        reservationRepository.save(reservation);
    }

    private void releaseReservation(Booking booking) {
        reservationRepository.findByBookingIdAndReleasedFalse(booking.getId()).ifPresent(reservation -> reservation.setReleased(true));
    }

    private void history(Booking booking, BookingStatus previous, BookingStatus current, CurrentUser user, String reason) {
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(booking);
        history.setPreviousStatus(previous);
        history.setCurrentStatus(current);
        history.setActorId(user.id());
        history.setActorRole(user.role());
        history.setReason(reason);
        historyRepository.save(history);
    }

    private void recordCondition(Booking booking, CurrentUser user, RecordType type, String notes) {
        VehicleConditionRecord record = new VehicleConditionRecord();
        record.setBooking(booking);
        record.setRecordType(type);
        record.setNotes(notes);
        record.setRecordedBy(user.id());
        record.setRecordedAt(OffsetDateTime.now());
        conditionRecordRepository.save(record);
    }

    private Booking getBooking(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Booking không tồn tại"));
    }

    private void assertStaffAccess(CurrentUser currentUser, UUID parkingLotId) {
        if (!staffRepository.existsByParkingLotIdAndStaffId(parkingLotId, currentUser.id())) {
            throw new BusinessException(ErrorCode.PARKING_LOT_ACCESS_DENIED, "Staff không được phân công bãi xe này");
        }
    }

    private void assertVersion(Long currentVersion, Long expectedVersion) {
        if (expectedVersion != null && !expectedVersion.equals(currentVersion)) {
            throw new BusinessException(ErrorCode.RESOURCE_VERSION_CONFLICT, "Version không khớp");
        }
    }

    private record ValidationContext(Vehicle vehicle, ParkingLot parkingLot, ParkingVehicleCapacity capacity) {
    }
}
