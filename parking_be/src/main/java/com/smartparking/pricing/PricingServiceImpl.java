package com.smartparking.pricing;

import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.common.DeliveryMethod;
import com.smartparking.common.VehicleType;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.parking.ParkingServiceEntity;
import com.smartparking.parking.ParkingServiceRepository;
import com.smartparking.promotion.Promotion;
import com.smartparking.promotion.PromotionParkingLotRepository;
import com.smartparking.promotion.PromotionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class PricingServiceImpl implements PricingService {
    private final ParkingPricingRuleRepository pricingRuleRepository;
    private final ParkingServiceRepository parkingServiceRepository;
    private final PromotionRepository promotionRepository;
    private final PromotionParkingLotRepository promotionParkingLotRepository;
    private final SmartParkingProperties properties;

    public PricingServiceImpl(ParkingPricingRuleRepository pricingRuleRepository,
                              ParkingServiceRepository parkingServiceRepository,
                              PromotionRepository promotionRepository,
                              PromotionParkingLotRepository promotionParkingLotRepository,
                              SmartParkingProperties properties) {
        this.pricingRuleRepository = pricingRuleRepository;
        this.parkingServiceRepository = parkingServiceRepository;
        this.promotionRepository = promotionRepository;
        this.promotionParkingLotRepository = promotionParkingLotRepository;
        this.properties = properties;
    }

    @Override
    @Transactional(readOnly = true)
    public BookingDtos.PriceBreakdown calculate(UUID parkingLotId, VehicleType vehicleType, OffsetDateTime startTime,
                                                OffsetDateTime endTime, DeliveryMethod deliveryMethod,
                                                List<UUID> serviceIds, String promotionCode) {
        return calculateSnapshot(parkingLotId, vehicleType, startTime, endTime, deliveryMethod, serviceIds, promotionCode).breakdown();
    }

    @Override
    @Transactional(readOnly = true)
    public PricingCalculation calculateSnapshot(UUID parkingLotId, VehicleType vehicleType, OffsetDateTime startTime,
                                                OffsetDateTime endTime, DeliveryMethod deliveryMethod,
                                                List<UUID> serviceIds, String promotionCode) {
        List<ParkingPricingRule> pricingRules = pricingRuleRepository
                .findByParkingLotIdAndVehicleTypeAndActiveTrueOrderByStartTimeAsc(parkingLotId, vehicleType);
        ParkingPricingRule pricingRule = pricingRules.stream()
                .filter(rule -> appliesAt(rule, startTime.toLocalTime()))
                .findFirst()
                .or(() -> pricingRules.stream().min(Comparator.comparing(ParkingPricingRule::getStartTime)))
                .orElse(null);
        BigDecimal hourlyRate = pricingRule == null ? properties.pricing().defaultHourlyRate() : pricingRule.getHourlyRate();
        BigDecimal parkingFee = parkingFee(pricingRules, startTime, endTime).setScale(2, RoundingMode.HALF_UP);
        List<UUID> ids = serviceIds == null ? List.of() : serviceIds;
        List<ParkingServiceEntity> services = ids.isEmpty()
                ? List.of()
                : parkingServiceRepository.findByParkingLotIdAndIdInAndActiveTrue(parkingLotId, ids);
        if (services.size() != ids.size()) {
            throw new BusinessException(ErrorCode.PARKING_LOT_ACCESS_DENIED, "Service không hợp lệ cho parking lot");
        }
        BigDecimal serviceFee = services.stream().map(ParkingServiceEntity::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (deliveryMethod == DeliveryMethod.PICKUP) {
            throw new BusinessException(ErrorCode.BUSINESS_DECISION_REQUIRED, "Pickup fee chưa được chốt nghiệp vụ");
        }
        BigDecimal pickupFee = BigDecimal.ZERO;
        BigDecimal subtotal = parkingFee.add(serviceFee).add(pickupFee);
        Promotion promotion = promotion(parkingLotId, promotionCode);
        BigDecimal discount = promotion == null ? BigDecimal.ZERO : promotion.getDiscountAmount().min(subtotal);
        BigDecimal platformFee = subtotal.multiply(properties.pricing().platformFeeRate()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal taxable = subtotal.subtract(discount).add(platformFee).max(BigDecimal.ZERO);
        BigDecimal tax = taxable.multiply(properties.pricing().taxRate()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = taxable.add(tax).setScale(2, RoundingMode.HALF_UP);
        String currency = properties.pricing().currency();
        BookingDtos.PriceBreakdown breakdown = new BookingDtos.PriceBreakdown(
                money(parkingFee, currency), money(serviceFee, currency), money(pickupFee, currency),
                money(discount, currency), money(platformFee, currency), money(tax, currency),
                money(BigDecimal.ZERO, currency), money(total, currency)
        );
        return new PricingCalculation(breakdown, pricingRule, hourlyRate, promotion, discount);
    }

    private Promotion promotion(UUID parkingLotId, String promotionCode) {
        if (promotionCode == null || promotionCode.isBlank()) {
            return null;
        }
        Promotion promotion = promotionRepository.findByCodeAndActiveTrue(promotionCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Promotion không hợp lệ"));
        OffsetDateTime now = OffsetDateTime.now();
        if (promotion.getStartsAt().isAfter(now) || promotion.getEndsAt().isBefore(now)) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Promotion không còn hiệu lực");
        }
        if (!promotionParkingLotRepository.existsByPromotionIdAndParkingLotId(promotion.getId(), parkingLotId)) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Promotion không áp dụng cho parking lot");
        }
        return promotion;
    }

    private BigDecimal parkingFee(List<ParkingPricingRule> rules, OffsetDateTime startTime, OffsetDateTime endTime) {
        if (rules.isEmpty()) {
            return feeForSegment(properties.pricing().defaultHourlyRate(), startTime, endTime);
        }

        BigDecimal fee = BigDecimal.ZERO;
        OffsetDateTime cursor = startTime;
        while (cursor.isBefore(endTime)) {
            OffsetDateTime segmentStart = cursor;
            ParkingPricingRule rule = rules.stream()
                    .filter(candidate -> appliesAt(candidate, segmentStart.toLocalTime()))
                    .findFirst()
                    .orElse(null);
            BigDecimal rate = rule == null ? properties.pricing().defaultHourlyRate() : rule.getHourlyRate();
            OffsetDateTime nextBoundary = nextPricingBoundary(segmentStart, rules);
            OffsetDateTime segmentEnd = nextBoundary.isBefore(endTime) ? nextBoundary : endTime;
            if (!segmentEnd.isAfter(segmentStart)) {
                segmentEnd = endTime;
            }
            fee = fee.add(feeForSegment(rate, segmentStart, segmentEnd));
            cursor = segmentEnd;
        }
        return fee;
    }

    private BigDecimal feeForSegment(BigDecimal hourlyRate, OffsetDateTime startTime, OffsetDateTime endTime) {
        BigDecimal hours = BigDecimal.valueOf(Duration.between(startTime, endTime).toMinutes())
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        return hourlyRate.multiply(hours);
    }

    private OffsetDateTime nextPricingBoundary(OffsetDateTime cursor, List<ParkingPricingRule> rules) {
        return rules.stream()
                .flatMap(rule -> List.of(rule.getStartTime(), rule.getEndTime()).stream())
                .map(boundary -> nextOccurrence(cursor, boundary))
                .filter(candidate -> candidate.isAfter(cursor))
                .min(OffsetDateTime::compareTo)
                .orElse(cursor.plusDays(1));
    }

    private OffsetDateTime nextOccurrence(OffsetDateTime cursor, LocalTime boundary) {
        OffsetDateTime candidate = cursor.toLocalDate().atTime(boundary).atOffset(cursor.getOffset());
        return candidate.isAfter(cursor) ? candidate : candidate.plusDays(1);
    }

    private boolean appliesAt(ParkingPricingRule rule, LocalTime time) {
        LocalTime start = rule.getStartTime();
        LocalTime end = rule.getEndTime();
        if (start.equals(end)) {
            return false;
        }
        if (start.isBefore(end)) {
            return !time.isBefore(start) && time.isBefore(end);
        }
        return !time.isBefore(start) || time.isBefore(end);
    }

    private BookingDtos.Money money(BigDecimal amount, String currency) {
        return new BookingDtos.Money(amount.setScale(2, RoundingMode.HALF_UP), currency);
    }
}
