package com.smartparking.parking;

import com.smartparking.account.Account;
import com.smartparking.account.AccountRepository;
import com.smartparking.audit.AuditService;
import com.smartparking.booking.BookingRepository;
import com.smartparking.capacity.ParkingCapacityBlockRepository;
import com.smartparking.capacity.ParkingVehicleCapacity;
import com.smartparking.capacity.ParkingVehicleCapacityRepository;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.ParkingLotStatus;
import com.smartparking.common.VehicleType;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.parking.dto.ParkingDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ParkingLotServiceImpl implements ParkingLotService {
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingLotStaffRepository parkingLotStaffRepository;
    private final AccountRepository accountRepository;
    private final ParkingVehicleCapacityRepository capacityRepository;
    private final ParkingCapacityBlockRepository blockRepository;
    private final BookingRepository bookingRepository;
    private final ParkingLotMapper mapper;
    private final AuditService auditService;
    private final SmartParkingProperties properties;

    public ParkingLotServiceImpl(ParkingLotRepository parkingLotRepository,
                                 ParkingLotStaffRepository parkingLotStaffRepository,
                                 AccountRepository accountRepository,
                                 ParkingVehicleCapacityRepository capacityRepository,
                                 ParkingCapacityBlockRepository blockRepository,
                                 BookingRepository bookingRepository,
                                 ParkingLotMapper mapper,
                                 AuditService auditService,
                                 SmartParkingProperties properties) {
        this.parkingLotRepository = parkingLotRepository;
        this.parkingLotStaffRepository = parkingLotStaffRepository;
        this.accountRepository = accountRepository;
        this.capacityRepository = capacityRepository;
        this.blockRepository = blockRepository;
        this.bookingRepository = bookingRepository;
        this.mapper = mapper;
        this.auditService = auditService;
        this.properties = properties;
    }

    @Override
    @Transactional
    public ParkingDtos.ParkingLotResponse create(CurrentUser currentUser, ParkingDtos.CreateParkingLotRequest request) {
        Account staff = accountRepository.findById(currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Account không tồn tại"));
        ParkingLot parkingLot = new ParkingLot();
        parkingLot.setName(request.name());
        parkingLot.setAddress(request.address());
        parkingLot.setLatitude(request.latitude());
        parkingLot.setLongitude(request.longitude());
        parkingLot.setDescription(request.description());
        parkingLot.setStatus(ParkingLotStatus.DRAFT);
        parkingLot = parkingLotRepository.save(parkingLot);

        ParkingLotStaff assignment = new ParkingLotStaff();
        assignment.setParkingLot(parkingLot);
        assignment.setStaff(staff);
        parkingLotStaffRepository.save(assignment);
        auditService.record(currentUser.id(), currentUser.role(), "CREATE", "PARKING_LOT", parkingLot.getId().toString(), null, parkingLot.getStatus().name(), null);
        return mapper.toResponse(parkingLot);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ParkingDtos.ParkingLotResponse> listMine(CurrentUser currentUser, Pageable pageable) {
        return parkingLotRepository.findManagedByStaff(currentUser.id(), pageable).map(mapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ParkingDtos.ParkingLotResponse getForStaff(CurrentUser currentUser, UUID parkingLotId) {
        return mapper.toResponse(getManaged(currentUser, parkingLotId));
    }

    @Override
    @Transactional
    public ParkingDtos.ParkingLotResponse update(CurrentUser currentUser, UUID parkingLotId, ParkingDtos.ParkingLotRequest request) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        assertVersion(parkingLot.getVersion(), request.version());
        if (parkingLot.getStatus() == ParkingLotStatus.CLOSED) {
            throw new BusinessException(ErrorCode.PARKING_LOT_ACCESS_DENIED, "Parking CLOSED không nhận update nghiệp vụ");
        }
        parkingLot.setName(request.name());
        parkingLot.setAddress(request.address());
        parkingLot.setLatitude(request.latitude());
        parkingLot.setLongitude(request.longitude());
        parkingLot.setDescription(request.description());
        auditService.record(currentUser.id(), currentUser.role(), "UPDATE", "PARKING_LOT", parkingLot.getId().toString(), null, parkingLot.getStatus().name(), null);
        return mapper.toResponse(parkingLot);
    }

    @Override
    @Transactional
    public ParkingDtos.ParkingLotResponse submitApproval(CurrentUser currentUser, UUID parkingLotId) {
        return transitionStaff(currentUser, parkingLotId, ParkingLotStatus.DRAFT, ParkingLotStatus.PENDING_APPROVAL, "SUBMIT_APPROVAL", null);
    }

    @Override
    @Transactional
    public ParkingDtos.ParkingLotResponse pause(CurrentUser currentUser, UUID parkingLotId) {
        return transitionStaff(currentUser, parkingLotId, ParkingLotStatus.ACTIVE, ParkingLotStatus.PAUSED, "PAUSE", null);
    }

    @Override
    @Transactional
    public ParkingDtos.ParkingLotResponse resume(CurrentUser currentUser, UUID parkingLotId) {
        return transitionStaff(currentUser, parkingLotId, ParkingLotStatus.PAUSED, ParkingLotStatus.ACTIVE, "RESUME", null);
    }

    @Override
    @Transactional
    public ParkingDtos.ParkingLotResponse requestClosure(CurrentUser currentUser, UUID parkingLotId, String reason) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        if (parkingLot.getStatus() != ParkingLotStatus.ACTIVE && parkingLot.getStatus() != ParkingLotStatus.PAUSED) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Parking lot không thể request closure từ trạng thái hiện tại");
        }
        ParkingLotStatus old = parkingLot.getStatus();
        parkingLot.setStatus(ParkingLotStatus.CLOSURE_REQUESTED);
        auditService.record(currentUser.id(), currentUser.role(), "REQUEST_CLOSURE", "PARKING_LOT", parkingLot.getId().toString(), old.name(), parkingLot.getStatus().name(), reason);
        return mapper.toResponse(parkingLot);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ParkingDtos.ParkingLotResponse> publicActive(Pageable pageable) {
        return parkingLotRepository.findByStatus(ParkingLotStatus.ACTIVE, pageable).map(mapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ParkingDtos.ParkingLotResponse publicDetail(UUID parkingLotId) {
        ParkingLot parkingLot = parkingLotRepository.findById(parkingLotId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_NOT_FOUND, "Parking lot không tồn tại"));
        if (parkingLot.getStatus() != ParkingLotStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.PARKING_LOT_NOT_ACTIVE, "Parking lot chưa ACTIVE");
        }
        return mapper.toResponse(parkingLot);
    }

    @Override
    @Transactional
    public ParkingDtos.CapacityResponse updateCapacity(CurrentUser currentUser, UUID parkingLotId, VehicleType vehicleType,
                                                       ParkingDtos.CapacityRequest request) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        ParkingVehicleCapacity capacity = capacityRepository.findByParkingLotIdAndVehicleType(parkingLotId, vehicleType)
                .orElseGet(() -> {
                    ParkingVehicleCapacity created = new ParkingVehicleCapacity();
                    created.setParkingLot(parkingLot);
                    created.setVehicleType(vehicleType);
                    created.setTotalCapacity(0);
                    return created;
                });
        if (capacity.getVersion() != null) {
            assertVersion(capacity.getVersion(), request.version());
        }
        long reserved = bookingRepository.countActiveReservations(parkingLotId, vehicleType, activeStatuses(), OffsetDateTime.now().minusYears(100), OffsetDateTime.now().plusYears(100));
        if (request.totalCapacity() < reserved) {
            throw new BusinessException(ErrorCode.PARKING_CAPACITY_INVALID, "Không được giảm total dưới occupied/reserved hiện có");
        }
        capacity.setTotalCapacity(request.totalCapacity());
        capacity = capacityRepository.save(capacity);
        auditService.record(currentUser.id(), currentUser.role(), "UPDATE_CAPACITY", "PARKING_LOT", parkingLotId.toString(), null, vehicleType.name(), null);
        return capacityResponse(capacity, OffsetDateTime.now(), OffsetDateTime.now().plusYears(100));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingDtos.CapacityResponse> capacities(CurrentUser currentUser, UUID parkingLotId) {
        getManaged(currentUser, parkingLotId);
        return capacityRepository.findAll().stream()
                .filter(capacity -> capacity.getParkingLot().getId().equals(parkingLotId))
                .map(capacity -> capacityResponse(capacity, OffsetDateTime.now(), OffsetDateTime.now().plusYears(100)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ParkingDtos.AvailabilityResponse availability(UUID parkingLotId, VehicleType vehicleType, OffsetDateTime startTime,
                                                         OffsetDateTime endTime) {
        ParkingVehicleCapacity capacity = capacityRepository.findByParkingLotIdAndVehicleType(parkingLotId, vehicleType)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_UNSUPPORTED_VEHICLE_TYPE, "Parking lot không hỗ trợ loại xe"));
        long available = calculateAvailable(capacity, startTime, endTime);
        return new ParkingDtos.AvailabilityResponse(parkingLotId, vehicleType, available, startTime, endTime);
    }

    private ParkingDtos.ParkingLotResponse transitionStaff(CurrentUser user, UUID parkingLotId, ParkingLotStatus expected,
                                                           ParkingLotStatus next, String action, String reason) {
        ParkingLot parkingLot = getManaged(user, parkingLotId);
        if (parkingLot.getStatus() != expected) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Parking lot không đúng trạng thái yêu cầu");
        }
        parkingLot.setStatus(next);
        auditService.record(user.id(), user.role(), action, "PARKING_LOT", parkingLotId.toString(), expected.name(), next.name(), reason);
        return mapper.toResponse(parkingLot);
    }

    private ParkingLot getManaged(CurrentUser currentUser, UUID parkingLotId) {
        ParkingLot parkingLot = parkingLotRepository.findById(parkingLotId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_NOT_FOUND, "Parking lot không tồn tại"));
        if (!parkingLotStaffRepository.existsByParkingLotIdAndStaffId(parkingLotId, currentUser.id())) {
            throw new BusinessException(ErrorCode.PARKING_LOT_ACCESS_DENIED, "Staff không được phân công bãi xe này");
        }
        return parkingLot;
    }

    private ParkingDtos.CapacityResponse capacityResponse(ParkingVehicleCapacity capacity, OffsetDateTime startTime, OffsetDateTime endTime) {
        long reserved = bookingRepository.countActiveReservations(capacity.getParkingLot().getId(), capacity.getVehicleType(), activeStatuses(), startTime, endTime);
        long checkedIn = bookingRepository.countActiveReservations(capacity.getParkingLot().getId(), capacity.getVehicleType(), List.of(BookingStatus.CHECKED_IN, BookingStatus.OVERDUE), startTime, endTime);
        long blocked = blockRepository.countBlocked(capacity.getParkingLot().getId(), capacity.getVehicleType(), startTime, endTime);
        long available = Math.max(0, capacity.getTotalCapacity() - reserved - blocked);
        return new ParkingDtos.CapacityResponse(capacity.getParkingLot().getId(), capacity.getVehicleType(), capacity.getTotalCapacity(),
                reserved, blocked, checkedIn, available, capacity.getVersion());
    }

    private long calculateAvailable(ParkingVehicleCapacity capacity, OffsetDateTime startTime, OffsetDateTime endTime) {
        long reserved = bookingRepository.countActiveReservations(capacity.getParkingLot().getId(), capacity.getVehicleType(), activeStatuses(), startTime, endTime);
        long blocked = blockRepository.countBlocked(capacity.getParkingLot().getId(), capacity.getVehicleType(), startTime, endTime);
        return Math.max(0, capacity.getTotalCapacity() - reserved - blocked);
    }

    private List<BookingStatus> activeStatuses() {
        return properties.booking().activeOverlapStatuses();
    }

    private void assertVersion(Long currentVersion, Long expectedVersion) {
        if (expectedVersion != null && !expectedVersion.equals(currentVersion)) {
            throw new BusinessException(ErrorCode.RESOURCE_VERSION_CONFLICT, "Version không khớp");
        }
    }
}
