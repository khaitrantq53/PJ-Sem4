package com.smartparking.audit;

import com.smartparking.common.Role;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class AuditDtos {
    private AuditDtos() {
    }

    public record AuditLogResponse(UUID id, UUID actorId, Role actorRole, String action, String entityType,
                                   String entityId, String oldValue, String newValue, String reason,
                                   String ipAddress, String userAgent, String requestId,
                                   Long version, OffsetDateTime createdAt) {
    }
}
