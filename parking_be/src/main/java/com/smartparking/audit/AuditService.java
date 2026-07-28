package com.smartparking.audit;

import com.smartparking.common.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface AuditService {
    void record(UUID actorId, Role actorRole, String action, String entityType, String entityId,
                String oldValue, String newValue, String reason);

    Page<AuditDtos.AuditLogResponse> list(Pageable pageable);

    AuditDtos.AuditLogResponse detail(UUID auditId);
}
