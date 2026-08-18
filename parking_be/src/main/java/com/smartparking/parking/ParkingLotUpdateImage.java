package com.smartparking.parking;

import com.smartparking.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "parking_lot_update_images")
public class ParkingLotUpdateImage extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private ParkingLotUpdateRequest request;

    @Column(nullable = false)
    private String bucket;

    @Column(nullable = false)
    private String objectKey;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private long fileSize;

    private String checksum;
}
