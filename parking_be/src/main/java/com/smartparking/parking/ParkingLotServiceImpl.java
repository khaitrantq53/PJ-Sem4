package com.smartparking.parking;

import com.smartparking.account.Account;
import com.smartparking.account.AccountRepository;
import com.smartparking.audit.AuditService;
import com.smartparking.booking.BookingRepository;
import com.smartparking.capacity.ParkingCapacityBlock;
import com.smartparking.capacity.ParkingCapacityBlockRepository;
import com.smartparking.capacity.ParkingVehicleCapacity;
import com.smartparking.capacity.ParkingVehicleCapacityRepository;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.ParkingLotStatus;
import com.smartparking.common.VehicleType;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.parking.dto.ParkingDtos;
import com.smartparking.pricing.ParkingPricingRule;
import com.smartparking.pricing.ParkingPricingRuleRepository;
import com.smartparking.promotion.Promotion;
import com.smartparking.promotion.PromotionParkingLot;
import com.smartparking.promotion.PromotionParkingLotRepository;
import com.smartparking.promotion.PromotionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final ParkingPricingRuleRepository pricingRuleRepository;
    private final ParkingServiceRepository serviceRepository;
    private final PromotionRepository promotionRepository;
    private final PromotionParkingLotRepository promotionParkingLotRepository;
    private final ParkingPolicyRepository policyRepository;
    private final BookingRepository bookingRepository;
    private final ParkingLotMapper mapper;
    private final AuditService auditService;

    public ParkingLotServiceImpl(ParkingLotRepository parkingLotRepository,
                                 ParkingLotStaffRepository parkingLotStaffRepository,
                                 AccountRepository accountRepository,
                                 ParkingVehicleCapacityRepository capacityRepository,
                                 ParkingCapacityBlockRepository blockRepository,
                                 ParkingPricingRuleRepository pricingRuleRepository,
                                 ParkingServiceRepository serviceRepository,
                                 PromotionRepository promotionRepository,
                                 PromotionParkingLotRepository promotionParkingLotRepository,
                                 ParkingPolicyRepository policyRepository,
                                 BookingRepository bookingRepository,
                                 ParkingLotMapper mapper,
                                 AuditService auditService) {
        this.parkingLotRepository = parkingLotRepository;
        this.parkingLotStaffRepository = parkingLotStaffRepository;
        this.accountRepository = accountRepository;
        this.capacityRepository = capacityRepository;
        this.blockRepository = blockRepository;
        this.pricingRuleRepository = pricingRuleRepository;
        this.serviceRepository = serviceRepository;
        this.promotionRepository = promotionRepository;
        this.promotionParkingLotRepository = promotionParkingLotRepository;
        this.policyRepository = policyRepository;
        this.bookingRepository = bookingRepository;
        this.mapper = mapper;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public ParkingDtos.ParkingLotResponse create(CurrentUser currentUser, ParkingDtos.CreateParkingLotRequest request) {
        Account staff = accountRepository.findById(currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Account không tồn tại"));
        if (parkingLotStaffRepository.existsByStaffId(staff.getId())) {
            throw new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "Mỗi tài khoản staff chỉ được tạo và quản lý 1 bãi đỗ");
        }
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
    public Page<ParkingDtos.ParkingLotListResponse> listMine(CurrentUser currentUser, Pageable pageable) {
        return parkingLotRepository.findManagedByStaff(currentUser.id(), pageable).map(mapper::toListResponse);
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
        assertConfigurable(parkingLot);
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
        parkingLot.setPreviousStatus(old);
        parkingLot.setStatus(ParkingLotStatus.CLOSURE_REQUESTED);
        auditService.record(currentUser.id(), currentUser.role(), "REQUEST_CLOSURE", "PARKING_LOT", parkingLot.getId().toString(), old.name(), parkingLot.getStatus().name(), reason);
        return mapper.toResponse(parkingLot);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ParkingDtos.ParkingLotListResponse> publicActive(Pageable pageable) {
        return publicSearch(new ParkingDtos.ParkingLotSearchCriteria(null, null, null, null, null, null, null, null, null, null, null), pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ParkingDtos.ParkingLotListResponse> publicSearch(ParkingDtos.ParkingLotSearchCriteria criteria, Pageable pageable) {
        validateSearchTime(criteria.startTime(), criteria.endTime());
        return parkingLotRepository.searchPublic(
                        criteria.latitude(),
                        criteria.longitude(),
                        criteria.maxDistanceKm(),
                        blankToNull(criteria.address()),
                        criteria.vehicleType() == null ? null : criteria.vehicleType().name(),
                        criteria.startTime(),
                        criteria.endTime(),
                        criteria.minPrice(),
                        criteria.maxPrice(),
                        criteria.serviceId(),
                        criteria.minRating(),
                        capacityHoldStatuses().stream().map(BookingStatus::name).toList(),
                        pageable)
                .map(this::toPublicListResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ParkingDtos.ParkingLotResponse publicDetail(UUID parkingLotId) {
        ParkingLot parkingLot = parkingLotRepository.findById(parkingLotId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_NOT_FOUND, "Parking lot không tồn tại"));
        if (parkingLot.getStatus() != ParkingLotStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.PARKING_LOT_NOT_ACTIVE, "Parking lot chưa ACTIVE");
        }
        return mapper.toResponse(parkingLot, lowestActiveHourlyRate(parkingLot.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingDtos.CapacityResponse> publicCapacities(UUID parkingLotId) {
        requirePublicActive(parkingLotId);
        return capacityRepository.findByParkingLotId(parkingLotId).stream()
                .map(capacity -> capacityResponse(capacity, OffsetDateTime.now(), OffsetDateTime.now().plusYears(100)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingDtos.PricingRuleResponse> publicPricingRules(UUID parkingLotId) {
        requirePublicActive(parkingLotId);
        return pricingRuleRepository.findByParkingLotId(parkingLotId).stream()
                .filter(ParkingPricingRule::isActive)
                .map(this::pricingRuleResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingDtos.ParkingServiceResponse> publicServices(UUID parkingLotId) {
        requirePublicActive(parkingLotId);
        return serviceRepository.findByParkingLotId(parkingLotId).stream()
                .filter(ParkingServiceEntity::isActive)
                .map(this::serviceResponse)
                .toList();
    }

    @Override
    @Transactional
    public ParkingDtos.CapacityResponse updateCapacity(CurrentUser currentUser, UUID parkingLotId, VehicleType vehicleType,
                                                       ParkingDtos.CapacityRequest request) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        assertConfigurable(parkingLot);
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
        OffsetDateTime from = OffsetDateTime.now().minusYears(100);
        OffsetDateTime to = OffsetDateTime.now().plusYears(100);
        long reserved = bookingRepository.countActiveReservations(parkingLotId, vehicleType, capacityHoldStatuses(), from, to);
        long blocked = blockRepository.countBlocked(parkingLotId, vehicleType, from, to);
        if (request.totalCapacity() < reserved + blocked) {
            throw new BusinessException(ErrorCode.PARKING_CAPACITY_INVALID, "Không được giảm total dưới occupied/reserved/blocked hiện có");
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
    @Transactional
    public ParkingDtos.CapacityBlockResponse createCapacityBlock(CurrentUser currentUser, UUID parkingLotId,
                                                                 ParkingDtos.CapacityBlockRequest request) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        assertConfigurable(parkingLot);
        if (!request.startTime().isBefore(request.endTime())) {
            throw new BusinessException(ErrorCode.BOOKING_TIME_INVALID, "startTime phải nhỏ hơn endTime");
        }
        ParkingVehicleCapacity capacity = capacityRepository.findByParkingLotIdAndVehicleType(parkingLotId, request.vehicleType())
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_UNSUPPORTED_VEHICLE_TYPE, "Parking lot không hỗ trợ loại xe"));
        long reserved = bookingRepository.countActiveReservations(parkingLotId, request.vehicleType(), capacityHoldStatuses(), request.startTime(), request.endTime());
        long blocked = blockRepository.countBlocked(parkingLotId, request.vehicleType(), request.startTime(), request.endTime());
        if (capacity.getTotalCapacity() < reserved + blocked + request.quantity()) {
            throw new BusinessException(ErrorCode.PARKING_CAPACITY_INVALID, "Capacity block làm available âm");
        }
        ParkingCapacityBlock block = new ParkingCapacityBlock();
        block.setParkingLot(parkingLot);
        block.setVehicleType(request.vehicleType());
        block.setQuantity(request.quantity());
        block.setStartTime(request.startTime());
        block.setEndTime(request.endTime());
        block.setReason(request.reason());
        block = blockRepository.save(block);
        auditService.record(currentUser.id(), currentUser.role(), "CREATE_CAPACITY_BLOCK", "PARKING_LOT",
                parkingLotId.toString(), null, block.getId().toString(), request.reason());
        return capacityBlockResponse(block);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingDtos.CapacityBlockResponse> capacityBlocks(CurrentUser currentUser, UUID parkingLotId) {
        getManaged(currentUser, parkingLotId);
        return blockRepository.findByParkingLotId(parkingLotId).stream()
                .map(this::capacityBlockResponse)
                .toList();
    }

    @Override
    @Transactional
    public void deleteCapacityBlock(CurrentUser currentUser, UUID parkingLotId, UUID blockId) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        assertConfigurable(parkingLot);
        ParkingCapacityBlock block = blockRepository.findById(blockId)
                .filter(candidate -> candidate.getParkingLot().getId().equals(parkingLotId))
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_CAPACITY_INVALID, "Capacity block không tồn tại"));
        blockRepository.delete(block);
        auditService.record(currentUser.id(), currentUser.role(), "DELETE_CAPACITY_BLOCK", "PARKING_LOT",
                parkingLotId.toString(), block.getId().toString(), null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingDtos.PricingRuleResponse> pricingRules(CurrentUser currentUser, UUID parkingLotId) {
        getManaged(currentUser, parkingLotId);
        return pricingRuleRepository.findByParkingLotId(parkingLotId).stream()
                .map(this::pricingRuleResponse)
                .toList();
    }

    @Override
    @Transactional
    public ParkingDtos.PricingRuleResponse upsertPricingRule(CurrentUser currentUser, UUID parkingLotId,
                                                             ParkingDtos.PricingRuleRequest request) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        assertConfigurable(parkingLot);
        if (request.startTime().equals(request.endTime())) {
            throw new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "startTime và endTime của pricing rule không được trùng nhau");
        }
        ParkingPricingRule rule = pricingRuleRepository
                .findByParkingLotIdAndVehicleTypeAndStartTimeAndEndTime(parkingLotId, request.vehicleType(), request.startTime(), request.endTime())
                .orElseGet(() -> {
                    ParkingPricingRule created = new ParkingPricingRule();
                    created.setParkingLot(parkingLot);
                    created.setVehicleType(request.vehicleType());
                    return created;
                });
        if (rule.getVersion() != null && request.version() != null) {
            assertVersion(rule.getVersion(), request.version());
        }
        rule.setHourlyRate(request.hourlyRate());
        rule.setStartTime(request.startTime());
        rule.setEndTime(request.endTime());
        rule.setActive(Boolean.TRUE.equals(request.active()));
        rule = pricingRuleRepository.save(rule);
        auditService.record(currentUser.id(), currentUser.role(), "UPSERT_PRICING_RULE", "PARKING_LOT",
                parkingLotId.toString(), null, request.vehicleType().name(), null);
        return pricingRuleResponse(rule);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingDtos.ParkingServiceResponse> services(CurrentUser currentUser, UUID parkingLotId) {
        getManaged(currentUser, parkingLotId);
        return serviceRepository.findByParkingLotId(parkingLotId).stream().map(this::serviceResponse).toList();
    }

    @Override
    @Transactional
    public ParkingDtos.ParkingServiceResponse createService(CurrentUser currentUser, UUID parkingLotId,
                                                           ParkingDtos.ParkingServiceRequest request) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        assertConfigurable(parkingLot);
        ParkingServiceEntity service = new ParkingServiceEntity();
        service.setParkingLot(parkingLot);
        applyService(service, request);
        service = serviceRepository.save(service);
        auditService.record(currentUser.id(), currentUser.role(), "CREATE_SERVICE", "PARKING_LOT",
                parkingLotId.toString(), null, service.getId().toString(), null);
        return serviceResponse(service);
    }

    @Override
    @Transactional
    public ParkingDtos.ParkingServiceResponse updateService(CurrentUser currentUser, UUID parkingLotId, UUID serviceId,
                                                           ParkingDtos.ParkingServiceRequest request) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        assertConfigurable(parkingLot);
        ParkingServiceEntity service = serviceRepository.findByIdAndParkingLotId(serviceId, parkingLotId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "Service không tồn tại"));
        assertVersion(service.getVersion(), request.version());
        applyService(service, request);
        auditService.record(currentUser.id(), currentUser.role(), "UPDATE_SERVICE", "PARKING_LOT",
                parkingLotId.toString(), serviceId.toString(), service.getName(), null);
        return serviceResponse(service);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingDtos.PromotionResponse> promotions(CurrentUser currentUser, UUID parkingLotId) {
        getManaged(currentUser, parkingLotId);
        return promotionParkingLotRepository.findByParkingLotId(parkingLotId).stream()
                .map(PromotionParkingLot::getPromotion)
                .map(promotion -> promotionResponse(parkingLotId, promotion))
                .toList();
    }

    @Override
    @Transactional
    public ParkingDtos.PromotionResponse createPromotion(CurrentUser currentUser, UUID parkingLotId,
                                                        ParkingDtos.PromotionRequest request) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        assertConfigurable(parkingLot);
        validatePromotionTime(request.startsAt(), request.endsAt());
        promotionRepository.findByCode(request.code())
                .ifPresent(existing -> {
                    throw new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "Promotion code đã tồn tại");
                });
        Promotion promotion = new Promotion();
        applyPromotion(promotion, request);
        promotion = promotionRepository.save(promotion);
        PromotionParkingLot relation = new PromotionParkingLot();
        relation.setParkingLot(parkingLot);
        relation.setPromotion(promotion);
        promotionParkingLotRepository.save(relation);
        auditService.record(currentUser.id(), currentUser.role(), "CREATE_PROMOTION", "PARKING_LOT",
                parkingLotId.toString(), null, promotion.getCode(), null);
        return promotionResponse(parkingLotId, promotion);
    }

    @Override
    @Transactional
    public ParkingDtos.PromotionResponse updatePromotion(CurrentUser currentUser, UUID parkingLotId, UUID promotionId,
                                                        ParkingDtos.PromotionRequest request) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        assertConfigurable(parkingLot);
        validatePromotionTime(request.startsAt(), request.endsAt());
        PromotionParkingLot relation = promotionParkingLotRepository.findByPromotionIdAndParkingLotId(promotionId, parkingLotId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "Promotion không thuộc parking lot"));
        Promotion promotion = relation.getPromotion();
        assertVersion(promotion.getVersion(), request.version());
        if (!promotion.getCode().equals(request.code()) && promotionRepository.findByCode(request.code()).isPresent()) {
            throw new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "Promotion code đã tồn tại");
        }
        applyPromotion(promotion, request);
        auditService.record(currentUser.id(), currentUser.role(), "UPDATE_PROMOTION", "PARKING_LOT",
                parkingLot.getId().toString(), promotion.getId().toString(), promotion.getCode(), null);
        return promotionResponse(parkingLotId, promotion);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingDtos.PolicyResponse> policies(CurrentUser currentUser, UUID parkingLotId) {
        getManaged(currentUser, parkingLotId);
        return policyRepository.findByParkingLotId(parkingLotId).stream().map(this::policyResponse).toList();
    }

    @Override
    @Transactional
    public ParkingDtos.PolicyResponse upsertPolicy(CurrentUser currentUser, UUID parkingLotId, ParkingDtos.PolicyRequest request) {
        ParkingLot parkingLot = getManaged(currentUser, parkingLotId);
        assertConfigurable(parkingLot);
        ParkingPolicy policy = policyRepository.findByParkingLotIdAndPolicyKey(parkingLotId, request.policyKey())
                .orElseGet(() -> {
                    ParkingPolicy created = new ParkingPolicy();
                    created.setParkingLot(parkingLot);
                    created.setPolicyKey(request.policyKey());
                    return created;
                });
        if (policy.getVersion() != null) {
            assertVersion(policy.getVersion(), request.version());
        }
        policy.setPolicyValue(request.policyValue());
        policy = policyRepository.save(policy);
        auditService.record(currentUser.id(), currentUser.role(), "UPSERT_POLICY", "PARKING_LOT",
                parkingLotId.toString(), null, policy.getPolicyKey(), null);
        return policyResponse(policy);
    }

    @Override
    @Transactional(readOnly = true)
    public ParkingDtos.AvailabilityResponse availability(UUID parkingLotId, VehicleType vehicleType, OffsetDateTime startTime,
                                                         OffsetDateTime endTime) {
        validateSearchTime(startTime, endTime);
        ParkingLot parkingLot = parkingLotRepository.findById(parkingLotId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_NOT_FOUND, "Parking lot không tồn tại"));
        if (parkingLot.getStatus() != ParkingLotStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.PARKING_LOT_NOT_ACTIVE, "Parking lot chưa ACTIVE");
        }
        ParkingVehicleCapacity capacity = capacityRepository.findByParkingLotIdAndVehicleType(parkingLotId, vehicleType)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_UNSUPPORTED_VEHICLE_TYPE, "Parking lot không hỗ trợ loại xe"));
        long available = calculateAvailable(capacity, startTime, endTime);
        return new ParkingDtos.AvailabilityResponse(parkingLotId, vehicleType, available, startTime, endTime);
    }

    private void validateSearchTime(OffsetDateTime startTime, OffsetDateTime endTime) {
        if (startTime == null && endTime == null) {
            return;
        }
        if (startTime == null || endTime == null || !startTime.isBefore(endTime)) {
            throw new BusinessException(ErrorCode.BOOKING_TIME_INVALID, "startTime phải nhỏ hơn endTime");
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private ParkingDtos.ParkingLotResponse transitionStaff(CurrentUser user, UUID parkingLotId, ParkingLotStatus expected,
                                                           ParkingLotStatus next, String action, String reason) {
        ParkingLot parkingLot = getManaged(user, parkingLotId);
        if (parkingLot.getStatus() != expected) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Parking lot không đúng trạng thái yêu cầu");
        }
        parkingLot.setPreviousStatus(null);
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
        long reserved = bookingRepository.countActiveReservations(capacity.getParkingLot().getId(), capacity.getVehicleType(), reservedStatuses(), startTime, endTime);
        long checkedIn = bookingRepository.countActiveReservations(capacity.getParkingLot().getId(), capacity.getVehicleType(), occupiedStatuses(), startTime, endTime);
        long blocked = blockRepository.countBlocked(capacity.getParkingLot().getId(), capacity.getVehicleType(), startTime, endTime);
        long available = Math.max(0, capacity.getTotalCapacity() - reserved - checkedIn - blocked);
        return new ParkingDtos.CapacityResponse(capacity.getParkingLot().getId(), capacity.getVehicleType(), capacity.getTotalCapacity(),
                reserved, blocked, checkedIn, available, capacity.getVersion());
    }

    private long calculateAvailable(ParkingVehicleCapacity capacity, OffsetDateTime startTime, OffsetDateTime endTime) {
        long reserved = bookingRepository.countActiveReservations(capacity.getParkingLot().getId(), capacity.getVehicleType(), capacityHoldStatuses(), startTime, endTime);
        long blocked = blockRepository.countBlocked(capacity.getParkingLot().getId(), capacity.getVehicleType(), startTime, endTime);
        return Math.max(0, capacity.getTotalCapacity() - reserved - blocked);
    }

    private ParkingDtos.CapacityBlockResponse capacityBlockResponse(ParkingCapacityBlock block) {
        return new ParkingDtos.CapacityBlockResponse(block.getId(), block.getParkingLot().getId(), block.getVehicleType(),
                block.getQuantity(), block.getStartTime(), block.getEndTime(), block.getReason(),
                block.getVersion(), block.getCreatedAt(), block.getUpdatedAt());
    }

    private ParkingDtos.PricingRuleResponse pricingRuleResponse(ParkingPricingRule rule) {
        return new ParkingDtos.PricingRuleResponse(rule.getId(), rule.getParkingLot().getId(), rule.getVehicleType(),
                rule.getHourlyRate(), rule.getStartTime(), rule.getEndTime(), rule.isActive(), rule.getVersion(), rule.getCreatedAt(), rule.getUpdatedAt());
    }

    private ParkingDtos.ParkingLotListResponse toPublicListResponse(ParkingLot parkingLot) {
        return mapper.toListResponse(parkingLot, lowestActiveHourlyRate(parkingLot.getId()));
    }

    private BigDecimal lowestActiveHourlyRate(UUID parkingLotId) {
        return pricingRuleRepository.findLowestActiveHourlyRate(parkingLotId).orElse(null);
    }

    private void applyService(ParkingServiceEntity service, ParkingDtos.ParkingServiceRequest request) {
        service.setName(request.name());
        service.setPrice(request.price());
        service.setActive(Boolean.TRUE.equals(request.active()));
    }

    private ParkingDtos.ParkingServiceResponse serviceResponse(ParkingServiceEntity service) {
        return new ParkingDtos.ParkingServiceResponse(service.getId(), service.getParkingLot().getId(), service.getName(),
                service.getPrice(), service.isActive(), service.getVersion(), service.getCreatedAt(), service.getUpdatedAt());
    }

    private void applyPromotion(Promotion promotion, ParkingDtos.PromotionRequest request) {
        promotion.setCode(request.code());
        promotion.setName(request.name());
        promotion.setDiscountAmount(request.discountAmount());
        promotion.setActive(Boolean.TRUE.equals(request.active()));
        promotion.setStartsAt(request.startsAt());
        promotion.setEndsAt(request.endsAt());
    }

    private ParkingDtos.PromotionResponse promotionResponse(UUID parkingLotId, Promotion promotion) {
        return new ParkingDtos.PromotionResponse(promotion.getId(), parkingLotId, promotion.getCode(), promotion.getName(),
                promotion.getDiscountAmount(), promotion.isActive(), promotion.getStartsAt(), promotion.getEndsAt(),
                promotion.getVersion(), promotion.getCreatedAt(), promotion.getUpdatedAt());
    }

    private void validatePromotionTime(OffsetDateTime startsAt, OffsetDateTime endsAt) {
        if (!startsAt.isBefore(endsAt)) {
            throw new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "Promotion startsAt phải nhỏ hơn endsAt");
        }
    }

    private ParkingDtos.PolicyResponse policyResponse(ParkingPolicy policy) {
        return new ParkingDtos.PolicyResponse(policy.getId(), policy.getParkingLot().getId(), policy.getPolicyKey(),
                policy.getPolicyValue(), policy.getVersion(), policy.getCreatedAt(), policy.getUpdatedAt());
    }

    private ParkingLot requirePublicActive(UUID parkingLotId) {
        ParkingLot parkingLot = parkingLotRepository.findById(parkingLotId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_NOT_FOUND, "Parking lot không tồn tại"));
        if (parkingLot.getStatus() != ParkingLotStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.PARKING_LOT_NOT_ACTIVE, "Parking lot chưa ACTIVE");
        }
        return parkingLot;
    }

    private void assertConfigurable(ParkingLot parkingLot) {
        if (parkingLot.getStatus() == ParkingLotStatus.CLOSED) {
            throw new BusinessException(ErrorCode.PARKING_CONFIGURATION_INVALID, "Parking CLOSED không nhận update nghiệp vụ thông thường");
        }
    }

    private List<BookingStatus> reservedStatuses() {
        return List.of(BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED);
    }

    private List<BookingStatus> occupiedStatuses() {
        return List.of(BookingStatus.CHECKED_IN, BookingStatus.OVERDUE);
    }

    private List<BookingStatus> capacityHoldStatuses() {
        return List.of(BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.OVERDUE);
    }

    private void assertVersion(Long currentVersion, Long expectedVersion) {
        if (expectedVersion != null && !expectedVersion.equals(currentVersion)) {
            throw new BusinessException(ErrorCode.RESOURCE_VERSION_CONFLICT, "Version không khớp");
        }
    }
}
