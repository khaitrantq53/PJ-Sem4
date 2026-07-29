create unique index ux_booking_change_requests_pending
    on booking_change_requests(booking_id)
    where status = 'PENDING';

create unique index ux_booking_extension_requests_pending
    on booking_extension_requests(booking_id)
    where status = 'PENDING';

create index idx_booking_change_requests_booking_status
    on booking_change_requests(booking_id, status);

create index idx_booking_extension_requests_booking_status
    on booking_extension_requests(booking_id, status);
