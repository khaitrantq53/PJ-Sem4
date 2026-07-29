package com.smartparking.feedback;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ComplaintRepository extends JpaRepository<Complaint, UUID> {
}
