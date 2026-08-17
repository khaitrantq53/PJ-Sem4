update bookings
set status = 'CHECKED_IN'
where status = 'OVERDUE';

update booking_status_histories
set previous_status = 'CHECKED_IN'
where previous_status = 'OVERDUE';

update booking_status_histories
set current_status = 'CHECKED_IN'
where current_status = 'OVERDUE';

update booking_command_idempotencies
set previous_status = 'CHECKED_IN'
where previous_status = 'OVERDUE';

update booking_command_idempotencies
set current_status = 'CHECKED_IN'
where current_status = 'OVERDUE';

alter table bookings
    drop constraint if exists ck_bookings_status;

alter table bookings
    add constraint ck_bookings_status
        check (status in ('PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','DECLINED','EXPIRED','NO_SHOW'));

alter table booking_status_histories
    drop constraint if exists ck_booking_status_histories_status;

alter table booking_status_histories
    add constraint ck_booking_status_histories_status
        check (
            (previous_status is null or previous_status in ('PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','DECLINED','EXPIRED','NO_SHOW'))
            and current_status in ('PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','DECLINED','EXPIRED','NO_SHOW')
        );

alter table booking_command_idempotencies
    drop constraint if exists ck_booking_command_idempotencies_status;

alter table booking_command_idempotencies
    add constraint ck_booking_command_idempotencies_status
        check (
            (previous_status is null or previous_status in ('PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','DECLINED','EXPIRED','NO_SHOW'))
            and current_status in ('PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','DECLINED','EXPIRED','NO_SHOW')
            and payment_status in ('UNPAID','PENDING','PAID','PARTIALLY_PAID','REFUNDED','PARTIALLY_REFUNDED','FAILED')
        );
