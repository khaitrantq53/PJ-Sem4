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
import java.util.List;
import java.util.UUID;

@Service
public class StaffDashboardServiceImpl implements StaffDashboardService {
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
            long occupiedForCapacity = bookingRepository.countActiveReservations(lotId, capacity.getVehicleType(),
                    List.of(BookingStatus.CHECKED_IN), now, instantEnd);
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
}
