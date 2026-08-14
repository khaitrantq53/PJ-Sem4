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
import com.smartparking.common.RequestStatus;
import com.smartparking.common.VehicleType;
import com.smartparking.common.VehicleStatus;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.idempotency.IdempotencyKey;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.parking.ParkingLot;
import com.smartparking.parking.ParkingOperatingHour;
import com.smartparking.parking.ParkingOperatingHourRepository;
import com.smartparking.parking.ParkingLotRepository;
import com.smartparking.parking.ParkingLotStaff;
import com.smartparking.parking.ParkingLotStaffRepository;
import com.smartparking.parking.ParkingServiceEntity;
import com.smartparking.parking.ParkingServiceRepository;
import com.smartparking.pricing.PricingService;
import com.smartparking.pricing.PricingService.PricingCalculation;
import com.smartparking.notification.Notification;
import com.smartparking.notification.NotificationRepository;
import com.smartparking.payment.Payment;
import com.smartparking.payment.PaymentRepository;
import com.smartparking.promotion.PromotionUsage;
import com.smartparking.promotion.PromotionUsageRepository;
import com.smartparking.vehicle.Vehicle;
import com.smartparking.vehicle.VehicleRepository;
import com.smartparking.vehiclecondition.VehicleConditionRecord;
import com.smartparking.vehiclecondition.VehicleConditionRecordRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import jakarta.persistence.criteria.Predicate;

