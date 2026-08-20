package com.smartparking.staff;

import com.smartparking.booking.BookingRepository;
import com.smartparking.capacity.ParkingCapacityBlockRepository;
import com.smartparking.capacity.ParkingVehicleCapacity;
import com.smartparking.capacity.ParkingVehicleCapacityRepository;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.device.DeviceRepository;
import com.smartparking.parking.ParkingLotStaffRepository;
import com.smartparking.payment.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class StaffDashboardServiceImpl implements StaffDashboardService {
    private static final DateTimeFormatter DAY_LABEL_FORMAT = DateTimeFormatter.ofPattern("dd MMM", Locale.ENGLISH);

    private final ParkingLotStaffRepository staffRepository;
    private final ParkingVehicleCapacityRepository capacityRepository;
    private final ParkingCapacityBlockRepository blockRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final DeviceRepository deviceRepository;
    private final SmartParkingProperties properties;

    public StaffDashboardServiceImpl(ParkingLotStaffRepository staffRepository,
                                     ParkingVehicleCapacityRepository capacityRepository,
                                     ParkingCapacityBlockRepository blockRepository,
                                     BookingRepository bookingRepository,
                                     PaymentRepository paymentRepository,
                                     DeviceRepository deviceRepository,
                                     SmartParkingProperties properties) {
        this.staffRepository = staffRepository;
        this.capacityRepository = capacityRepository;
        this.blockRepository = blockRepository;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.deviceRepository = deviceRepository;
        this.properties = properties;
    }

    @Override
    @Transactional(readOnly = true)
    public StaffDtos.DashboardSummaryResponse summary(CurrentUser currentUser, UUID parkingLotId) {
        if (parkingLotId != null && !staffRepository.existsByParkingLotIdAndStaffId(parkingLotId, currentUser.id())) {
            throw new BusinessException(ErrorCode.PARKING_LOT_ACCESS_DENIED, "Staff không được phân công bãi xe này");
        }
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime instantEnd = now.plusSeconds(1);
        List<ParkingVehicleCapacity> capacities = capacityRepository.findForStaff(currentUser.id(), parkingLotId);
        long occupied = 0;
        long reserved = 0;
        long blocked = 0;
        long available = 0;
        for (ParkingVehicleCapacity capacity : capacities) {
            UUID lotId = capacity.getParkingLot().getId();
            long occupiedForCapacity = bookingRepository.countCurrentCheckedInCapacity(lotId, capacity.getVehicleType(),
                    List.of(BookingStatus.CHECKED_IN));
            long reservedForCapacity = bookingRepository.countActiveReservations(lotId, capacity.getVehicleType(),
                    List.of(BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED), now, instantEnd);
            long blockedForCapacity = blockRepository.countBlocked(lotId, capacity.getVehicleType(), now, instantEnd);
            occupied += occupiedForCapacity;
            reserved += reservedForCapacity;
            blocked += blockedForCapacity;
            available += Math.max(0, capacity.getTotalCapacity() - occupiedForCapacity - reservedForCapacity - blockedForCapacity);
        }
        OffsetDateTime startOfDay = now.toLocalDate().atStartOfDay().atOffset(now.getOffset());
        OffsetDateTime nextDay = startOfDay.plusDays(1);
        BigDecimal revenue = paymentRepository.revenueTodayForStaff(currentUser.id(), parkingLotId, startOfDay, nextDay);
        return new StaffDtos.DashboardSummaryResponse(
                parkingLotId,
                occupied,
                reserved,
                blocked,
                available,
                bookingRepository.countForStaffByStatus(currentUser.id(), parkingLotId, BookingStatus.PENDING_APPROVAL),
                bookingRepository.countTodayForStaff(currentUser.id(), parkingLotId, startOfDay, nextDay),
                revenue,
                properties.pricing().currency(),
                deviceRepository.countOfflineForStaff(currentUser.id(), parkingLotId)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public StaffDtos.PerformanceResponse performance(CurrentUser currentUser, UUID parkingLotId, String metric, String range) {
        if (parkingLotId != null && !staffRepository.existsByParkingLotIdAndStaffId(parkingLotId, currentUser.id())) {
            throw new BusinessException(ErrorCode.PARKING_LOT_ACCESS_DENIED, "Staff không được phân công bãi xe này");
        }

        String normalizedMetric = normalizeMetric(metric);
        String normalizedRange = normalizeRange(range);
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime todayStart = now.toLocalDate().atStartOfDay().atOffset(now.getOffset());
        List<StaffDtos.PerformanceBucketResponse> buckets = new ArrayList<>();

        if ("today".equals(normalizedRange)) {
            for (int hour = 0; hour < 24; hour += 4) {
                OffsetDateTime startTime = todayStart.plusHours(hour);
                OffsetDateTime endTime = startTime.plusHours(4);
                String label = "%02d-%02d".formatted(hour, Math.min(hour + 3, 23));
                buckets.add(new StaffDtos.PerformanceBucketResponse(
                        label,
                        startTime,
                        endTime,
                        performanceValue(currentUser.id(), parkingLotId, normalizedMetric, startTime, endTime)
                ));
            }
        } else {
            int days = Integer.parseInt(normalizedRange);
            OffsetDateTime firstDay = todayStart.minusDays(days - 1L);
            for (int index = 0; index < days; index++) {
                OffsetDateTime startTime = firstDay.plusDays(index);
                OffsetDateTime endTime = startTime.plusDays(1);
                buckets.add(new StaffDtos.PerformanceBucketResponse(
                        startTime.format(DAY_LABEL_FORMAT),
                        startTime,
                        endTime,
                        performanceValue(currentUser.id(), parkingLotId, normalizedMetric, startTime, endTime)
                ));
            }
        }

        return new StaffDtos.PerformanceResponse(normalizedMetric, normalizedRange, properties.pricing().currency(), buckets);
    }

    private String normalizeMetric(String metric) {
        String normalized = metric == null ? "bookings" : metric.trim().toLowerCase(Locale.ROOT);
        return "revenue".equals(normalized) ? "revenue" : "bookings";
    }

    private String normalizeRange(String range) {
        String normalized = range == null ? "today" : range.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "7", "30" -> normalized;
            default -> "today";
        };
    }

    private BigDecimal performanceValue(UUID staffId, UUID parkingLotId, String metric, OffsetDateTime startTime, OffsetDateTime endTime) {
        if ("revenue".equals(metric)) {
            return paymentRepository.revenueForStaffBetween(staffId, parkingLotId, startTime, endTime);
        }

        return BigDecimal.valueOf(bookingRepository.countForStaffBetween(staffId, parkingLotId, startTime, endTime));
    }
}
