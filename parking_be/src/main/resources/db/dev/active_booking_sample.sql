set search_path to smart_parking;

begin;

insert into accounts (
    id,
    email,
    phone,
    role,
    status,
    version,
    created_at,
    updated_at
) values (
    '11111111-1111-4111-8111-111111111111',
    'sample.customer@example.com',
    '0912345678',
    'CUSTOMER',
    'ACTIVE',
    0,
    now(),
    now()
) on conflict (id) do update set
    email = excluded.email,
    phone = excluded.phone,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

insert into account_credentials (
    id,
    account_id,
    password_hash,
    version,
    created_at,
    updated_at
) values (
    '11111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111111',
    '$2b$12$xWjZH3GOv5lbOY2PO73nouGbDaGaqjITp7pvJopjzGErh25KakVqy',
    0,
    now(),
    now()
) on conflict (account_id) do update set
    password_hash = excluded.password_hash,
    updated_at = now();

insert into customer_profiles (
    id,
    account_id,
    full_name,
    version,
    created_at,
    updated_at
) values (
    '11111111-1111-4111-8111-111111111113',
    '11111111-1111-4111-8111-111111111111',
    'Nguyen Minh Anh',
    0,
    now(),
    now()
) on conflict (account_id) do update set
    full_name = excluded.full_name,
    updated_at = now();

insert into accounts (
    id,
    email,
    phone,
    role,
    status,
    version,
    created_at,
    updated_at
) values (
    '11111111-1111-4111-8111-111111111121',
    'sample.staff@example.com',
    '0987654321',
    'STAFF',
    'ACTIVE',
    0,
    now(),
    now()
) on conflict (id) do update set
    email = excluded.email,
    phone = excluded.phone,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

insert into account_credentials (
    id,
    account_id,
    password_hash,
    version,
    created_at,
    updated_at
) values (
    '11111111-1111-4111-8111-111111111122',
    '11111111-1111-4111-8111-111111111121',
    '$2b$12$xWjZH3GOv5lbOY2PO73nouGbDaGaqjITp7pvJopjzGErh25KakVqy',
    0,
    now(),
    now()
) on conflict (account_id) do update set
    password_hash = excluded.password_hash,
    updated_at = now();

insert into staff_profiles (
    id,
    account_id,
    full_name,
    version,
    created_at,
    updated_at
) values (
    '11111111-1111-4111-8111-111111111123',
    '11111111-1111-4111-8111-111111111121',
    'Tran Staff Demo',
    0,
    now(),
    now()
) on conflict (account_id) do update set
    full_name = excluded.full_name,
    updated_at = now();

insert into parking_lots (
    id,
    name,
    address,
    latitude,
    longitude,
    status,
    description,
    version,
    created_at,
    updated_at
) values (
    '22222222-2222-4222-8222-222222222221',
    'ParkFinder Hoan Kiem Garage',
    '15 Trang Tien, phuong Trang Tien, quan Hoan Kiem, Ha Noi',
    21.0248600,
    105.8543800,
    'ACTIVE',
    'Sample central parking lot for customer active booking UI.',
    0,
    now(),
    now()
) on conflict (id) do update set
    name = excluded.name,
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    status = excluded.status,
    description = excluded.description,
    updated_at = now();

insert into parking_lot_staff (
    id,
    parking_lot_id,
    staff_id,
    version,
    created_at,
    updated_at
) values (
    '22222222-2222-4222-8222-222222222231',
    '22222222-2222-4222-8222-222222222221',
    '11111111-1111-4111-8111-111111111121',
    0,
    now(),
    now()
) on conflict (parking_lot_id, staff_id) do update set
    updated_at = now();

insert into parking_operating_hours (
    id,
    parking_lot_id,
    day_of_week,
    open_time,
    close_time,
    closed,
    version,
    created_at,
    updated_at
) values
    ('22222222-2222-4222-8222-222222222301', '22222222-2222-4222-8222-222222222221', 1, '06:00', '23:59', false, 0, now(), now()),
    ('22222222-2222-4222-8222-222222222302', '22222222-2222-4222-8222-222222222221', 2, '06:00', '23:59', false, 0, now(), now()),
    ('22222222-2222-4222-8222-222222222303', '22222222-2222-4222-8222-222222222221', 3, '06:00', '23:59', false, 0, now(), now()),
    ('22222222-2222-4222-8222-222222222304', '22222222-2222-4222-8222-222222222221', 4, '06:00', '23:59', false, 0, now(), now()),
    ('22222222-2222-4222-8222-222222222305', '22222222-2222-4222-8222-222222222221', 5, '06:00', '23:59', false, 0, now(), now()),
    ('22222222-2222-4222-8222-222222222306', '22222222-2222-4222-8222-222222222221', 6, '06:00', '23:59', false, 0, now(), now()),
    ('22222222-2222-4222-8222-222222222307', '22222222-2222-4222-8222-222222222221', 7, '06:00', '23:59', false, 0, now(), now())
