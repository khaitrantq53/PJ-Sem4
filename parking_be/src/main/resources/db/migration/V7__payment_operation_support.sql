alter table payment_transactions add column idempotency_key varchar(255);

create unique index ux_payment_transactions_idempotency_key on payment_transactions(idempotency_key) where idempotency_key is not null;
create index idx_bookings_approval_expiry on bookings(status, approval_expires_at);
create index idx_bookings_hold_expiry on bookings(status, hold_expires_at);
create index idx_bookings_status_start_time on bookings(status, start_time);
create index idx_bookings_status_end_time on bookings(status, end_time);
create index idx_devices_status_heartbeat on devices(status, last_heartbeat_at);
create index idx_promotions_active_ends_at on promotions(active, ends_at);
