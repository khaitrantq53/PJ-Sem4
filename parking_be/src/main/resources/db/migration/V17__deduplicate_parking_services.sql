with ranked_services as (
    select
        id,
        row_number() over (
            partition by parking_lot_id, lower(trim(name))
            order by active desc, updated_at desc, created_at desc, id
        ) as row_number
    from parking_services
)
delete from parking_services service
using ranked_services ranked
where service.id = ranked.id
  and ranked.row_number > 1;

alter table parking_services
    add constraint ck_parking_services_name_not_blank
        check (length(trim(name)) > 0);

create unique index if not exists ux_parking_services_lot_name_ci
    on parking_services(parking_lot_id, lower(trim(name)));

create unique index if not exists ux_reviews_booking_customer
    on reviews(booking_id, customer_id);

create unique index if not exists ux_payments_booking_method
    on payments(booking_id, payment_method);
