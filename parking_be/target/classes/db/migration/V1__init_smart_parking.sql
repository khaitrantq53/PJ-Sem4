create table accounts (
    id uuid primary key,
    email varchar(255) unique,
    phone varchar(50) unique,
    role varchar(30) not null,
    status varchar(30) not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_accounts_role check (role in ('CUSTOMER','STAFF','ADMIN')),
    constraint ck_accounts_status check (status in ('PENDING_APPROVAL','ACTIVE','SUSPENDED','REJECTED','LOCKED')),
    constraint ck_accounts_contact check (email is not null or phone is not null)
);

create table account_credentials (
    id uuid primary key,
    account_id uuid not null unique references accounts(id),
    password_hash varchar(255) not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table customer_profiles (
    id uuid primary key,
    account_id uuid not null unique references accounts(id),
    full_name varchar(255) not null,
    avatar_file_id varchar(255),
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table staff_profiles (
    id uuid primary key,
    account_id uuid not null unique references accounts(id),
    full_name varchar(255) not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table refresh_tokens (
    id uuid primary key,
    account_id uuid not null references accounts(id),
    token_hash varchar(255) not null unique,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table otp_requests (
    id uuid primary key,
    account_id uuid,
    destination varchar(255) not null,
    purpose varchar(80) not null,
    otp_hash varchar(255) not null,
    expires_at timestamptz not null,
    verified_at timestamptz,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table vehicles (
    id uuid primary key,
    customer_id uuid not null references accounts(id),
    plate_number varchar(50) not null,
    vehicle_type varchar(40) not null,
    brand varchar(120),
    color varchar(80),
    default_vehicle boolean not null,
    status varchar(20) not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_vehicles_status check (status in ('ACTIVE','INACTIVE')),
    constraint ck_vehicles_type check (vehicle_type in ('MOTORBIKE','CAR','ELECTRIC_CAR','BICYCLE','TRUCK'))
);

create unique index ux_vehicles_one_default on vehicles(customer_id) where default_vehicle = true and status = 'ACTIVE';
create index idx_vehicles_customer_status on vehicles(customer_id, status);
create index idx_vehicles_plate_number on vehicles(plate_number);

create table vehicle_images (
    id uuid primary key,
    vehicle_id uuid not null references vehicles(id),
    bucket varchar(255) not null,
    object_key varchar(500) not null,
    content_type varchar(120) not null,
    file_size bigint not null,
    checksum varchar(255),
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table parking_lots (
    id uuid primary key,
    name varchar(255) not null,
    address varchar(500) not null,
    latitude numeric(10,7),
    longitude numeric(10,7),
    status varchar(30) not null,
    description text,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_parking_lots_status check (status in ('DRAFT','PENDING_APPROVAL','ACTIVE','PAUSED','CLOSURE_REQUESTED','CLOSED','SUSPENDED'))
);

create index idx_parking_lots_status on parking_lots(status);
create index idx_parking_lots_location on parking_lots(latitude, longitude);

create table parking_lot_staff (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    staff_id uuid not null references accounts(id),
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ux_parking_lot_staff unique (parking_lot_id, staff_id)
);

create table parking_lot_images (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    bucket varchar(255) not null,
    object_key varchar(500) not null,
    content_type varchar(120) not null,
    file_size bigint not null,
    checksum varchar(255),
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table parking_operating_hours (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    day_of_week integer not null,
    open_time time not null,
    close_time time not null,
    closed boolean not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_operating_day check (day_of_week between 1 and 7)
);

create table parking_vehicle_capacities (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    vehicle_type varchar(40) not null,
    total_capacity integer not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ux_capacity_lot_type unique (parking_lot_id, vehicle_type),
    constraint ck_capacity_non_negative check (total_capacity >= 0)
);

create table parking_capacity_blocks (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    vehicle_type varchar(40) not null,
    quantity integer not null,
    start_time timestamptz not null,
    end_time timestamptz not null,
    reason text,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_capacity_block_quantity check (quantity > 0),
    constraint ck_capacity_block_time check (start_time < end_time)
);

create table parking_services (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    name varchar(255) not null,
    price numeric(19,2) not null,
    active boolean not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_parking_services_price check (price >= 0)
);

create table parking_policies (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    policy_key varchar(120) not null,
    policy_value text not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ux_parking_policy unique (parking_lot_id, policy_key)
);

create table parking_pricing_rules (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    vehicle_type varchar(40) not null,
    hourly_rate numeric(19,2) not null,
    active boolean not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_pricing_hourly_rate check (hourly_rate >= 0)
);

create table promotions (
    id uuid primary key,
    code varchar(80) not null unique,
    name varchar(255) not null,
    discount_amount numeric(19,2) not null,
    active boolean not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_promotion_discount check (discount_amount >= 0),
    constraint ck_promotion_time check (starts_at < ends_at)
);

create table promotion_parking_lots (
    id uuid primary key,
    promotion_id uuid not null references promotions(id),
    parking_lot_id uuid not null references parking_lots(id),
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ux_promotion_lot unique (promotion_id, parking_lot_id)
);

create table bookings (
    id uuid primary key,
    booking_code varchar(80) not null unique,
    customer_id uuid not null references accounts(id),
    vehicle_id uuid not null references vehicles(id),
    parking_lot_id uuid not null references parking_lots(id),
    vehicle_type varchar(40) not null,
    status varchar(40) not null,
    payment_status varchar(40) not null,
    delivery_method varchar(40) not null,
    payment_method varchar(40) not null,
    start_time timestamptz not null,
    end_time timestamptz not null,
    actual_check_in_time timestamptz,
    actual_check_out_time timestamptz,
    hold_expires_at timestamptz,
    approval_expires_at timestamptz,
    parking_fee numeric(19,2) not null,
    service_fee numeric(19,2) not null,
    pickup_fee numeric(19,2) not null,
    discount_amount numeric(19,2) not null,
    platform_fee numeric(19,2) not null,
    tax_amount numeric(19,2) not null,
    overtime_fee numeric(19,2) not null,
    total_amount numeric(19,2) not null,
    currency varchar(3) not null,
    idempotency_key varchar(255) unique,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_booking_time check (start_time < end_time),
    constraint ck_booking_amounts check (
        parking_fee >= 0 and service_fee >= 0 and pickup_fee >= 0 and discount_amount >= 0 and
        platform_fee >= 0 and tax_amount >= 0 and overtime_fee >= 0 and total_amount >= 0
    )
);

create index idx_bookings_customer_created_at on bookings(customer_id, created_at);
create index idx_bookings_lot_status_start on bookings(parking_lot_id, status, start_time);
create index idx_bookings_vehicle_time on bookings(vehicle_id, start_time, end_time);

create table booking_services (
    id uuid primary key,
    booking_id uuid not null references bookings(id),
    service_id uuid not null,
    service_name varchar(255) not null,
    price numeric(19,2) not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table booking_price_items (
    id uuid primary key,
    booking_id uuid not null references bookings(id),
    item_type varchar(80) not null,
    label varchar(255) not null,
    amount numeric(19,2) not null,
    currency varchar(3) not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table booking_status_histories (
    id uuid primary key,
    booking_id uuid not null references bookings(id),
    previous_status varchar(40),
    current_status varchar(40) not null,
    actor_id uuid,
    actor_role varchar(30),
    reason text,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table booking_change_requests (
    id uuid primary key,
    booking_id uuid not null references bookings(id),
    requested_start_time timestamptz not null,
    requested_end_time timestamptz not null,
    status varchar(30) not null,
    reason text,
    decision_reason text,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_booking_change_time check (requested_start_time < requested_end_time)
);

create table booking_extension_requests (
    id uuid primary key,
    booking_id uuid not null references bookings(id),
    requested_end_time timestamptz not null,
    status varchar(30) not null,
    reason text,
    decision_reason text,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table booking_capacity_reservations (
    id uuid primary key,
    booking_id uuid not null unique references bookings(id),
    parking_lot_id uuid not null references parking_lots(id),
    vehicle_type varchar(40) not null,
    start_time timestamptz not null,
    end_time timestamptz not null,
    released boolean not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_booking_reservation_time check (start_time < end_time)
);

create table payments (
    id uuid primary key,
    booking_id uuid not null references bookings(id),
    payment_method varchar(40) not null,
    status varchar(40) not null,
    amount numeric(19,2) not null,
    currency varchar(3) not null,
    provider varchar(120),
    provider_transaction_id varchar(255) unique,
    idempotency_key varchar(255) unique,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_payment_amount check (amount >= 0)
);

create index idx_payments_booking on payments(booking_id);
create index idx_payments_provider_transaction on payments(provider_transaction_id);

create table payment_transactions (
    id uuid primary key,
    payment_id uuid not null references payments(id),
    provider varchar(120) not null,
    provider_transaction_id varchar(255) not null,
    status varchar(30) not null,
    raw_payload text,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ux_payment_provider_transaction unique (provider, provider_transaction_id)
);

create table refunds (
    id uuid primary key,
    payment_id uuid not null references payments(id),
    amount numeric(19,2) not null,
    currency varchar(3) not null,
    status varchar(30) not null,
    reason text not null,
    idempotency_key varchar(255) unique,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_refund_amount check (amount > 0)
);

create table vehicle_condition_records (
    id uuid primary key,
    booking_id uuid not null references bookings(id),
    record_type varchar(30) not null,
    notes text,
    recorded_by uuid not null,
    recorded_at timestamptz not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table vehicle_condition_images (
    id uuid primary key,
    record_id uuid not null references vehicle_condition_records(id),
    bucket varchar(255) not null,
    object_key varchar(500) not null,
    content_type varchar(120) not null,
    file_size bigint not null,
    checksum varchar(255),
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table promotion_usages (
    id uuid primary key,
    promotion_id uuid not null references promotions(id),
    booking_id uuid not null references bookings(id),
    customer_id uuid not null references accounts(id),
    discount_amount numeric(19,2) not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table notifications (
    id uuid primary key,
    recipient_id uuid not null references accounts(id),
    type varchar(80) not null,
    title varchar(255) not null,
    content text not null,
    read_at timestamptz,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table devices (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    device_code varchar(120) not null unique,
    status varchar(30) not null,
    last_heartbeat_at timestamptz,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table device_occupancy_reports (
    id uuid primary key,
    device_id uuid not null references devices(id),
    vehicle_type varchar(40) not null,
    occupied_count integer not null,
    reported_at timestamptz not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table occupancy_discrepancy_alerts (
    id uuid primary key,
    parking_lot_id uuid not null references parking_lots(id),
    vehicle_type varchar(40) not null,
    expected_count integer not null,
    reported_count integer not null,
    status varchar(30) not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table reviews (
    id uuid primary key,
    booking_id uuid not null references bookings(id),
    customer_id uuid not null references accounts(id),
    rating integer not null,
    content text,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_reviews_rating check (rating between 1 and 5)
);

create table complaints (
    id uuid primary key,
    booking_id uuid references bookings(id),
    customer_id uuid not null references accounts(id),
    status varchar(30) not null,
    content text not null,
    resolution text,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table stored_files (
    id uuid primary key,
    bucket varchar(255) not null,
    object_key varchar(500) not null,
    content_type varchar(120) not null,
    file_size bigint not null,
    checksum varchar(255),
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create table audit_logs (
    id uuid primary key,
    actor_id uuid,
    actor_role varchar(30),
    action varchar(120) not null,
    entity_type varchar(120) not null,
    entity_id varchar(120) not null,
    old_value text,
    new_value text,
    reason text,
    ip_address varchar(80),
    user_agent varchar(500),
    request_id varchar(120) not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create index idx_audit_entity on audit_logs(entity_type, entity_id);
create index idx_audit_actor_created_at on audit_logs(actor_id, created_at);
