package com.smartparking.audit;

import com.smartparking.common.Role;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.RequestContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AuditServiceImpl implements AuditService {
    private final AuditLogRepository auditLogRepository;
    private final AuditMapper auditMapper;

    public AuditServiceImpl(AuditLogRepository auditLogRepository, AuditMapper auditMapper) {
        this.auditLogRepository = auditLogRepository;
        this.auditMapper = auditMapper;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID actorId, Role actorRole, String action, String entityType, String entityId,
                       String oldValue, String newValue, String reason) {
        AuditLog auditLog = new AuditLog();
        auditLog.setActorId(actorId);
        auditLog.setActorRole(actorRole);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setOldValue(oldValue);
        auditLog.setNewValue(newValue);
        auditLog.setReason(reason);
        auditLog.setIpAddress(RequestContext.ipAddress());
        auditLog.setUserAgent(RequestContext.userAgent());
        auditLog.setRequestId(RequestContext.requestId());
        auditLogRepository.save(auditLog);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditDtos.AuditLogResponse> list(UUID actorId, Role actorRole, String action, String entityType,
                                                 String entityId, OffsetDateTime from, OffsetDateTime to,
                                                 String requestId, Pageable pageable) {
        return auditLogRepository.findAll(auditSpecification(actorId, actorRole, action, entityType,
                entityId, from, to, requestId), pageable).map(auditMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AuditDtos.AuditLogResponse detail(UUID auditId) {
        return auditLogRepository.findById(auditId)
                .map(auditMapper::toResponse)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUDIT_LOG_NOT_FOUND, "Audit log không tồn tại"));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private Specification<AuditLog> auditSpecification(UUID actorId, Role actorRole, String action, String entityType,
                                                       String entityId, OffsetDateTime from, OffsetDateTime to,
                                                       String requestId) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (actorId != null) {
                predicates.add(builder.equal(root.get("actorId"), actorId));
            }
            if (actorRole != null) {
                predicates.add(builder.equal(root.get("actorRole"), actorRole));
            }

            String normalizedAction = blankToNull(action);
            if (normalizedAction != null) {
                predicates.add(builder.like(builder.lower(root.get("action")), "%" + normalizedAction.toLowerCase() + "%"));
            }

            String normalizedEntityType = blankToNull(entityType);
            if (normalizedEntityType != null) {
                predicates.add(builder.equal(builder.lower(root.get("entityType")), normalizedEntityType.toLowerCase()));
            }

            String normalizedEntityId = blankToNull(entityId);
            if (normalizedEntityId != null) {
                predicates.add(builder.equal(root.get("entityId"), normalizedEntityId));
            }
            if (from != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(builder.lessThanOrEqualTo(root.get("createdAt"), to));
            }

            String normalizedRequestId = blankToNull(requestId);
            if (normalizedRequestId != null) {
                predicates.add(builder.equal(root.get("requestId"), normalizedRequestId));
            }

            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }
}
