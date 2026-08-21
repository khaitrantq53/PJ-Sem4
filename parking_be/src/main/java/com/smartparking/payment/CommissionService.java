package com.smartparking.payment;

import com.smartparking.common.CommissionStatus;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.payment.dto.CommissionDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CommissionService {
    void recordPaidPayment(Payment payment);

    CommissionDtos.CommissionSummaryResponse staffSummary(CurrentUser currentUser, CommissionStatus status, String period);

    Page<CommissionDtos.CommissionResponse> staffCommissions(CurrentUser currentUser, CommissionStatus status, String period, Pageable pageable);

    CommissionDtos.CommissionSummaryResponse adminSummary(String period);

    Page<CommissionDtos.CommissionResponse> adminCommissions(CommissionStatus status, String period, Pageable pageable);

    CommissionDtos.CommissionResponse markCollected(CurrentUser currentUser, UUID commissionId);
}
