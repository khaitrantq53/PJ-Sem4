create table staff_commissions (
    id uuid primary key,
    staff_id uuid not null references accounts(id),
    parking_lot_id uuid not null references parking_lots(id),
    booking_id uuid not null references bookings(id),
    payment_id uuid not null references payments(id),
    gross_amount numeric(19,2) not null,
    commission_rate numeric(5,4) not null,
    commission_amount numeric(19,2) not null,
    platform_amount numeric(19,2) not null,
    currency varchar(3) not null,
    status varchar(30) not null,
    paid_at timestamptz,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint uq_staff_commissions_payment unique (payment_id),
    constraint uq_staff_commissions_booking unique (booking_id)
);

create index idx_staff_commissions_staff_created_at on staff_commissions(staff_id, created_at desc);
create index idx_staff_commissions_status_created_at on staff_commissions(status, created_at desc);
create index idx_staff_commissions_lot_created_at on staff_commissions(parking_lot_id, created_at desc);

create extension if not exists pgcrypto;

insert into staff_commissions (
    id,
    staff_id,
    parking_lot_id,
    booking_id,
    payment_id,
    gross_amount,
    commission_rate,
    commission_amount,
    platform_amount,
    currency,
    status,
    version,
    created_at,
    updated_at
)
select
    gen_random_uuid(),
    lot_staff.staff_id,
    b.parking_lot_id,
    b.id,
    p.id,
    p.amount,
    0.1000,
    round(p.amount * 0.1000, 2),
    p.amount - round(p.amount * 0.1000, 2),
    p.currency,
    'PAYABLE',
    0,
    p.created_at,
    p.updated_at
from payments p
join bookings b on b.id = p.booking_id
join (
    select distinct on (parking_lot_id) parking_lot_id, staff_id
    from parking_lot_staff
    order by parking_lot_id, created_at, id
) lot_staff on lot_staff.parking_lot_id = b.parking_lot_id
where p.status = 'PAID'
  and not exists (
      select 1
      from staff_commissions c
      where c.payment_id = p.id
  );
