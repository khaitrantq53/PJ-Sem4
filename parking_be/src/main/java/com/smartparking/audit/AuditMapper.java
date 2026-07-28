package com.smartparking.audit;

import org.springframework.stereotype.Component;

@Component
public class AuditMapper {
    public AuditDtos.AuditLogResponse toResponse(AuditLog log) {
        return new AuditDtos.AuditLogResponse(
                log.getId(),
                log.getActorId(),
                log.getActorRole(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                log.getOldValue(),
                log.getNewValue(),
                log.getReason(),
                log.getIpAddress(),
                log.getUserAgent(),
                log.getRequestId(),
                log.getVersion(),
                log.getCreatedAt()
        );
    }
}
