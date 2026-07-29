package com.smartparking.device;

import com.smartparking.common.BaseEntity;
import com.smartparking.common.VehicleType;
import com.smartparking.parking.ParkingLot;
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

@Getter
@Setter
@Entity
@Table(name = "occupancy_discrepancy_alerts")
public class OccupancyDiscrepancyAlert extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType vehicleType;

    @Column(nullable = false)
    private int expectedCount;

    @Column(nullable = false)
    private int reportedCount;

    @Column(nullable = false)
    private String status;
}
