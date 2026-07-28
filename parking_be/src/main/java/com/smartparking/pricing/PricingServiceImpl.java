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
        BigDecimal hourlyRate = pricingRuleRepository.findFirstByParkingLotIdAndVehicleTypeAndActiveTrue(parkingLotId, vehicleType)
                .map(ParkingPricingRule::getHourlyRate)
                .orElse(properties.pricing().defaultHourlyRate());
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
        BigDecimal pickupFee = deliveryMethod == DeliveryMethod.PICKUP ? BigDecimal.ZERO : BigDecimal.ZERO;
        BigDecimal subtotal = parkingFee.add(serviceFee).add(pickupFee);
        BigDecimal discount = calculateDiscount(parkingLotId, promotionCode, subtotal);
        BigDecimal platformFee = subtotal.multiply(properties.pricing().platformFeeRate()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal taxable = subtotal.subtract(discount).add(platformFee).max(BigDecimal.ZERO);
        BigDecimal tax = taxable.multiply(properties.pricing().taxRate()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = taxable.add(tax).setScale(2, RoundingMode.HALF_UP);
        String currency = properties.pricing().currency();
        return new BookingDtos.PriceBreakdown(
                money(parkingFee, currency), money(serviceFee, currency), money(pickupFee, currency),
                money(discount, currency), money(platformFee, currency), money(tax, currency),
                money(BigDecimal.ZERO, currency), money(total, currency)
        );
    }

    private BigDecimal calculateDiscount(UUID parkingLotId, String promotionCode, BigDecimal subtotal) {
        if (promotionCode == null || promotionCode.isBlank()) {
            return BigDecimal.ZERO;
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
        return promotion.getDiscountAmount().min(subtotal);
    }

    private BookingDtos.Money money(BigDecimal amount, String currency) {
        return new BookingDtos.Money(amount.setScale(2, RoundingMode.HALF_UP), currency);
    }
}
