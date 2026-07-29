package com.smartparking.promotion;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromotionRepository extends JpaRepository<Promotion, UUID> {
    Optional<Promotion> findByCode(String code);

    Optional<Promotion> findByCodeAndActiveTrue(String code);

    List<Promotion> findByActiveTrueAndEndsAtBefore(OffsetDateTime now, Pageable pageable);
}
