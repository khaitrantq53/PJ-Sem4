package com.smartparking.payment;

import com.smartparking.common.security.CurrentUser;
import com.smartparking.payment.dto.PaymentDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface PaymentService {
    PaymentDtos.PaymentResponse create(CurrentUser currentUser, UUID bookingId, PaymentDtos.CreatePaymentRequest request, String idempotencyKey);

    List<PaymentDtos.PaymentResponse> customerBookingPayments(CurrentUser currentUser, UUID bookingId);

    PaymentDtos.PaymentResponse customerPayment(CurrentUser currentUser, UUID paymentId);

    PaymentDtos.PaymentResponse webhook(String provider, PaymentDtos.WebhookRequest request, String signature, String idempotencyKey);

    PaymentDtos.RefundResponse refund(CurrentUser currentUser, UUID paymentId, PaymentDtos.RefundRequest request, String idempotencyKey);

    Page<PaymentDtos.RefundResponse> refunds(Pageable pageable);

    PaymentDtos.RefundResponse refundDetail(UUID refundId);
}