on conflict (parking_lot_id, day_of_week) do update set
    open_time = excluded.open_time,
    close_time = excluded.close_time,
    closed = excluded.closed,
    updated_at = now();

insert into parking_vehicle_capacities (
    id,
    parking_lot_id,
    vehicle_type,
    total_capacity,
    version,
    created_at,
    updated_at
) values
    ('22222222-2222-4222-8222-222222222401', '22222222-2222-4222-8222-222222222221', 'CAR', 80, 0, now(), now()),
    ('22222222-2222-4222-8222-222222222402', '22222222-2222-4222-8222-222222222221', 'MOTORBIKE', 160, 0, now(), now())
on conflict (parking_lot_id, vehicle_type) do update set
    total_capacity = excluded.total_capacity,
    updated_at = now();

insert into parking_pricing_rules (
    id,
    parking_lot_id,
    vehicle_type,
    hourly_rate,
    active,
    version,
    created_at,
    updated_at
) values (
    '22222222-2222-4222-8222-222222222501',
    '22222222-2222-4222-8222-222222222221',
    'CAR',
    25000.00,
    true,
    0,
    now(),
    now()
) on conflict (id) do update set
    hourly_rate = excluded.hourly_rate,
    active = excluded.active,
    updated_at = now();

insert into parking_services (
    id,
    parking_lot_id,
    name,
    price,
    active,
    version,
    created_at,
    updated_at
) values (
    '22222222-2222-4222-8222-222222222601',
    '22222222-2222-4222-8222-222222222221',
    'QR Fast Access',
    5000.00,
    true,
    0,
    now(),
    now()
) on conflict (id) do update set
    name = excluded.name,
    price = excluded.price,
    active = excluded.active,
    updated_at = now();

insert into vehicles (
    id,
    customer_id,
    plate_number,
    vehicle_type,
    brand,
    color,
    default_vehicle,
    status,
    version,
    created_at,
    updated_at
) values (
    '33333333-3333-4333-8333-333333333331',
    '11111111-1111-4111-8111-111111111111',
    '30A-123.45',
    'CAR',
    'Toyota Corolla',
    'Black',
    true,
    'ACTIVE',
    0,
    now(),
    now()
) on conflict (id) do update set
    plate_number = excluded.plate_number,
    vehicle_type = excluded.vehicle_type,
    brand = excluded.brand,
    color = excluded.color,
    default_vehicle = excluded.default_vehicle,
    status = excluded.status,
    updated_at = now();

insert into bookings (
    id,
    booking_code,
    customer_id,
    vehicle_id,
    parking_lot_id,
    vehicle_type,
    status,
    payment_status,
    delivery_method,
    payment_method,
    start_time,
    end_time,
    actual_check_in_time,
    actual_check_out_time,
    hold_expires_at,
    approval_expires_at,
    parking_fee,
    service_fee,
    pickup_fee,
    discount_amount,
    platform_fee,
    tax_amount,
    overtime_fee,
    total_amount,
    currency,
    version,
    created_at,
    updated_at
) values (
    '44444444-4444-4444-8444-444444444441',
    'PF-ACTIVE-001',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333331',
    '22222222-2222-4222-8222-222222222221',
    'CAR',
    'CONFIRMED',
    'PAID',
    'SELF_DROP_OFF',
    'QR',
    now() + interval '15 minutes',
    now() + interval '3 hours 15 minutes',
    null,
    null,
    null,
    null,
    75000.00,
    5000.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    80000.00,
    'VND',
    0,
    now() - interval '10 minutes',
    now()
) on conflict (id) do update set
    booking_code = excluded.booking_code,
    customer_id = excluded.customer_id,
    vehicle_id = excluded.vehicle_id,
    parking_lot_id = excluded.parking_lot_id,
    vehicle_type = excluded.vehicle_type,
    status = excluded.status,
    payment_status = excluded.payment_status,
    delivery_method = excluded.delivery_method,
    payment_method = excluded.payment_method,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    actual_check_in_time = excluded.actual_check_in_time,
    actual_check_out_time = excluded.actual_check_out_time,
    parking_fee = excluded.parking_fee,
    service_fee = excluded.service_fee,
    pickup_fee = excluded.pickup_fee,
    discount_amount = excluded.discount_amount,
    platform_fee = excluded.platform_fee,
    tax_amount = excluded.tax_amount,
    overtime_fee = excluded.overtime_fee,
    total_amount = excluded.total_amount,
    currency = excluded.currency,
    updated_at = now();

