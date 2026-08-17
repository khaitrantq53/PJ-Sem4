package com.smartparking.parking;

import com.smartparking.common.VehicleType;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.parking.dto.ParkingDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface ParkingLotService {
    ParkingDtos.ParkingLotResponse create(CurrentUser currentUser, ParkingDtos.CreateParkingLotRequest request);

    Page<ParkingDtos.ParkingLotListResponse> listMine(CurrentUser currentUser, Pageable pageable);

    ParkingDtos.ParkingLotResponse getForStaff(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.ParkingLotResponse update(CurrentUser currentUser, UUID parkingLotId, ParkingDtos.ParkingLotRequest request);

    ParkingDtos.ParkingLotResponse submitApproval(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.ParkingLotResponse pause(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.ParkingLotResponse resume(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.ParkingLotResponse requestClosure(CurrentUser currentUser, UUID parkingLotId, String reason);

    Page<ParkingDtos.ParkingLotListResponse> publicActive(Pageable pageable);

    Page<ParkingDtos.ParkingLotListResponse> publicSearch(ParkingDtos.ParkingLotSearchCriteria criteria, Pageable pageable);

    ParkingDtos.ParkingLotResponse publicDetail(UUID parkingLotId);

    List<ParkingDtos.CapacityResponse> publicCapacities(UUID parkingLotId);

    List<ParkingDtos.PricingRuleResponse> publicPricingRules(UUID parkingLotId);

    List<ParkingDtos.ParkingServiceResponse> publicServices(UUID parkingLotId);

    ParkingDtos.CapacityResponse updateCapacity(CurrentUser currentUser, UUID parkingLotId, VehicleType vehicleType,
                                                ParkingDtos.CapacityRequest request);

    List<ParkingDtos.CapacityResponse> capacities(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.CapacityBlockResponse createCapacityBlock(CurrentUser currentUser, UUID parkingLotId,
                                                          ParkingDtos.CapacityBlockRequest request);

    List<ParkingDtos.CapacityBlockResponse> capacityBlocks(CurrentUser currentUser, UUID parkingLotId);

    void deleteCapacityBlock(CurrentUser currentUser, UUID parkingLotId, UUID blockId);

    ParkingDtos.AvailabilityResponse availability(UUID parkingLotId, VehicleType vehicleType, OffsetDateTime startTime,
                                                  OffsetDateTime endTime);

    List<ParkingDtos.PricingRuleResponse> pricingRules(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.PricingRuleResponse upsertPricingRule(CurrentUser currentUser, UUID parkingLotId,
                                                      ParkingDtos.PricingRuleRequest request);

    List<ParkingDtos.ParkingServiceResponse> services(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.ParkingServiceResponse createService(CurrentUser currentUser, UUID parkingLotId,
                                                     ParkingDtos.ParkingServiceRequest request);

    ParkingDtos.ParkingServiceResponse updateService(CurrentUser currentUser, UUID parkingLotId, UUID serviceId,
                                                     ParkingDtos.ParkingServiceRequest request);

    List<ParkingDtos.PromotionResponse> promotions(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.PromotionResponse createPromotion(CurrentUser currentUser, UUID parkingLotId,
                                                  ParkingDtos.PromotionRequest request);

    ParkingDtos.PromotionResponse updatePromotion(CurrentUser currentUser, UUID parkingLotId, UUID promotionId,
                                                  ParkingDtos.PromotionRequest request);

    List<ParkingDtos.PolicyResponse> policies(CurrentUser currentUser, UUID parkingLotId);

    ParkingDtos.PolicyResponse upsertPolicy(CurrentUser currentUser, UUID parkingLotId, ParkingDtos.PolicyRequest request);
}
