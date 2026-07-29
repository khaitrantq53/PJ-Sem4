create table booking_pricing_snapshots (
    id uuid primary key,
    booking_id uuid not null unique references bookings(id),
    pricing_rule_id uuid references parking_pricing_rules(id),
    hourly_rate numeric(19,2) not null,
    promotion_id uuid references promotions(id),
    promotion_code varchar(80),
    promotion_name varchar(255),
    promotion_discount_amount numeric(19,2),
    currency varchar(3) not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_booking_pricing_snapshot_hourly_rate check (hourly_rate >= 0),
    constraint ck_booking_pricing_snapshot_discount check (promotion_discount_amount is null or promotion_discount_amount >= 0)
);

create index idx_booking_pricing_snapshots_pricing_rule on booking_pricing_snapshots(pricing_rule_id);
create index idx_booking_pricing_snapshots_promotion on booking_pricing_snapshots(promotion_id);
create index idx_promotion_usages_booking on promotion_usages(booking_id);
create index idx_promotion_usages_customer on promotion_usages(customer_id);
