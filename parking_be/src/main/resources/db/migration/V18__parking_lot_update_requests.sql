create table parking_lot_update_requests (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    requested_by uuid not null references accounts(id),
    status varchar(30) not null,
    name varchar(255) not null,
    address varchar(500) not null,
    latitude numeric(10,7),
    longitude numeric(10,7),
    description text,
    expected_version bigint,
    decision_reason text,
    decided_by uuid references accounts(id),
    decided_at timestamptz,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_parking_lot_update_requests_status
        check (status in ('PENDING','APPROVED','REJECTED'))
);

create unique index ux_parking_lot_update_requests_one_pending
    on parking_lot_update_requests(parking_lot_id)
    where status = 'PENDING';

create index idx_parking_lot_update_requests_status_created
    on parking_lot_update_requests(status, created_at);

create table parking_lot_update_capacities (
    id uuid primary key,
    request_id uuid not null references parking_lot_update_requests(id) on delete cascade,
    vehicle_type varchar(40) not null,
    total_capacity integer not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_parking_lot_update_capacities_vehicle_type
        check (vehicle_type in ('MOTORBIKE','CAR','ELECTRIC_CAR','TRUCK')),
    constraint ck_parking_lot_update_capacities_non_negative
        check (total_capacity >= 0)
);

create unique index ux_parking_lot_update_capacities_type
    on parking_lot_update_capacities(request_id, vehicle_type);

create table parking_lot_update_pricing_rules (
    id uuid primary key,
    request_id uuid not null references parking_lot_update_requests(id) on delete cascade,
    vehicle_type varchar(40) not null,
    hourly_rate numeric(19,2) not null,
    start_time time not null,
    end_time time not null,
    active boolean not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_parking_lot_update_pricing_vehicle_type
        check (vehicle_type in ('MOTORBIKE','CAR','ELECTRIC_CAR','TRUCK')),
    constraint ck_parking_lot_update_pricing_rate
        check (hourly_rate >= 0),
    constraint ck_parking_lot_update_pricing_time_window
        check (start_time <> end_time)
);

create unique index ux_parking_lot_update_pricing_window
    on parking_lot_update_pricing_rules(request_id, vehicle_type, start_time, end_time);

create table parking_lot_update_services (
    id uuid primary key,
    request_id uuid not null references parking_lot_update_requests(id) on delete cascade,
    name varchar(255) not null,
    price numeric(19,2) not null,
    active boolean not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_parking_lot_update_services_name_not_blank
        check (length(trim(name)) > 0),
    constraint ck_parking_lot_update_services_price
        check (price >= 0)
);

create unique index ux_parking_lot_update_services_name_ci
    on parking_lot_update_services(request_id, lower(trim(name)));
