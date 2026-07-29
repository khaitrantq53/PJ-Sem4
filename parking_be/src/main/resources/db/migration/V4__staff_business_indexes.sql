create index idx_capacity_blocks_lot_type_time
    on parking_capacity_blocks(parking_lot_id, vehicle_type, start_time, end_time);

create unique index ux_pricing_rules_one_active
    on parking_pricing_rules(parking_lot_id, vehicle_type)
    where active = true;

create index idx_parking_services_lot_active
    on parking_services(parking_lot_id, active);

create index idx_promotion_parking_lots_lot
    on promotion_parking_lots(parking_lot_id);

create index idx_parking_policies_lot
    on parking_policies(parking_lot_id);
