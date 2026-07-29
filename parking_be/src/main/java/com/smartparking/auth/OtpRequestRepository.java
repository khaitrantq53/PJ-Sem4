package com.smartparking.auth;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpRequestRepository extends JpaRepository<OtpRequest, UUID> {
    Optional<OtpRequest> findTopByDestinationAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(String destination, String purpose);

    Optional<OtpRequest> findTopByDestinationAndPurposeAndVerifiedAtIsNotNullOrderByVerifiedAtDesc(String destination, String purpose);
}
