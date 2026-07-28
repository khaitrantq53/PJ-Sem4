package com.smartparking.payment;

import com.smartparking.payment.dto.PaymentDtos;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper {
    public PaymentDtos.PaymentResponse toResponse(Payment payment) {
        return new PaymentDtos.PaymentResponse(
                payment.getId(),
                payment.getBooking().getId(),
                payment.getPaymentMethod(),
                payment.getStatus(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getProvider(),
                payment.getProviderTransactionId(),
                payment.getVersion(),
                payment.getCreatedAt(),
                payment.getUpdatedAt()
        );
    }

    public PaymentDtos.RefundResponse toResponse(Refund refund) {
        return new PaymentDtos.RefundResponse(
                refund.getId(),
                refund.getPayment().getId(),
                refund.getAmount(),
                refund.getCurrency(),
                refund.getStatus(),
                refund.getReason(),
                refund.getVersion(),
                refund.getCreatedAt()
        );
    }
}
