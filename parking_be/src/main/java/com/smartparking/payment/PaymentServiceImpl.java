package com.smartparking.payment;

import com.smartparking.audit.AuditService;
import com.smartparking.booking.Booking;
import com.smartparking.booking.BookingRepository;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.PaymentStatus;
import com.smartparking.common.PaymentTransactionStatus;
import com.smartparking.common.RefundStatus;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
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
    private final PaymentMapper mapper;
    private final AuditService auditService;
    private final SmartParkingProperties properties;

    public PaymentServiceImpl(PaymentRepository paymentRepository,
                              PaymentTransactionRepository transactionRepository,
                              RefundRepository refundRepository,
                              BookingRepository bookingRepository,
                              PaymentMapper mapper,
                              AuditService auditService,
                              SmartParkingProperties properties) {
        this.paymentRepository = paymentRepository;
        this.transactionRepository = transactionRepository;
        this.refundRepository = refundRepository;
        this.bookingRepository = bookingRepository;
        this.mapper = mapper;
        this.auditService = auditService;
        this.properties = properties;
    }

    @Override
    @Transactional
    public PaymentDtos.PaymentResponse create(CurrentUser currentUser, UUID bookingId, PaymentDtos.CreatePaymentRequest request, String idempotencyKey) {
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
        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setPaymentMethod(request.paymentMethod());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(booking.getTotalAmount());
        payment.setCurrency(booking.getCurrency());
        payment.setIdempotencyKey(idempotencyKey);
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
        verifySignature(request.providerTransactionId(), signature);
        var existingTransaction = transactionRepository.findByProviderAndProviderTransactionId(provider, request.providerTransactionId());
        if (existingTransaction.isPresent()) {
            return mapper.toResponse(existingTransaction.get().getPayment());
        }
        Payment payment = paymentRepository.findById(UUID.fromString(request.paymentId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND, "Payment không tồn tại"));
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setPayment(payment);
        transaction.setProvider(provider);
        transaction.setProviderTransactionId(request.providerTransactionId());
        transaction.setStatus(request.status());
        transaction.setRawPayload(request.rawPayload());
        transactionRepository.save(transaction);
        payment.setProvider(provider);
        payment.setProviderTransactionId(request.providerTransactionId());
        if (request.status() == PaymentTransactionStatus.SUCCESS) {
            payment.setStatus(PaymentStatus.PAID);
            payment.getBooking().setPaymentStatus(PaymentStatus.PAID);
            payment.getBooking().setStatus(BookingStatus.CONFIRMED);
        } else if (request.status() == PaymentTransactionStatus.FAILED) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.getBooking().setPaymentStatus(PaymentStatus.FAILED);
        }
        return mapper.toResponse(payment);
    }

    @Override
    @Transactional
    public PaymentDtos.RefundResponse refund(CurrentUser currentUser, UUID paymentId, PaymentDtos.RefundRequest request, String idempotencyKey) {
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
        BigDecimal refunded = refundRepository.findAll().stream()
                .filter(refund -> refund.getPayment().getId().equals(paymentId) && refund.getStatus() == RefundStatus.SUCCEEDED)
                .map(Refund::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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

    private static final class MessageDigestSafe {
        static boolean equals(String expected, String actual) {
            return java.security.MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    actual.getBytes(StandardCharsets.UTF_8)
            );
        }
    }
}