import java.util.ArrayList;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class BookingServiceImpl implements BookingService {
    private static final List<BookingStatus> RESERVED_CAPACITY_STATUSES = List.of(
            BookingStatus.PENDING_APPROVAL,
            BookingStatus.PENDING_PAYMENT,
            BookingStatus.CONFIRMED
    );
    private static final List<BookingStatus> CHECKED_IN_CAPACITY_STATUSES = List.of(
            BookingStatus.CHECKED_IN,
            BookingStatus.OVERDUE
    );

    private final BookingRepository bookingRepository;
    private final BookingCapacityReservationRepository reservationRepository;
    private final BookingStatusHistoryRepository historyRepository;
    private final BookingCommandIdempotencyRepository commandIdempotencyRepository;
    private final BookingChangeRequestRepository changeRequestRepository;
    private final BookingExtensionRequestRepository extensionRequestRepository;
    private final BookingServiceItemRepository serviceItemRepository;
    private final BookingPriceItemRepository priceItemRepository;
    private final BookingPricingSnapshotRepository pricingSnapshotRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingLotStaffRepository staffRepository;
    private final ParkingOperatingHourRepository operatingHourRepository;
    private final ParkingServiceRepository parkingServiceRepository;
    private final ParkingVehicleCapacityRepository capacityRepository;
    private final ParkingCapacityBlockRepository blockRepository;
    private final PricingService pricingService;
    private final BookingMapper mapper;
    private final AuditService auditService;
    private final PromotionUsageRepository promotionUsageRepository;
    private final PaymentRepository paymentRepository;
    private final VehicleConditionRecordRepository conditionRecordRepository;
    private final NotificationRepository notificationRepository;
    private final SmartParkingProperties properties;

    public BookingServiceImpl(BookingRepository bookingRepository,
                              BookingCapacityReservationRepository reservationRepository,
                              BookingStatusHistoryRepository historyRepository,
                              BookingCommandIdempotencyRepository commandIdempotencyRepository,
                              BookingChangeRequestRepository changeRequestRepository,
                              BookingExtensionRequestRepository extensionRequestRepository,
                              BookingServiceItemRepository serviceItemRepository,
                              BookingPriceItemRepository priceItemRepository,
                              BookingPricingSnapshotRepository pricingSnapshotRepository,
                              VehicleRepository vehicleRepository,
                              ParkingLotRepository parkingLotRepository,
                              ParkingLotStaffRepository staffRepository,
                              ParkingOperatingHourRepository operatingHourRepository,
                              ParkingServiceRepository parkingServiceRepository,
                              ParkingVehicleCapacityRepository capacityRepository,
                              ParkingCapacityBlockRepository blockRepository,
                              PricingService pricingService,
                              BookingMapper mapper,
                              AuditService auditService,
                              PromotionUsageRepository promotionUsageRepository,
                              PaymentRepository paymentRepository,
                              VehicleConditionRecordRepository conditionRecordRepository,
                              NotificationRepository notificationRepository,
                              SmartParkingProperties properties) {
        this.bookingRepository = bookingRepository;
        this.reservationRepository = reservationRepository;
        this.historyRepository = historyRepository;
        this.commandIdempotencyRepository = commandIdempotencyRepository;
        this.changeRequestRepository = changeRequestRepository;
        this.extensionRequestRepository = extensionRequestRepository;
        this.serviceItemRepository = serviceItemRepository;
        this.priceItemRepository = priceItemRepository;
        this.pricingSnapshotRepository = pricingSnapshotRepository;
        this.vehicleRepository = vehicleRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.staffRepository = staffRepository;
        this.operatingHourRepository = operatingHourRepository;
        this.parkingServiceRepository = parkingServiceRepository;
        this.capacityRepository = capacityRepository;
        this.blockRepository = blockRepository;
        this.pricingService = pricingService;
        this.mapper = mapper;
        this.auditService = auditService;
        this.promotionUsageRepository = promotionUsageRepository;
        this.paymentRepository = paymentRepository;
        this.conditionRecordRepository = conditionRecordRepository;
        this.notificationRepository = notificationRepository;
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
        idempotencyKey = IdempotencyKey.normalize(idempotencyKey);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = bookingRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return mapper.toResponse(existing.get());
            }
        }
        ValidationContext context = validateBookable(currentUser, request, true);
        PricingCalculation calculation = pricingService.calculateSnapshot(context.parkingLot().getId(), context.vehicle().getVehicleType(),
                request.startTime(), request.endTime(), request.deliveryMethod(), request.serviceIds(), request.promotionCode());
        BookingDtos.PriceBreakdown breakdown = calculation.breakdown();
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
        snapshotPriceItems(booking, breakdown);
        snapshotPricing(booking, calculation);
        snapshotServices(booking, context.parkingLot().getId(), request.serviceIds());
        reserve(booking);
        history(booking, null, BookingStatus.PENDING_APPROVAL, currentUser, null);
        auditService.record(currentUser.id(), currentUser.role(), "CREATE", "BOOKING", booking.getId().toString(), null, booking.getStatus().name(), null);
        notifyCustomerAfterCommit(booking, "BOOKING_CREATED", "Booking đã được tạo", "Booking " + booking.getBookingCode() + " đang chờ duyệt");
        return mapper.toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingDtos.BookingListResponse> customerBookings(CurrentUser currentUser, Pageable pageable) {
        return bookingRepository.findByCustomerId(currentUser.id(), pageable).map(mapper::toListResponse);
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
    @Transactional
    public BookingDtos.BookingRequestResponse requestChange(CurrentUser currentUser, UUID bookingId, BookingDtos.ChangeRequest request) {
        Booking booking = bookingRepository.findByIdAndCustomerId(bookingId, currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Booking không tồn tại"));
        assertVersion(booking.getVersion(), request.expectedVersion());
        if (!List.of(BookingStatus.PENDING_APPROVAL, BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED).contains(booking.getStatus())) {
            throw new BusinessException(ErrorCode.BOOKING_CANNOT_CHANGE, "Booking không thể đổi lịch ở trạng thái hiện tại");
        }
        if (!request.requestedStartTime().isBefore(request.requestedEndTime()) || !request.requestedStartTime().isAfter(OffsetDateTime.now())) {
            throw new BusinessException(ErrorCode.BOOKING_TIME_INVALID, "Thời gian đổi lịch không hợp lệ");
        }
        assertNoPendingRequest(booking.getId());
        validateBookingRequestRange(booking, request.requestedStartTime(), request.requestedEndTime(), true);

        BookingChangeRequest changeRequest = new BookingChangeRequest();
        changeRequest.setBooking(booking);
        changeRequest.setRequestedStartTime(request.requestedStartTime());
        changeRequest.setRequestedEndTime(request.requestedEndTime());
        changeRequest.setStatus(RequestStatus.PENDING);
        changeRequest.setReason(request.reason());
        changeRequest = changeRequestRepository.save(changeRequest);
        auditService.record(currentUser.id(), currentUser.role(), "REQUEST_CHANGE", "BOOKING", booking.getId().toString(),
                booking.getStartTime() + "/" + booking.getEndTime(), request.requestedStartTime() + "/" + request.requestedEndTime(), request.reason());
        return requestResponse(changeRequest);
    }

    @Override
    @Transactional
    public BookingDtos.BookingRequestResponse requestExtension(CurrentUser currentUser, UUID bookingId, BookingDtos.ExtensionRequest request) {
        Booking booking = bookingRepository.findByIdAndCustomerId(bookingId, currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Booking không tồn tại"));
        assertVersion(booking.getVersion(), request.expectedVersion());
        if (!List.of(BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.OVERDUE).contains(booking.getStatus())) {
            throw new BusinessException(ErrorCode.BOOKING_CANNOT_EXTEND, "Booking không thể gia hạn ở trạng thái hiện tại");
        }
        if (!request.requestedEndTime().isAfter(booking.getEndTime())) {
            throw new BusinessException(ErrorCode.BOOKING_TIME_INVALID, "Thời gian gia hạn phải sau endTime hiện tại");
        }
        assertNoPendingRequest(booking.getId());
        validateBookingRequestRange(booking, booking.getStartTime(), request.requestedEndTime(), true);

        BookingExtensionRequest extensionRequest = new BookingExtensionRequest();
        extensionRequest.setBooking(booking);
        extensionRequest.setRequestedEndTime(request.requestedEndTime());
        extensionRequest.setStatus(RequestStatus.PENDING);
        extensionRequest.setReason(request.reason());
        extensionRequest = extensionRequestRepository.save(extensionRequest);
        auditService.record(currentUser.id(), currentUser.role(), "REQUEST_EXTENSION", "BOOKING", booking.getId().toString(),
                booking.getEndTime().toString(), request.requestedEndTime().toString(), request.reason());
        return requestResponse(extensionRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingDtos.BookingListResponse> staffBookings(CurrentUser currentUser, UUID parkingLotId, BookingStatus status,
                                                               OffsetDateTime startFrom, OffsetDateTime endTo,
                                                               VehicleType vehicleType, String bookingCode, String plateNumber,
                                                               Pageable pageable) {
        if (parkingLotId != null) {
            assertStaffAccess(currentUser, parkingLotId);
        }
        if (startFrom != null && endTo != null && !startFrom.isBefore(endTo)) {
            throw new BusinessException(ErrorCode.BOOKING_TIME_INVALID, "startFrom phải nhỏ hơn endTo");
        }
        Specification<Booking> specification = staffBookingSpecification(currentUser.id(), parkingLotId, status,
                startFrom, endTo, vehicleType, blankToNull(bookingCode), blankToNull(plateNumber));
        return bookingRepository.findAll(specification, pageable).map(mapper::toListResponse);
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
        assertApprovalReservationValid(booking);
        BookingStatus previous = booking.getStatus();
        booking.setStatus(BookingStatus.CONFIRMED);
        history(booking, previous, booking.getStatus(), currentUser, null);
        auditService.record(currentUser.id(), currentUser.role(), "APPROVE", "BOOKING", booking.getId().toString(), previous.name(), booking.getStatus().name(), null);
        notifyCustomer(booking, "BOOKING_APPROVED", "Booking đã được duyệt", "Booking " + booking.getBookingCode() + " đã được duyệt");
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
        notifyCustomer(booking, "BOOKING_DECLINED", "Booking bị từ chối", "Booking " + booking.getBookingCode() + " đã bị từ chối");
        return mapper.command(booking, previous);
    }

    @Override
    @Transactional
    public BookingDtos.BookingRequestResponse approveChangeRequest(CurrentUser currentUser, UUID requestId) {
        BookingChangeRequest request = changeRequestRepository.findByIdAndStatus(requestId, RequestStatus.PENDING)
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Change request không tồn tại hoặc không pending"));
        Booking booking = request.getBooking();
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        if (!List.of(BookingStatus.PENDING_APPROVAL, BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED).contains(booking.getStatus())) {
            throw new BusinessException(ErrorCode.BOOKING_CANNOT_CHANGE, "Booking không thể đổi lịch ở trạng thái hiện tại");
        }
        validateBookingRequestRange(booking, request.getRequestedStartTime(), request.getRequestedEndTime(), true, true);
        BookingDtos.PriceBreakdown breakdown = recalculateExistingBooking(booking, request.getRequestedStartTime(), request.getRequestedEndTime());
        BigDecimal previousTotal = booking.getTotalAmount();
        booking.setStartTime(request.getRequestedStartTime());
        booking.setEndTime(request.getRequestedEndTime());
        applyPrice(booking, breakdown);
        updateReservation(booking, request.getRequestedStartTime(), request.getRequestedEndTime());
        request.setStatus(RequestStatus.APPROVED);
        BigDecimal priceDifference = booking.getTotalAmount().subtract(previousTotal);
        auditService.record(currentUser.id(), currentUser.role(), "APPROVE_CHANGE_REQUEST", "BOOKING",
                booking.getId().toString(), previousTotal.toPlainString(), booking.getTotalAmount().toPlainString(), priceDifference.toPlainString());
        notifyCustomer(booking, "BOOKING_CHANGE_APPROVED", "Yêu cầu đổi lịch đã được duyệt", "Booking " + booking.getBookingCode() + " đã được đổi lịch");
        return requestResponse(request);
    }

    @Override
    @Transactional
    public BookingDtos.BookingRequestResponse rejectChangeRequest(CurrentUser currentUser, UUID requestId, String reason) {
        BookingChangeRequest request = changeRequestRepository.findByIdAndStatus(requestId, RequestStatus.PENDING)
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Change request không tồn tại hoặc không pending"));
        Booking booking = request.getBooking();
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        requireReason(reason);
        request.setStatus(RequestStatus.REJECTED);
        request.setDecisionReason(reason);
        auditService.record(currentUser.id(), currentUser.role(), "REJECT_CHANGE_REQUEST", "BOOKING",
                booking.getId().toString(), RequestStatus.PENDING.name(), RequestStatus.REJECTED.name(), reason);
        notifyCustomer(booking, "BOOKING_CHANGE_REJECTED", "Yêu cầu đổi lịch bị từ chối", "Booking " + booking.getBookingCode() + " không được đổi lịch");
        return requestResponse(request);
    }

    @Override
    @Transactional
    public BookingDtos.BookingRequestResponse approveExtensionRequest(CurrentUser currentUser, UUID requestId) {
        BookingExtensionRequest request = extensionRequestRepository.findByIdAndStatus(requestId, RequestStatus.PENDING)
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Extension request không tồn tại hoặc không pending"));
        Booking booking = request.getBooking();
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        if (!List.of(BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.OVERDUE).contains(booking.getStatus())) {
            throw new BusinessException(ErrorCode.BOOKING_CANNOT_EXTEND, "Booking không thể gia hạn ở trạng thái hiện tại");
        }
        if (!request.getRequestedEndTime().isAfter(booking.getEndTime())) {
            throw new BusinessException(ErrorCode.BOOKING_TIME_INVALID, "Thời gian gia hạn phải sau endTime hiện tại");
        }
        validateBookingRequestRange(booking, booking.getStartTime(), request.getRequestedEndTime(), true, true);
        BookingDtos.PriceBreakdown breakdown = recalculateExistingBooking(booking, booking.getStartTime(), request.getRequestedEndTime());
        BigDecimal previousTotal = booking.getTotalAmount();
        booking.setEndTime(request.getRequestedEndTime());
        applyPrice(booking, breakdown);
        updateReservation(booking, booking.getStartTime(), request.getRequestedEndTime());
        request.setStatus(RequestStatus.APPROVED);
        BigDecimal priceDifference = booking.getTotalAmount().subtract(previousTotal);
        auditService.record(currentUser.id(), currentUser.role(), "APPROVE_EXTENSION_REQUEST", "BOOKING",
                booking.getId().toString(), previousTotal.toPlainString(), booking.getTotalAmount().toPlainString(), priceDifference.toPlainString());
        notifyCustomer(booking, "BOOKING_EXTENSION_APPROVED", "Yêu cầu gia hạn đã được duyệt", "Booking " + booking.getBookingCode() + " đã được gia hạn");
        return requestResponse(request);
    }

    @Override
    @Transactional
    public BookingDtos.BookingRequestResponse rejectExtensionRequest(CurrentUser currentUser, UUID requestId, String reason) {
        BookingExtensionRequest request = extensionRequestRepository.findByIdAndStatus(requestId, RequestStatus.PENDING)
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Extension request không tồn tại hoặc không pending"));
        Booking booking = request.getBooking();
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        requireReason(reason);
        request.setStatus(RequestStatus.REJECTED);
        request.setDecisionReason(reason);
        auditService.record(currentUser.id(), currentUser.role(), "REJECT_EXTENSION_REQUEST", "BOOKING",
                booking.getId().toString(), RequestStatus.PENDING.name(), RequestStatus.REJECTED.name(), reason);
        notifyCustomer(booking, "BOOKING_EXTENSION_REJECTED", "Yêu cầu gia hạn bị từ chối", "Booking " + booking.getBookingCode() + " không được gia hạn");
        return requestResponse(request);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingDtos.VerifyQrResponse verifyQr(CurrentUser currentUser, UUID bookingId, BookingDtos.VerifyQrRequest request) {
        Booking booking = getBooking(bookingId);
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        validateCheckInEligibility(booking, request.qrCode(), request.plateNumber(), OffsetDateTime.now());
        return new BookingDtos.VerifyQrResponse(booking.getId(), booking.getBookingCode(), booking.getVehicle().getId(),
                booking.getVehicle().getPlateNumber(), booking.getStatus(), booking.getStartTime(), booking.getEndTime(),
                booking.getVersion());
    }

    @Override
    @Transactional(readOnly = true)
    public BookingDtos.CheckoutPreviewResponse checkoutPreview(CurrentUser currentUser, UUID bookingId) {
        Booking booking = getBooking(bookingId);
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        if (booking.getStatus() != BookingStatus.CHECKED_IN && booking.getStatus() != BookingStatus.OVERDUE) {
            throw new BusinessException(ErrorCode.CHECK_OUT_NOT_ALLOWED, "Booking chưa CHECKED_IN hoặc OVERDUE");
        }
        OffsetDateTime actualCheckOutTime = OffsetDateTime.now();
        BookingDtos.Money overtimeFee = overtimeFee(booking, actualCheckOutTime);
        BigDecimal total = booking.getTotalAmount().subtract(booking.getOvertimeFee()).add(overtimeFee.amount());
        return new BookingDtos.CheckoutPreviewResponse(booking.getId(), booking.getStatus(), booking.getEndTime(),
                actualCheckOutTime, overtimeMinutes(booking, actualCheckOutTime), overtimeFee,
                money(total, booking.getCurrency()), booking.getVersion());
    }

    @Override
    @Transactional
    public BookingDtos.CommandResponse checkIn(CurrentUser currentUser, UUID bookingId, BookingDtos.CheckInRequest request, String idempotencyKey) {
        idempotencyKey = IdempotencyKey.normalize(idempotencyKey);
        BookingDtos.CommandResponse existingResponse = existingCommandResponse(idempotencyKey, bookingId, "CHECK_IN");
        if (existingResponse != null) {
            return existingResponse;
        }
        Booking booking = getBooking(bookingId);
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        assertVersion(booking.getVersion(), request.expectedVersion());
        if (booking.getStatus() == BookingStatus.PENDING_APPROVAL) {
            assertApprovalReservationValid(booking);
        }
        validateCheckInEligibility(booking, request.qrCode(), request.plateNumber(), OffsetDateTime.now());
        requireConditionNotes(request.conditionNotes());
        BookingStatus previous = booking.getStatus();
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setActualCheckInTime(OffsetDateTime.now());
        recordCondition(booking, currentUser, RecordType.CHECK_IN, request.conditionNotes());
        history(booking, previous, booking.getStatus(), currentUser, null);
        auditService.record(currentUser.id(), currentUser.role(), "CHECK_IN", "BOOKING", booking.getId().toString(), previous.name(), booking.getStatus().name(), null);
        notifyCustomer(booking, "BOOKING_CHECKED_IN", "Xe đã check-in", "Booking " + booking.getBookingCode() + " đã check-in");
        saveCommandIdempotency(idempotencyKey, booking, "CHECK_IN", previous);
        return mapper.command(booking, previous);
    }

    @Override
    @Transactional
    public BookingDtos.CommandResponse checkOut(CurrentUser currentUser, UUID bookingId, BookingDtos.CheckOutRequest request, String idempotencyKey) {
        idempotencyKey = IdempotencyKey.normalize(idempotencyKey);
        BookingDtos.CommandResponse existingResponse = existingCommandResponse(idempotencyKey, bookingId, "CHECK_OUT");
        if (existingResponse != null) {
            return existingResponse;
        }
        Booking booking = getBooking(bookingId);
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        assertVersion(booking.getVersion(), request.expectedVersion());
        if (booking.getStatus() != BookingStatus.CHECKED_IN && booking.getStatus() != BookingStatus.OVERDUE) {
            throw new BusinessException(ErrorCode.CHECK_OUT_NOT_ALLOWED, "Booking chưa CHECKED_IN hoặc OVERDUE");
        }
        requireConditionNotes(request.conditionNotes());
        BookingStatus previous = booking.getStatus();
        BookingDtos.Money overtimeFee = overtimeFee(booking, OffsetDateTime.now());
        BigDecimal total = booking.getTotalAmount().subtract(booking.getOvertimeFee()).add(overtimeFee.amount());
        booking.setOvertimeFee(overtimeFee.amount());
        booking.setTotalAmount(total);
        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setPaymentStatus(PaymentStatus.UNPAID);
        booking.setActualCheckOutTime(OffsetDateTime.now());
        releaseReservation(booking);
        recordCondition(booking, currentUser, RecordType.CHECK_OUT, request.conditionNotes());
        history(booking, previous, booking.getStatus(), currentUser, null);
        auditService.record(currentUser.id(), currentUser.role(), "CHECK_OUT", "BOOKING", booking.getId().toString(), previous.name(), booking.getStatus().name(), null);
        notifyCustomer(booking, "BOOKING_CHECKED_OUT", "Xe đã check-out", "Booking " + booking.getBookingCode() + " đã check-out và đang chờ thanh toán");
        saveCommandIdempotency(idempotencyKey, booking, "CHECK_OUT", previous);
        return mapper.command(booking, previous);
    }

    @Override
    @Transactional
    public BookingDtos.CommandResponse done(CurrentUser currentUser, UUID bookingId, BookingDtos.DoneRequest request) {
        Booking booking = getBooking(bookingId);
        assertStaffAccess(currentUser, booking.getParkingLot().getId());
        assertVersion(booking.getVersion(), request.expectedVersion());
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT || booking.getActualCheckOutTime() == null) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Booking chưa check-out hoặc chưa ở trạng thái PENDING_PAYMENT");
        }

        BookingStatus previous = booking.getStatus();
        booking.setPaymentStatus(PaymentStatus.PAID);
        booking.setStatus(BookingStatus.CHECKED_OUT);
        completeStaffPayment(booking);
        history(booking, previous, booking.getStatus(), currentUser, request.note());
        auditService.record(currentUser.id(), currentUser.role(), "DONE", "BOOKING", booking.getId().toString(), previous.name(), booking.getStatus().name(), request.note());
        notifyCustomer(booking, "BOOKING_COMPLETED", "Booking hoàn tất", "Booking " + booking.getBookingCode() + " đã hoàn tất");
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
        validateOperatingHours(parkingLot.getId(), request.startTime(), request.endTime());
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

    private void validateOperatingHours(UUID parkingLotId, OffsetDateTime startTime, OffsetDateTime endTime) {
        List<ParkingOperatingHour> configuredHours = operatingHourRepository.findByParkingLotId(parkingLotId);
        if (configuredHours.isEmpty()) {
            return;
        }
        Map<Integer, ParkingOperatingHour> hoursByDay = configuredHours.stream()
                .collect(Collectors.toMap(ParkingOperatingHour::getDayOfWeek, Function.identity(), (left, right) -> left));
        LocalDate date = startTime.toLocalDate();
        LocalDate lastDate = endTime.toLocalTime().equals(LocalTime.MIDNIGHT)
                ? endTime.toLocalDate().minusDays(1)
                : endTime.toLocalDate();
        while (!date.isAfter(lastDate)) {
            ParkingOperatingHour hours = hoursByDay.get(date.getDayOfWeek().getValue());
            if (hours != null) {
                if (hours.isClosed()) {
                    throw new BusinessException(ErrorCode.BOOKING_TIME_INVALID, "Parking lot đóng cửa trong khoảng thời gian đã chọn");
                }
                if (!hours.getOpenTime().isBefore(hours.getCloseTime())) {
                    throw new BusinessException(ErrorCode.BUSINESS_DECISION_REQUIRED, "Operating hours qua ngày chưa được chốt nghiệp vụ");
                }
                LocalTime requestedStart = date.equals(startTime.toLocalDate()) ? startTime.toLocalTime() : LocalTime.MIN;
                LocalTime requestedEnd = date.equals(endTime.toLocalDate()) ? endTime.toLocalTime() : LocalTime.MAX;
                if (requestedStart.isBefore(hours.getOpenTime()) || requestedEnd.isAfter(hours.getCloseTime())) {
                    throw new BusinessException(ErrorCode.BOOKING_TIME_INVALID, "Booking nằm ngoài operating hours");
                }
            }
            date = date.plusDays(1);
        }
    }

    private long available(ParkingVehicleCapacity capacity, OffsetDateTime startTime, OffsetDateTime endTime) {
        long checkedIn = bookingRepository.countCheckedInCapacity(capacity.getParkingLot().getId(), capacity.getVehicleType(),
                CHECKED_IN_CAPACITY_STATUSES, startTime, endTime);
        long reserved = bookingRepository.countReservedCapacity(capacity.getParkingLot().getId(), capacity.getVehicleType(),
                RESERVED_CAPACITY_STATUSES, startTime, endTime);
        long blocked = blockRepository.countBlocked(capacity.getParkingLot().getId(), capacity.getVehicleType(), startTime, endTime);
        return capacity.getTotalCapacity() - checkedIn - reserved - blocked;
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

    private void snapshotPriceItems(Booking booking, BookingDtos.PriceBreakdown breakdown) {
        priceItemRepository.saveAll(List.of(
                priceItem(booking, "PARKING_FEE", "Parking fee", breakdown.parkingFee()),
                priceItem(booking, "SERVICE_FEE", "Service fee", breakdown.serviceFee()),
                priceItem(booking, "PICKUP_FEE", "Pickup fee", breakdown.pickupFee()),
                priceItem(booking, "DISCOUNT", "Discount", breakdown.discount()),
                priceItem(booking, "PLATFORM_FEE", "Platform fee", breakdown.platformFee()),
                priceItem(booking, "TAX", "Tax", breakdown.tax()),
                priceItem(booking, "OVERTIME_FEE", "Overtime fee", breakdown.overtimeFee()),
                priceItem(booking, "TOTAL", "Total", breakdown.total())
        ));
    }

    private BookingPriceItem priceItem(Booking booking, String itemType, String label, BookingDtos.Money money) {
        BookingPriceItem item = new BookingPriceItem();
        item.setBooking(booking);
        item.setItemType(itemType);
        item.setLabel(label);
        item.setAmount(money.amount());
        item.setCurrency(money.currency());
        return item;
    }

    private void snapshotPricing(Booking booking, PricingCalculation calculation) {
        BookingPricingSnapshot snapshot = new BookingPricingSnapshot();
        snapshot.setBooking(booking);
        snapshot.setPricingRule(calculation.pricingRule());
        snapshot.setHourlyRate(calculation.hourlyRate());
        snapshot.setPromotion(calculation.promotion());
        snapshot.setPromotionCode(calculation.promotion() == null ? null : calculation.promotion().getCode());
        snapshot.setPromotionName(calculation.promotion() == null ? null : calculation.promotion().getName());
        snapshot.setPromotionDiscountAmount(calculation.promotionDiscountAmount());
        snapshot.setCurrency(calculation.breakdown().total().currency());
        pricingSnapshotRepository.save(snapshot);
        if (calculation.promotion() != null && calculation.promotionDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            PromotionUsage usage = new PromotionUsage();
            usage.setPromotion(calculation.promotion());
            usage.setBooking(booking);
            usage.setCustomer(booking.getCustomer());
            usage.setDiscountAmount(calculation.promotionDiscountAmount());
            promotionUsageRepository.save(usage);
        }
    }

    private void snapshotServices(Booking booking, UUID parkingLotId, List<UUID> serviceIds) {
        List<UUID> ids = serviceIds == null ? List.of() : serviceIds;
        if (ids.isEmpty()) {
            return;
        }
        List<ParkingServiceEntity> services = parkingServiceRepository.findByParkingLotIdAndIdInAndActiveTrue(parkingLotId, ids);
        if (services.size() != ids.size()) {
            throw new BusinessException(ErrorCode.PARKING_LOT_ACCESS_DENIED, "Service không hợp lệ cho parking lot");
        }
        serviceItemRepository.saveAll(services.stream().map(service -> {
            BookingServiceItem item = new BookingServiceItem();
            item.setBooking(booking);
            item.setServiceId(service.getId());
            item.setServiceName(service.getName());
            item.setPrice(service.getPrice());
            return item;
        }).toList());
    }

    private void createCashPaymentIfRequired(Booking booking) {
        if (booking.getPaymentMethod() != PaymentMethod.CASH
                || paymentRepository.existsByBookingIdAndPaymentMethod(booking.getId(), PaymentMethod.CASH)) {
            return;
        }
        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setPaymentMethod(PaymentMethod.CASH);
        payment.setStatus(PaymentStatus.UNPAID);
        payment.setAmount(booking.getTotalAmount());
        payment.setCurrency(booking.getCurrency());
        paymentRepository.save(payment);
    }

    private void completeStaffPayment(Booking booking) {
        List<Payment> payments = paymentRepository.findByBookingId(booking.getId());
        Payment payment = payments.stream()
                .filter(existing -> existing.getPaymentMethod() == booking.getPaymentMethod())
                .findFirst()
                .orElseGet(() -> {
                    Payment created = new Payment();
                    created.setBooking(booking);
                    created.setPaymentMethod(booking.getPaymentMethod());
                    return created;
                });
        payment.setStatus(PaymentStatus.PAID);
        payment.setAmount(booking.getTotalAmount());
        payment.setCurrency(booking.getCurrency());
        payment.setProvider("STAFF");
        payment.setProviderTransactionId("STAFF-DONE-" + booking.getBookingCode());
        paymentRepository.save(payment);
    }

    private void assertNoPendingRequest(UUID bookingId) {
        if (changeRequestRepository.existsByBookingIdAndStatus(bookingId, RequestStatus.PENDING)
                || extensionRequestRepository.existsByBookingIdAndStatus(bookingId, RequestStatus.PENDING)) {
            throw new BusinessException(ErrorCode.BOOKING_ALREADY_PROCESSED, "Booking đang có request chờ xử lý");
        }
    }

    private void validateBookingRequestRange(Booking booking, OffsetDateTime startTime, OffsetDateTime endTime, boolean checkAvailability) {
        validateBookingRequestRange(booking, startTime, endTime, checkAvailability, false);
    }

    private void validateBookingRequestRange(Booking booking, OffsetDateTime startTime, OffsetDateTime endTime,
                                             boolean checkAvailability, boolean lockCapacity) {
        if (booking.getParkingLot().getStatus() != ParkingLotStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.PARKING_LOT_NOT_ACTIVE, "Parking lot chưa ACTIVE");
        }
        if (booking.getVehicle().getStatus() != VehicleStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.VEHICLE_INACTIVE, "Vehicle không ACTIVE");
        }
        validateOperatingHours(booking.getParkingLot().getId(), startTime, endTime);
        ParkingVehicleCapacity capacity = (lockCapacity
                ? capacityRepository.lockByParkingLotIdAndVehicleType(booking.getParkingLot().getId(), booking.getVehicleType())
                : capacityRepository.findByParkingLotIdAndVehicleType(booking.getParkingLot().getId(), booking.getVehicleType()))
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_UNSUPPORTED_VEHICLE_TYPE, "Parking lot không hỗ trợ loại xe"));
        if (bookingRepository.existsVehicleOverlapExcluding(booking.getVehicle().getId(), booking.getId(),
                properties.booking().activeOverlapStatuses(), startTime, endTime)) {
            throw new BusinessException(ErrorCode.VEHICLE_BOOKING_TIME_CONFLICT, "Vehicle có booking trùng thời gian");
        }
        if (checkAvailability && availableExcluding(capacity, booking.getId(), startTime, endTime) <= 0) {
            throw new BusinessException(ErrorCode.BOOKING_CAPACITY_NOT_AVAILABLE, "Không còn chỗ trong khoảng thời gian đã chọn");
        }
    }

    private void validateCheckInEligibility(Booking booking, String qrCode, String plateNumber, OffsetDateTime now) {
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.PENDING_APPROVAL) {
            throw new BusinessException(ErrorCode.CHECK_IN_NOT_ALLOWED, "Booking chưa CONFIRMED hoặc PENDING_APPROVAL");
        }
        if (!booking.getBookingCode().equals(qrCode)) {
            throw new BusinessException(ErrorCode.QR_CODE_INVALID, "QR code không hợp lệ");
        }
        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            OffsetDateTime earliest = booking.getStartTime().minusMinutes(properties.operation().checkInEarlyMinutes());
            OffsetDateTime latest = booking.getStartTime().plusMinutes(properties.operation().checkInLateMinutes());
            if (now.isBefore(earliest)) {
                throw new BusinessException(ErrorCode.CHECK_IN_NOT_ALLOWED, "Không nằm trong khung giờ check-in");
            }
            if (now.isAfter(latest)) {
                throw new BusinessException(ErrorCode.QR_CODE_EXPIRED, "QR code đã quá hạn check-in");
            }
        }
        if (plateNumber != null && !plateNumber.isBlank()
                && !booking.getVehicle().getPlateNumber().equalsIgnoreCase(plateNumber.trim())) {
            throw new BusinessException(ErrorCode.VEHICLE_ACCESS_DENIED, "Biển số xe không khớp booking");
        }
    }

    private void requireConditionNotes(String conditionNotes) {
        if (properties.operation().requireVehicleConditionNotes()
                && (conditionNotes == null || conditionNotes.isBlank())) {
            throw new BusinessException(ErrorCode.VEHICLE_CONDITION_REQUIRED, "Vehicle condition là bắt buộc");
        }
    }

    private long availableExcluding(ParkingVehicleCapacity capacity, UUID excludedBookingId, OffsetDateTime startTime, OffsetDateTime endTime) {
        long checkedIn = bookingRepository.countCheckedInCapacityExcluding(capacity.getParkingLot().getId(), capacity.getVehicleType(),
                excludedBookingId, CHECKED_IN_CAPACITY_STATUSES, startTime, endTime);
        long reserved = bookingRepository.countReservedCapacityExcluding(capacity.getParkingLot().getId(), capacity.getVehicleType(),
                excludedBookingId, RESERVED_CAPACITY_STATUSES, startTime, endTime);
        long blocked = blockRepository.countBlocked(capacity.getParkingLot().getId(), capacity.getVehicleType(), startTime, endTime);
        return capacity.getTotalCapacity() - checkedIn - reserved - blocked;
    }

    private BookingDtos.Money overtimeFee(Booking booking, OffsetDateTime actualCheckOutTime) {
        long overtimeMinutes = overtimeMinutes(booking, actualCheckOutTime);
        if (overtimeMinutes == 0) {
            return money(BigDecimal.ZERO, booking.getCurrency());
        }
        BookingPricingSnapshot snapshot = pricingSnapshotRepository.findByBookingId(booking.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "Thiếu pricing snapshot của booking"));
        BigDecimal hours = BigDecimal.valueOf(overtimeMinutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        return money(snapshot.getHourlyRate().multiply(hours), snapshot.getCurrency());
    }

    private long overtimeMinutes(Booking booking, OffsetDateTime actualCheckOutTime) {
        OffsetDateTime chargeFrom = booking.getEndTime().plusMinutes(properties.operation().checkoutGraceMinutes());
        if (!actualCheckOutTime.isAfter(chargeFrom)) {
            return 0;
        }
        return Duration.between(chargeFrom, actualCheckOutTime).toMinutes();
    }

    private BookingDtos.PriceBreakdown recalculateExistingBooking(Booking booking, OffsetDateTime startTime, OffsetDateTime endTime) {
        BookingPricingSnapshot snapshot = pricingSnapshotRepository.findByBookingId(booking.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "Thiếu pricing snapshot của booking"));
        BigDecimal hours = BigDecimal.valueOf(Duration.between(startTime, endTime).toMinutes())
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        BigDecimal parkingFee = snapshot.getHourlyRate().multiply(hours).setScale(2, RoundingMode.HALF_UP);
        BigDecimal serviceFee = serviceItemRepository.findByBookingId(booking.getId()).stream()
                .map(BookingServiceItem::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal pickupFee = booking.getPickupFee();
        BigDecimal subtotal = parkingFee.add(serviceFee).add(pickupFee);
        BigDecimal discount = snapshot.getPromotionDiscountAmount() == null
                ? BigDecimal.ZERO
                : snapshot.getPromotionDiscountAmount().min(subtotal).setScale(2, RoundingMode.HALF_UP);
        BigDecimal platformFee = subtotal.multiply(properties.pricing().platformFeeRate()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal taxable = subtotal.subtract(discount).add(platformFee).max(BigDecimal.ZERO);
        BigDecimal tax = taxable.multiply(properties.pricing().taxRate()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = taxable.add(tax).setScale(2, RoundingMode.HALF_UP);
        String currency = snapshot.getCurrency();
        return new BookingDtos.PriceBreakdown(
                money(parkingFee, currency),
                money(serviceFee, currency),
                money(pickupFee, currency),
                money(discount, currency),
                money(platformFee, currency),
                money(tax, currency),
                money(BigDecimal.ZERO, currency),
                money(total, currency)
        );
    }

    private void updateReservation(Booking booking, OffsetDateTime startTime, OffsetDateTime endTime) {
        BookingCapacityReservation reservation = reservationRepository.findByBookingIdAndReleasedFalse(booking.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Capacity reservation không còn hợp lệ"));
        reservation.setStartTime(startTime);
        reservation.setEndTime(endTime);
    }

    private BookingDtos.Money money(BigDecimal amount, String currency) {
        return new BookingDtos.Money(amount.setScale(2, RoundingMode.HALF_UP), currency);
    }

    private void assertApprovalReservationValid(Booking booking) {
        reservationRepository.findByBookingIdAndReleasedFalse(booking.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Capacity reservation không còn hợp lệ"));
        if (booking.getApprovalExpiresAt() != null && booking.getApprovalExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Booking đã quá hạn duyệt");
        }
    }

    private void requireReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessException(ErrorCode.ADMIN_REASON_REQUIRED, "Reason là bắt buộc");
        }
    }

    private BookingDtos.BookingRequestResponse requestResponse(BookingChangeRequest request) {
        return new BookingDtos.BookingRequestResponse(request.getId(), request.getBooking().getId(), request.getStatus(),
                request.getRequestedStartTime(), request.getRequestedEndTime(), request.getReason(), request.getVersion(), request.getCreatedAt());
    }

    private BookingDtos.BookingRequestResponse requestResponse(BookingExtensionRequest request) {
        return new BookingDtos.BookingRequestResponse(request.getId(), request.getBooking().getId(), request.getStatus(),
                null, request.getRequestedEndTime(), request.getReason(), request.getVersion(), request.getCreatedAt());
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

    private void notifyCustomer(Booking booking, String type, String title, String content) {
        Notification notification = new Notification();
        notification.setRecipient(booking.getCustomer());
        notification.setType(type);
        notification.setTitle(title);
        notification.setContent(content);
        notificationRepository.save(notification);
    }

    private void notifyCustomerAfterCommit(Booking booking, String type, String title, String content) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            notifyCustomer(booking, type, title, content);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                notifyCustomer(booking, type, title, content);
            }
        });
    }

    private BookingDtos.CommandResponse existingCommandResponse(String idempotencyKey, UUID bookingId, String command) {
        if (idempotencyKey == null) {
            return null;
        }
        return commandIdempotencyRepository.findByIdempotencyKey(idempotencyKey)
                .map(record -> {
                    if (!record.getBooking().getId().equals(bookingId) || !record.getCommand().equals(command)) {
                        throw new BusinessException(ErrorCode.IDEMPOTENCY_CONFLICT, "Idempotency-Key đã được dùng cho command khác");
                    }
                    Booking booking = record.getBooking();
                    return new BookingDtos.CommandResponse(
                            booking.getId(),
                            record.getPreviousStatus(),
                            record.getCurrentStatus(),
                            record.getPaymentStatus(),
                            nextAction(booking),
                            mapper.availableActions(booking),
                            booking.getVersion(),
                            booking.getUpdatedAt()
                    );
                })
                .orElse(null);
    }

    private void saveCommandIdempotency(String idempotencyKey, Booking booking, String command, BookingStatus previousStatus) {
        if (idempotencyKey == null) {
            return;
        }
        BookingCommandIdempotency record = new BookingCommandIdempotency();
        record.setIdempotencyKey(idempotencyKey);
        record.setBooking(booking);
        record.setCommand(command);
        record.setPreviousStatus(previousStatus);
        record.setCurrentStatus(booking.getStatus());
        record.setPaymentStatus(booking.getPaymentStatus());
        commandIdempotencyRepository.save(record);
    }

    private String nextAction(Booking booking) {
        return switch (booking.getStatus()) {
            case PENDING_APPROVAL -> "WAIT_STAFF_APPROVAL";
            case PENDING_PAYMENT -> "COMPLETE_PAYMENT";
            case CONFIRMED -> "VIEW_QR";
            case CHECKED_IN, OVERDUE -> "WAIT_CHECK_OUT";
            default -> null;
        };
    }

    private Specification<Booking> staffBookingSpecification(UUID staffId, UUID parkingLotId, BookingStatus status,
                                                             OffsetDateTime startFrom, OffsetDateTime endTo,
                                                             VehicleType vehicleType, String bookingCode,
                                                             String plateNumber) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            var staffAssignment = query.subquery(UUID.class);
            var parkingLotStaff = staffAssignment.from(ParkingLotStaff.class);
            staffAssignment.select(parkingLotStaff.get("id"));
            staffAssignment.where(
                    criteriaBuilder.equal(parkingLotStaff.get("staff").get("id"), staffId),
                    criteriaBuilder.equal(parkingLotStaff.get("parkingLot").get("id"), root.get("parkingLot").get("id"))
            );
            predicates.add(criteriaBuilder.exists(staffAssignment));

            if (parkingLotId != null) {
                predicates.add(criteriaBuilder.equal(root.get("parkingLot").get("id"), parkingLotId));
            }
            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }
            if (startFrom != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("startTime"), startFrom));
            }
            if (endTo != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("endTime"), endTo));
            }
            if (vehicleType != null) {
                predicates.add(criteriaBuilder.equal(root.get("vehicleType"), vehicleType));
            }
            if (bookingCode != null) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("bookingCode")),
                        "%" + bookingCode.toLowerCase(Locale.ROOT) + "%"
                ));
            }
            if (plateNumber != null) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("vehicle").get("plateNumber")),
                        "%" + plateNumber.toLowerCase(Locale.ROOT) + "%"
                ));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
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
