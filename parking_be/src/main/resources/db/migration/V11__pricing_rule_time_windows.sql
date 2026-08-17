alter table parking_pricing_rules
    add column start_time time not null default time '00:00:00',
    add column end_time time not null default time '23:59:59';

alter table parking_pricing_rules
    add constraint ck_pricing_time_window check (start_time <> end_time);

create index if not exists ix_pricing_rules_lot_type_time
    on parking_pricing_rules(parking_lot_id, vehicle_type, active, start_time, end_time);
