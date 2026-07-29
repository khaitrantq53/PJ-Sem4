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
import com.smartparking.common.security.CurrentUser;
import com.smartparking.parking.ParkingLot;
import com.smartparking.parking.ParkingOperatingHour;
import com.smartparking.parking.ParkingOperatingHourRepository;
import com.smartparking.parking.ParkingLotRepository;
import com.smartparking.parking.ParkingLotStaffRepository;
import com.smartparking.parking.ParkingServiceEntity;
import com.smartparking.parking.ParkingServiceRepository;
import com.smartparking.pricing.PricingService;
import com.smartparking.notification.Notification;
import com.smartparking.notification.NotificationRepository;
import com.smartparking.vehicle.Vehicle;
import com.smartparking.vehicle.VehicleRepository;
import com.smartparking.vehiclecondition.VehicleConditionRecord;
import com.smartparking.vehiclecondition.VehicleConditionRecordRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class BookingServiceImpl implements BookingService {
    private final BookingRepository bookingRepository;
    private final BookingCapacityReservationRepository reservationRepository;
    private final BookingStatusHistoryRepository historyRepository;
    private final BookingChangeRequestRepository changeRequestRepository;
    private final BookingExtensionRequestRepository extensionRequestRepository;
    private final BookingServiceItemRepository serviceItemRepository;
    private final BookingPriceItemRepository priceItemRepository;
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
    private final VehicleConditionRecordRepository conditionRecordRepository;
    private final NotificationRepository notificationRepository;
    private final SmartParkingProperties properties;

    public BookingServiceImpl(BookingRepository bookingRepository,
                              BookingCapacityReservationRepository reservationRepository,
                              BookingStatusHistoryRepository historyRepository,
                              BookingChangeRequestRepository changeRequestRepository,
                              BookingExtensionRequestRepository extensionRequestRepository,
                              BookingServiceItemRepository serviceItemRepository,
                              BookingPriceItemRepository priceItemRepository,
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
                              VehicleConditionRecordRepository conditionRecordRepository,
                              NotificationRepository notificationRepository,
                              SmartParkingProperties properties) {
        this.bookingRepository = bookingRepository;
        this.reservationRepository = reservationRepository;
        this.historyRepository = historyRepository;
        this.changeRequestRepository = changeRequestRepository;
        this.extensionRequestRepository = extensionRequestRepository;
        this.serviceItemRepository = serviceItemRepository;
        this.priceItemRepository = priceItemRepository;
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
        snapshotPriceItems(booking, breakdown);
        snapshotServices(booking, context.parkingLot().getId(), request.serviceIds());
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
    public Page<BookingDtos.BookingResponse> staffBookings(CurrentUser currentUser, UUID parkingLotId, BookingStatus status,
                                                           OffsetDateTime startFrom, OffsetDateTime endTo,
                                                           VehicleType vehicleType, String bookingCode, String plateNumber,
                                                           Pageable pageable) {
        if (parkingLotId != null) {
            assertStaffAccess(currentUser, parkingLotId);
        }
        if (startFrom != null && endTo != null && !startFrom.isBefore(endTo)) {
            throw new BusinessException(ErrorCode.BOOKING_TIME_INVALID, "startFrom phải nhỏ hơn endTo");
        }
        return bookingRepository.searchForStaff(currentUser.id(), parkingLotId, status, startFrom, endTo, vehicleType,
                blankToNull(bookingCode), blankToNull(plateNumber), pageable).map(mapper::toResponse);
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
        booking.setStatus(booking.getPaymentMethod() == PaymentMethod.CASH ? BookingStatus.CONFIRMED : BookingStatus.PENDING_PAYMENT);
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
                    throw new BusinessException(ErrorCode.BOOKING_TIME_INVALID, "Operating hours qua ngày chưa được chốt nghiệp vụ");
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

    private long availableExcluding(ParkingVehicleCapacity capacity, UUID excludedBookingId, OffsetDateTime startTime, OffsetDateTime endTime) {
        long reserved = bookingRepository.countActiveReservationsExcluding(capacity.getParkingLot().getId(), capacity.getVehicleType(),
                excludedBookingId, properties.booking().activeOverlapStatuses(), startTime, endTime);
        long blocked = blockRepository.countBlocked(capacity.getParkingLot().getId(), capacity.getVehicleType(), startTime, endTime);
        return capacity.getTotalCapacity() - reserved - blocked;
    }

    private BookingDtos.PriceBreakdown recalculateExistingBooking(Booking booking, OffsetDateTime startTime, OffsetDateTime endTime) {
        if (booking.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "Thiếu promotion snapshot để tính lại booking có discount");
        }
        List<UUID> serviceIds = serviceItemRepository.findByBookingId(booking.getId()).stream()
                .map(BookingServiceItem::getServiceId)
                .toList();
        return pricingService.calculate(booking.getParkingLot().getId(), booking.getVehicleType(), startTime, endTime,
                booking.getDeliveryMethod(), serviceIds, null);
    }

    private void updateReservation(Booking booking, OffsetDateTime startTime, OffsetDateTime endTime) {
        BookingCapacityReservation reservation = reservationRepository.findByBookingIdAndReleasedFalse(booking.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Capacity reservation không còn hợp lệ"));
        reservation.setStartTime(startTime);
        reservation.setEndTime(endTime);
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
