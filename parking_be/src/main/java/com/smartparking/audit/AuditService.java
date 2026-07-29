package com.smartparking.audit;

import com.smartparking.common.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface AuditService {
    void record(UUID actorId, Role actorRole, String action, String entityType, String entityId,
                String oldValue, String newValue, String reason);

    Page<AuditDtos.AuditLogResponse> list(UUID actorId, Role actorRole, String action, String entityType,
                                          String entityId, OffsetDateTime from, OffsetDateTime to,
                                          String requestId, Pageable pageable);

    AuditDtos.AuditLogResponse detail(UUID auditId);
}
