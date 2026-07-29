package com.smartparking.promotion;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromotionParkingLotRepository extends JpaRepository<PromotionParkingLot, UUID> {
    boolean existsByPromotionIdAndParkingLotId(UUID promotionId, UUID parkingLotId);

    List<PromotionParkingLot> findByParkingLotId(UUID parkingLotId);

    Optional<PromotionParkingLot> findByPromotionIdAndParkingLotId(UUID promotionId, UUID parkingLotId);
}
