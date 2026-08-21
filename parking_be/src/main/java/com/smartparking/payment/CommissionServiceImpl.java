package com.smartparking.payment;

import com.smartparking.audit.AuditService;
import com.smartparking.common.CommissionStatus;
import com.smartparking.common.PaymentStatus;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.parking.ParkingLotStaff;
import com.smartparking.parking.ParkingLotStaffRepository;
import com.smartparking.payment.dto.CommissionDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;

@Service
public class CommissionServiceImpl implements CommissionService {
    private static final String DEFAULT_CURRENCY = "VND";
    private final StaffCommissionRepository commissionRepository;
    private final ParkingLotStaffRepository lotStaffRepository;
    private final CommissionMapper mapper;
    private final SmartParkingProperties properties;
    private final AuditService auditService;

    public CommissionServiceImpl(StaffCommissionRepository commissionRepository,
                                 ParkingLotStaffRepository lotStaffRepository,
                                 CommissionMapper mapper,
                                 SmartParkingProperties properties,
                                 AuditService auditService) {
        this.commissionRepository = commissionRepository;
        this.lotStaffRepository = lotStaffRepository;
        this.mapper = mapper;
        this.properties = properties;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public void recordPaidPayment(Payment payment) {
        if (payment == null || payment.getStatus() != PaymentStatus.PAID || commissionRepository.existsByPaymentId(payment.getId())) {
            return;
        }

        ParkingLotStaff lotStaff = lotStaffRepository.findFirstByParkingLotId(payment.getBooking().getParkingLot().getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_ACCESS_DENIED, "Parking lot chưa có staff quản lý"));
        BigDecimal grossAmount = money(payment.getAmount());
        BigDecimal rate = properties.commission().staffRate();
        BigDecimal commissionAmount = grossAmount.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        StaffCommission commission = new StaffCommission();
        commission.setStaff(lotStaff.getStaff());
        commission.setParkingLot(payment.getBooking().getParkingLot());
        commission.setBooking(payment.getBooking());
        commission.setPayment(payment);
        commission.setGrossAmount(grossAmount);
        commission.setCommissionRate(rate);
        commission.setCommissionAmount(commissionAmount);
        commission.setStaffNetAmount(grossAmount.subtract(commissionAmount));
        commission.setCurrency(payment.getCurrency() == null ? DEFAULT_CURRENCY : payment.getCurrency());
        commission.setStatus(CommissionStatus.PAYABLE);
        commissionRepository.save(commission);
    }

    @Override
    @Transactional(readOnly = true)
    public CommissionDtos.CommissionSummaryResponse staffSummary(CurrentUser currentUser, CommissionStatus status, String period) {
        return summary(currentUser.id(), true, status, period);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CommissionDtos.CommissionResponse> staffCommissions(CurrentUser currentUser, CommissionStatus status, String period, Pageable pageable) {
        DateWindow window = dateWindow(period);
        Page<StaffCommission> page = commissionRepository.findFiltered(currentUser.id(), status, window.startTime(), window.endTime(), pageable);
        return page.map(commission -> mapper.toResponse(commission, true));
    }

    @Override
    @Transactional(readOnly = true)
    public CommissionDtos.CommissionSummaryResponse adminSummary(String period) {
        return summary(null, true, null, period);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CommissionDtos.CommissionResponse> adminCommissions(CommissionStatus status, String period, Pageable pageable) {
        DateWindow window = dateWindow(period);
        Page<StaffCommission> page = commissionRepository.findFiltered(null, status, window.startTime(), window.endTime(), pageable);
        return page.map(commission -> mapper.toResponse(commission, true));
    }

    @Override
    @Transactional
    public CommissionDtos.CommissionResponse markCollected(CurrentUser currentUser, UUID commissionId) {
        StaffCommission commission = commissionRepository.findById(commissionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND, "Commission không tồn tại"));
        if (commission.getStatus() != CommissionStatus.PAYABLE) {
            return mapper.toResponse(commission, true);
        }

        CommissionStatus previous = commission.getStatus();
        commission.setStatus(CommissionStatus.PAID);
        commission.setPaidAt(OffsetDateTime.now());
        auditService.record(currentUser.id(), currentUser.role(), "MARK_COMMISSION_COLLECTED", "STAFF_COMMISSION",
                commission.getId().toString(), previous.name(), commission.getStatus().name(), null);
        return mapper.toResponse(commission, true);
    }

    private CommissionDtos.CommissionSummaryResponse summary(UUID staffId, boolean includeStaffNetAmount,
                                                            CommissionStatus status, String period) {
        DateWindow window = dateWindow(period);
        OffsetDateTime today = OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate()
                .atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime();
        OffsetDateTime tomorrow = today.plusDays(1);
        BigDecimal deductedAmount = commissionRepository.sumCommissionFiltered(staffId, CommissionStatus.DEDUCTED, window.startTime(), window.endTime());
        BigDecimal paidAmount = commissionRepository.sumCommissionFiltered(staffId, CommissionStatus.PAID, window.startTime(), window.endTime());
        return new CommissionDtos.CommissionSummaryResponse(
                commissionRepository.sumGrossFiltered(staffId, status, window.startTime(), window.endTime()),
                commissionRepository.sumCommissionFiltered(staffId, status, window.startTime(), window.endTime()),
                includeStaffNetAmount ? commissionRepository.sumStaffNetFiltered(staffId, status, window.startTime(), window.endTime()) : null,
                commissionRepository.countFiltered(staffId, status, window.startTime(), window.endTime()),
                commissionRepository.sumCommissionFiltered(staffId, CommissionStatus.PAYABLE, window.startTime(), window.endTime()),
                deductedAmount.add(paidAmount),
                commissionRepository.sumCommissionBetween(staffId, today, tomorrow),
                DEFAULT_CURRENCY
        );
    }

    private DateWindow dateWindow(String period) {
        if (period == null || period.isBlank()) {
            return fullDateWindow();
        }

        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        OffsetDateTime endTime = OffsetDateTime.now(zone).toLocalDate()
                .plusDays(1)
                .atStartOfDay(zone)
                .toOffsetDateTime();
        String normalized = period.trim().toLowerCase(Locale.ROOT);
        int days = switch (normalized) {
            case "today", "todays", "day", "1", "1day" -> 1;
            case "7", "7day", "7days", "week" -> 7;
            case "30", "30day", "30days", "month" -> 30;
            default -> 0;
        };

        if (days == 0) {
            return fullDateWindow();
        }

        return new DateWindow(endTime.minusDays(days), endTime);
    }

    private DateWindow fullDateWindow() {
        return new DateWindow(
                OffsetDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(9999, 12, 31, 23, 59, 59, 0, ZoneOffset.UTC)
        );
    }

    private record DateWindow(OffsetDateTime startTime, OffsetDateTime endTime) {
    }

    private BigDecimal money(BigDecimal amount) {
        return (amount == null ? BigDecimal.ZERO : amount).setScale(2, RoundingMode.HALF_UP);
    }
}
