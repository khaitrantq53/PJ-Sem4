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
import java.time.OffsetDateTime;
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
        ParkingPricingRule pricingRule = pricingRuleRepository.findFirstByParkingLotIdAndVehicleTypeAndActiveTrue(parkingLotId, vehicleType)
                .orElse(null);
        BigDecimal hourlyRate = pricingRule == null ? properties.pricing().defaultHourlyRate() : pricingRule.getHourlyRate();
        BigDecimal hours = BigDecimal.valueOf(Duration.between(startTime, endTime).toMinutes())
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        BigDecimal parkingFee = hourlyRate.multiply(hours).setScale(2, RoundingMode.HALF_UP);
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

    private BookingDtos.Money money(BigDecimal amount, String currency) {
        return new BookingDtos.Money(amount.setScale(2, RoundingMode.HALF_UP), currency);
    }
}
