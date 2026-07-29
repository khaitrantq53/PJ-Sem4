create table parking_status_histories (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    previous_status varchar(30),
    current_status varchar(30) not null,
    actor_id uuid,
    actor_role varchar(30),
    reason text,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create index idx_parking_status_histories_lot_created_at on parking_status_histories(parking_lot_id, created_at);
create index idx_audit_action_created_at on audit_logs(action, created_at);
create index idx_audit_request_id on audit_logs(request_id);
create index idx_bookings_status_created_at on bookings(status, created_at);
create index idx_refunds_status_created_at on refunds(status, created_at);
create index idx_discrepancy_alerts_status_created_at on occupancy_discrepancy_alerts(status, created_at);
