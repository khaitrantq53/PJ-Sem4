package com.smartparking.promotion;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PromotionUsageRepository extends JpaRepository<PromotionUsage, UUID> {
}
