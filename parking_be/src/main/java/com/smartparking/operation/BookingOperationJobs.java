package com.smartparking.operation;

import com.smartparking.audit.AuditService;
import com.smartparking.booking.Booking;
import com.smartparking.booking.BookingCapacityReservationRepository;
import com.smartparking.booking.BookingRepository;
import com.smartparking.booking.BookingStatusHistory;
import com.smartparking.booking.BookingStatusHistoryRepository;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.device.Device;
import com.smartparking.device.DeviceRepository;
import com.smartparking.notification.Notification;
import com.smartparking.notification.NotificationRepository;
import com.smartparking.promotion.Promotion;
import com.smartparking.promotion.PromotionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Component
public class BookingOperationJobs {
    private static final Logger log = LoggerFactory.getLogger(BookingOperationJobs.class);

    private final BookingRepository bookingRepository;
    private final BookingCapacityReservationRepository reservationRepository;
    private final BookingStatusHistoryRepository historyRepository;
    private final DeviceRepository deviceRepository;
    private final PromotionRepository promotionRepository;
    private final NotificationRepository notificationRepository;
    private final AuditService auditService;
    private final SmartParkingProperties properties;

    public BookingOperationJobs(BookingRepository bookingRepository,
                                BookingCapacityReservationRepository reservationRepository,
                                BookingStatusHistoryRepository historyRepository,
                                DeviceRepository deviceRepository,
                                PromotionRepository promotionRepository,
                                NotificationRepository notificationRepository,
                                AuditService auditService,
                                SmartParkingProperties properties) {
        this.bookingRepository = bookingRepository;
        this.reservationRepository = reservationRepository;
        this.historyRepository = historyRepository;
        this.deviceRepository = deviceRepository;
        this.promotionRepository = promotionRepository;
        this.notificationRepository = notificationRepository;
        this.auditService = auditService;
        this.properties = properties;
    }

    @Scheduled(cron = "${smart-parking.jobs.expire-pending-payment-cron}")
    @Transactional
    public void expirePendingPaymentBookings() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Booking> bookings = bookingRepository
                .findByStatusAndHoldExpiresAtBefore(BookingStatus.PENDING_PAYMENT, now, batch())
                .getContent();
        bookings.forEach(booking -> transitionBooking(booking, BookingStatus.EXPIRED, "Expire pending payment"));
        log.info("ExpirePendingPaymentBookingJob processed {}", bookings.size());
    }

    @Scheduled(cron = "${smart-parking.jobs.expire-pending-approval-cron}")
    @Transactional
    public void expirePendingApprovalBookings() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Booking> bookings = bookingRepository
                .findByStatusAndApprovalExpiresAtBefore(BookingStatus.PENDING_APPROVAL, now, batch())
                .getContent();
        bookings.forEach(booking -> transitionBooking(booking, BookingStatus.EXPIRED, "Expire pending approval"));
        log.info("ExpirePendingApprovalBookingJob processed {}", bookings.size());
    }

    @Scheduled(cron = "${smart-parking.jobs.mark-no-show-cron}")
    @Transactional
    public void markNoShowBookings() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(properties.operation().checkInLateMinutes());
        List<Booking> bookings = bookingRepository
                .findByStatusAndStartTimeBefore(BookingStatus.CONFIRMED, cutoff, batch())
                .getContent();
        bookings.forEach(booking -> transitionBooking(booking, BookingStatus.NO_SHOW, "Mark no-show"));
        log.info("MarkNoShowBookingJob processed {}", bookings.size());
    }

    @Scheduled(cron = "${smart-parking.jobs.mark-overdue-cron}")
    @Transactional
    public void markOverdueBookings() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(properties.operation().checkoutGraceMinutes());
        List<Booking> bookings = bookingRepository
                .findByStatusAndEndTimeBefore(BookingStatus.CHECKED_IN, cutoff, batch())
                .getContent();
        bookings.forEach(booking -> transitionBooking(booking, BookingStatus.OVERDUE, "Mark overdue"));
        log.info("MarkOverdueBookingJob processed {}", bookings.size());
    }

    @Scheduled(cron = "${smart-parking.jobs.mark-device-offline-cron}")
    @Transactional
    public void markDeviceOffline() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(properties.operation().deviceOfflineThresholdMinutes());
        List<Device> devices = deviceRepository.findOfflineCandidates(cutoff, batch());
        devices.forEach(device -> device.setStatus("OFFLINE"));
        log.info("MarkDeviceOfflineJob processed {}", devices.size());
    }

    @Scheduled(cron = "${smart-parking.jobs.expire-promotion-cron}")
    @Transactional
    public void expirePromotions() {
        List<Promotion> promotions = promotionRepository.findByActiveTrueAndEndsAtBefore(OffsetDateTime.now(), batch());
        promotions.forEach(promotion -> promotion.setActive(false));
        log.info("ExpirePromotionJob processed {}", promotions.size());
    }

    private void transitionBooking(Booking booking, BookingStatus nextStatus, String reason) {
        BookingStatus previous = booking.getStatus();
        if (previous == nextStatus) {
            return;
        }
        booking.setStatus(nextStatus);
        if (nextStatus == BookingStatus.EXPIRED || nextStatus == BookingStatus.NO_SHOW) {
            releaseReservation(booking);
        }
        history(booking, previous, nextStatus, reason);
        auditService.record(null, null, "JOB_" + nextStatus.name(), "BOOKING", booking.getId().toString(),
                previous.name(), nextStatus.name(), reason);
        notifyCustomer(booking, nextStatus, reason);
    }

    private void releaseReservation(Booking booking) {
        reservationRepository.findByBookingIdAndReleasedFalse(booking.getId())
                .ifPresent(reservation -> reservation.setReleased(true));
    }

    private void history(Booking booking, BookingStatus previous, BookingStatus current, String reason) {
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(booking);
        history.setPreviousStatus(previous);
        history.setCurrentStatus(current);
        history.setReason(reason);
        historyRepository.save(history);
    }

    private void notifyCustomer(Booking booking, BookingStatus status, String reason) {
        Notification notification = new Notification();
        notification.setRecipient(booking.getCustomer());
        notification.setType("BOOKING_" + status.name());
        notification.setTitle("Cập nhật booking");
        notification.setContent("Booking " + booking.getBookingCode() + ": " + reason);
        notificationRepository.save(notification);
    }

    private PageRequest batch() {
        return PageRequest.of(0, properties.jobs().batchSize());
    }
}
