package com.smartparking.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import com.smartparking.common.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.OffsetDateTime;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {
    @Query("""
            select a
            from AuditLog a
            where (:actorId is null or a.actorId = :actorId)
              and (:actorRole is null or a.actorRole = :actorRole)
              and (:action is null or lower(a.action) like concat('%', lower(:action), '%'))
              and (:entityType is null or lower(a.entityType) = lower(:entityType))
              and (:entityId is null or a.entityId = :entityId)
              and (:from is null or a.createdAt >= :from)
              and (:to is null or a.createdAt <= :to)
              and (:requestId is null or a.requestId = :requestId)
            """)
    Page<AuditLog> search(UUID actorId, Role actorRole, String action, String entityType, String entityId,
                          OffsetDateTime from, OffsetDateTime to, String requestId, Pageable pageable);
}
