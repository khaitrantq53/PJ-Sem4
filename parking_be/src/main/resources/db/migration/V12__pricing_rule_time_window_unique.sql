drop index if exists ux_pricing_rules_one_active;

create unique index if not exists ux_pricing_rules_one_active_time_window
    on parking_pricing_rules(parking_lot_id, vehicle_type, start_time, end_time)
    where active = true;
