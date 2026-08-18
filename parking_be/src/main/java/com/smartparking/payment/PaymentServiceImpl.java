package com.smartparking.payment;

import com.smartparking.audit.AuditService;
import com.smartparking.booking.Booking;
import com.smartparking.booking.BookingRepository;
import com.smartparking.booking.BookingStatusHistory;
import com.smartparking.booking.BookingStatusHistoryRepository;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.PaymentStatus;
import com.smartparking.common.PaymentTransactionStatus;
import com.smartparking.common.RefundStatus;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.idempotency.IdempotencyKey;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.notification.Notification;
import com.smartparking.notification.NotificationRepository;
import com.smartparking.payment.dto.PaymentDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class PaymentServiceImpl implements PaymentService {
    private final PaymentRepository paymentRepository;
    private final PaymentTransactionRepository transactionRepository;
    private final RefundRepository refundRepository;
    private final BookingRepository bookingRepository;
    private final BookingStatusHistoryRepository bookingStatusHistoryRepository;
    private final PaymentMapper mapper;
    private final AuditService auditService;
    private final NotificationRepository notificationRepository;
    private final SmartParkingProperties properties;

    public PaymentServiceImpl(PaymentRepository paymentRepository,
                              PaymentTransactionRepository transactionRepository,
                              RefundRepository refundRepository,
                              BookingRepository bookingRepository,
                              BookingStatusHistoryRepository bookingStatusHistoryRepository,
                              PaymentMapper mapper,
                              AuditService auditService,
                              NotificationRepository notificationRepository,
                              SmartParkingProperties properties) {
        this.paymentRepository = paymentRepository;
        this.transactionRepository = transactionRepository;
        this.refundRepository = refundRepository;
        this.bookingRepository = bookingRepository;
        this.bookingStatusHistoryRepository = bookingStatusHistoryRepository;
        this.mapper = mapper;
        this.auditService = auditService;
        this.notificationRepository = notificationRepository;
        this.properties = properties;
    }

    @Override
    @Transactional
    public PaymentDtos.PaymentResponse create(CurrentUser currentUser, UUID bookingId, PaymentDtos.CreatePaymentRequest request, String idempotencyKey) {
        idempotencyKey = IdempotencyKey.normalize(idempotencyKey);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = paymentRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return mapper.toResponse(existing.get());
            }
        }
        Booking booking = bookingRepository.findByIdAndCustomerId(bookingId, currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Booking không tồn tại"));
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Booking chưa ở trạng thái PENDING_PAYMENT");
        }
        if (request.paymentMethod() != booking.getPaymentMethod()) {
            throw new BusinessException(ErrorCode.PAYMENT_PROVIDER_ERROR, "Payment method không khớp booking");
        }
        Payment payment = paymentRepository.findByBookingIdAndPaymentMethod(bookingId, request.paymentMethod())
                .orElseGet(() -> {
                    Payment created = new Payment();
                    created.setBooking(booking);
                    created.setPaymentMethod(request.paymentMethod());
                    return created;
                });
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(booking.getTotalAmount());
        payment.setCurrency(booking.getCurrency());
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            payment.setIdempotencyKey(idempotencyKey);
        }
        payment = paymentRepository.save(payment);
        booking.setPaymentStatus(PaymentStatus.PENDING);
        auditService.record(currentUser.id(), currentUser.role(), "CREATE", "PAYMENT", payment.getId().toString(), null, payment.getStatus().name(), null);
        return mapper.toResponse(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentDtos.PaymentResponse> customerBookingPayments(CurrentUser currentUser, UUID bookingId) {
        bookingRepository.findByIdAndCustomerId(bookingId, currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Booking không tồn tại"));
        return paymentRepository.findByBookingId(bookingId).stream().map(mapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentDtos.PaymentResponse customerPayment(CurrentUser currentUser, UUID paymentId) {
        return mapper.toResponse(paymentRepository.findByIdAndBookingCustomerId(paymentId, currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND, "Payment không tồn tại")));
    }

    @Override
    @Transactional
    public PaymentDtos.PaymentResponse webhook(String provider, PaymentDtos.WebhookRequest request, String signature, String idempotencyKey) {
        idempotencyKey = IdempotencyKey.normalize(idempotencyKey);
        verifySignature(request.rawPayload() == null || request.rawPayload().isBlank()
                ? request.providerTransactionId()
                : request.rawPayload(), signature);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existingByIdempotency = transactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existingByIdempotency.isPresent()) {
                return mapper.toResponse(existingByIdempotency.get().getPayment());
            }
        }
        var existingTransaction = transactionRepository.findByProviderAndProviderTransactionId(provider, request.providerTransactionId());
        if (existingTransaction.isPresent()) {
            return mapper.toResponse(existingTransaction.get().getPayment());
        }
        Payment payment = paymentRepository.findById(UUID.fromString(request.paymentId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND, "Payment không tồn tại"));
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new BusinessException(ErrorCode.PAYMENT_ALREADY_COMPLETED, "Payment không ở trạng thái PENDING");
        }
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setPayment(payment);
        transaction.setProvider(provider);
        transaction.setProviderTransactionId(request.providerTransactionId());
        transaction.setIdempotencyKey(blankToNull(idempotencyKey));
        transaction.setStatus(request.status());
        transaction.setRawPayload(request.rawPayload());
        transactionRepository.save(transaction);
        payment.setProvider(provider);
        payment.setProviderTransactionId(request.providerTransactionId());
        if (request.status() == PaymentTransactionStatus.SUCCESS) {
            Booking booking = payment.getBooking();
            if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
                if (booking.getStatus() == BookingStatus.EXPIRED) {
                    throw new BusinessException(ErrorCode.BUSINESS_DECISION_REQUIRED, "Payment success sau booking expired chưa được chốt nghiệp vụ");
                }
                throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Booking không ở trạng thái PENDING_PAYMENT");
            }
            BookingStatus previous = booking.getStatus();
            BookingStatus nextStatus = booking.getActualCheckOutTime() == null ? BookingStatus.CONFIRMED : BookingStatus.CHECKED_OUT;
            payment.setStatus(PaymentStatus.PAID);
            booking.setPaymentStatus(PaymentStatus.PAID);
            booking.setStatus(nextStatus);
            history(booking, previous, nextStatus, "Payment callback success");
            auditService.record(null, null, "PAYMENT_SUCCESS", "BOOKING", booking.getId().toString(), previous.name(), nextStatus.name(), provider);
            notifyCustomer(booking, "PAYMENT_SUCCESS", "Thanh toán thành công", "Booking " + booking.getBookingCode() + " đã thanh toán thành công");
        } else if (request.status() == PaymentTransactionStatus.FAILED) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.getBooking().setPaymentStatus(PaymentStatus.FAILED);
            auditService.record(null, null, "PAYMENT_FAILED", "PAYMENT", payment.getId().toString(), PaymentStatus.PENDING.name(), PaymentStatus.FAILED.name(), provider);
            notifyCustomer(payment.getBooking(), "PAYMENT_FAILED", "Thanh toán thất bại", "Thanh toán cho booking " + payment.getBooking().getBookingCode() + " thất bại");
        }
        return mapper.toResponse(payment);
    }

    @Override
    @Transactional
    public PaymentDtos.RefundResponse refund(CurrentUser currentUser, UUID paymentId, PaymentDtos.RefundRequest request, String idempotencyKey) {
        idempotencyKey = IdempotencyKey.normalize(idempotencyKey);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = refundRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return mapper.toResponse(existing.get());
            }
        }
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND, "Payment không tồn tại"));
        if (payment.getStatus() != PaymentStatus.PAID && payment.getStatus() != PaymentStatus.PARTIALLY_REFUNDED) {
            throw new BusinessException(ErrorCode.REFUND_AMOUNT_INVALID, "Payment không đủ điều kiện refund");
        }
        BigDecimal refunded = refundRepository.sumSucceededAmountByPaymentId(paymentId);
        if (refunded.add(request.amount()).compareTo(payment.getAmount()) > 0) {
            throw new BusinessException(ErrorCode.REFUND_AMOUNT_INVALID, "Amount vượt quá refundable amount");
        }
        Refund refund = new Refund();
        refund.setPayment(payment);
        refund.setAmount(request.amount());
        refund.setCurrency(payment.getCurrency());
        refund.setStatus(RefundStatus.SUCCEEDED);
        refund.setReason(request.reason());
        refund.setIdempotencyKey(idempotencyKey);
        refund = refundRepository.save(refund);
        payment.setStatus(refunded.add(request.amount()).compareTo(payment.getAmount()) == 0
                ? PaymentStatus.REFUNDED
                : PaymentStatus.PARTIALLY_REFUNDED);
        auditService.record(currentUser.id(), currentUser.role(), "REFUND", "PAYMENT", payment.getId().toString(), null, payment.getStatus().name(), request.reason());
        return mapper.toResponse(refund);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PaymentDtos.RefundResponse> refunds(Pageable pageable) {
        return refundRepository.findAll(pageable).map(mapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentDtos.RefundResponse refundDetail(UUID refundId) {
        return refundRepository.findById(refundId)
                .map(mapper::toResponse)
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND, "Refund không tồn tại"));
    }

    private void verifySignature(String payload, String signature) {
        String expected = hmacSha256(payload, properties.payment().webhookSecret());
        if (signature == null || !MessageDigestSafe.equals(expected, signature)) {
            throw new BusinessException(ErrorCode.PAYMENT_SIGNATURE_INVALID, "Payment signature không hợp lệ");
        }
    }

    private String hmacSha256(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private void history(Booking booking, BookingStatus previous, BookingStatus current, String reason) {
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(booking);
        history.setPreviousStatus(previous);
        history.setCurrentStatus(current);
        history.setReason(reason);
        bookingStatusHistoryRepository.save(history);
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

    private static final class MessageDigestSafe {
        static boolean equals(String expected, String actual) {
            return java.security.MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    actual.getBytes(StandardCharsets.UTF_8)
            );
        }
    }
}