insert into booking_capacity_reservations (
    id,
    booking_id,
    parking_lot_id,
    vehicle_type,
    start_time,
    end_time,
    released,
    version,
    created_at,
    updated_at
) values (
    '44444444-4444-4444-8444-444444444442',
    '44444444-4444-4444-8444-444444444441',
    '22222222-2222-4222-8222-222222222221',
    'CAR',
    now() + interval '15 minutes',
    now() + interval '3 hours 15 minutes',
    false,
    0,
    now(),
    now()
) on conflict (booking_id) do update set
    parking_lot_id = excluded.parking_lot_id,
    vehicle_type = excluded.vehicle_type,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    released = excluded.released,
    updated_at = now();

insert into booking_pricing_snapshots (
    id,
    booking_id,
    pricing_rule_id,
    hourly_rate,
    currency,
    version,
    created_at,
    updated_at
) values (
    '44444444-4444-4444-8444-444444444443',
    '44444444-4444-4444-8444-444444444441',
    '22222222-2222-4222-8222-222222222501',
    25000.00,
    'VND',
    0,
    now(),
    now()
) on conflict (booking_id) do update set
    pricing_rule_id = excluded.pricing_rule_id,
    hourly_rate = excluded.hourly_rate,
    currency = excluded.currency,
    updated_at = now();

delete from booking_price_items
where booking_id = '44444444-4444-4444-8444-444444444441';

insert into booking_price_items (
    id,
    booking_id,
    item_type,
    label,
    amount,
    currency,
    version,
    created_at,
    updated_at
) values
    ('44444444-4444-4444-8444-444444444451', '44444444-4444-4444-8444-444444444441', 'PARKING_FEE', 'Parking Fee - 3 hours', 75000.00, 'VND', 0, now(), now()),
    ('44444444-4444-4444-8444-444444444452', '44444444-4444-4444-8444-444444444441', 'SERVICE_FEE', 'QR Fast Access', 5000.00, 'VND', 0, now(), now());

insert into payments (
    id,
    booking_id,
    payment_method,
    status,
    amount,
    currency,
    provider,
    provider_transaction_id,
    version,
    created_at,
    updated_at
) values (
    '55555555-5555-4555-8555-555555555551',
    '44444444-4444-4444-8444-444444444441',
    'QR',
    'PAID',
    80000.00,
    'VND',
    'SAMPLE',
    'SAMPLE-PF-ACTIVE-001',
    0,
    now(),
    now()
) on conflict (id) do update set
    payment_method = excluded.payment_method,
    status = excluded.status,
    amount = excluded.amount,
    currency = excluded.currency,
    provider = excluded.provider,
    provider_transaction_id = excluded.provider_transaction_id,
    updated_at = now();

delete from booking_status_histories
where booking_id = '44444444-4444-4444-8444-444444444441';

insert into booking_status_histories (
    id,
    booking_id,
    previous_status,
    current_status,
    actor_id,
    actor_role,
    reason,
    version,
    created_at,
    updated_at
) values
    ('66666666-6666-4666-8666-666666666661', '44444444-4444-4444-8444-444444444441', null, 'PENDING_APPROVAL', '11111111-1111-4111-8111-111111111111', 'CUSTOMER', 'Sample booking created', 0, now() - interval '10 minutes', now() - interval '10 minutes'),
    ('66666666-6666-4666-8666-666666666662', '44444444-4444-4444-8444-444444444441', 'PENDING_APPROVAL', 'PENDING_PAYMENT', null, null, 'Sample booking approved', 0, now() - interval '8 minutes', now() - interval '8 minutes'),
    ('66666666-6666-4666-8666-666666666663', '44444444-4444-4444-8444-444444444441', 'PENDING_PAYMENT', 'CONFIRMED', '11111111-1111-4111-8111-111111111111', 'CUSTOMER', 'Sample payment completed', 0, now() - interval '6 minutes', now() - interval '6 minutes');

insert into notifications (
    id,
    recipient_id,
    type,
    title,
    content,
    version,
    created_at,
    updated_at
) values (
    '77777777-7777-4777-8777-777777777771',
    '11111111-1111-4111-8111-111111111111',
    'BOOKING_CONFIRMED',
    'Booking confirmed',
    'Your sample booking PF-ACTIVE-001 is ready for check-in.',
    0,
    now(),
    now()
) on conflict (id) do update set
    title = excluded.title,
    content = excluded.content,
    updated_at = now();

commit;
