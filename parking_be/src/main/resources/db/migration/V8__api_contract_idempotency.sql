create table booking_command_idempotencies (
    id uuid primary key,
    idempotency_key varchar(80) not null unique,
    booking_id uuid not null references bookings(id),
    command varchar(80) not null,
    previous_status varchar(40),
    current_status varchar(40) not null,
    payment_status varchar(40) not null,
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid
);

create index idx_booking_command_idempotencies_booking on booking_command_idempotencies(booking_id, command);
