package com.smartparking.parking;

import com.smartparking.common.BaseEntity;
import com.smartparking.common.ParkingLotStatus;
import com.smartparking.common.Role;
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

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "parking_status_histories")
public class ParkingStatusHistory extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @Enumerated(EnumType.STRING)
    private ParkingLotStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ParkingLotStatus currentStatus;

    private UUID actorId;

    @Enumerated(EnumType.STRING)
    private Role actorRole;

    @Column(columnDefinition = "text")
    private String reason;
}
