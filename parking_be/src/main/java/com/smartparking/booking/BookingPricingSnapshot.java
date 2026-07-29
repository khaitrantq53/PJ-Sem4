package com.smartparking.booking;

import com.smartparking.common.BaseEntity;
import com.smartparking.pricing.ParkingPricingRule;
import com.smartparking.promotion.Promotion;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "booking_pricing_snapshots")
public class BookingPricingSnapshot extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pricing_rule_id")
    private ParkingPricingRule pricingRule;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal hourlyRate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promotion_id")
    private Promotion promotion;

    @Column(length = 80)
    private String promotionCode;

    private String promotionName;

    @Column(precision = 19, scale = 2)
    private BigDecimal promotionDiscountAmount;

    @Column(nullable = false, length = 3)
    private String currency;
}
