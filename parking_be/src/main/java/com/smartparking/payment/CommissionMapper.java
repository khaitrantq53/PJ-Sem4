package com.smartparking.payment;

import com.smartparking.payment.dto.CommissionDtos;
import org.springframework.stereotype.Component;

@Component
public class CommissionMapper {
    public CommissionDtos.CommissionResponse toResponse(StaffCommission commission, boolean includeStaffNetAmount) {
        return new CommissionDtos.CommissionResponse(
                commission.getId(),
                commission.getStaff().getId(),
                commission.getStaff().getEmail(),
                commission.getStaff().getEmail(),
                commission.getParkingLot().getId(),
                commission.getParkingLot().getName(),
                commission.getBooking().getId(),
                commission.getBooking().getBookingCode(),
                commission.getPayment().getId(),
                commission.getGrossAmount(),
                commission.getCommissionRate(),
                commission.getCommissionAmount(),
                includeStaffNetAmount ? commission.getStaffNetAmount() : null,
                commission.getCurrency(),
                commission.getStatus(),
                commission.getPayment().getPaymentMethod(),
                commission.getPaidAt(),
                commission.getVersion(),
                commission.getCreatedAt()
        );
    }

}
