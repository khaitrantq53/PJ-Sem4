package com.smartparking.parking;

import com.smartparking.account.Account;
import com.smartparking.common.BaseEntity;
import com.smartparking.common.RequestStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "parking_lot_update_requests")
public class ParkingLotUpdateRequest extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by", nullable = false)
    private Account requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(columnDefinition = "text")
    private String description;

    private Long expectedVersion;

    @Column(columnDefinition = "text")
    private String decisionReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private Account decidedBy;

    private OffsetDateTime decidedAt;
}
