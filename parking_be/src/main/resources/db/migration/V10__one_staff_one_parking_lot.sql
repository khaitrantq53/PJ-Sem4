delete from parking_lot_staff pls
using (
    select id,
           row_number() over (
               partition by parking_lot_id
               order by created_at, id
           ) as row_number
    from parking_lot_staff
) ranked
where pls.id = ranked.id
  and ranked.row_number > 1;

delete from parking_lot_staff pls
using (
    select id,
           row_number() over (
               partition by staff_id
               order by created_at, id
           ) as row_number
    from parking_lot_staff
) ranked
where pls.id = ranked.id
  and ranked.row_number > 1;

alter table parking_lot_staff
    add constraint ux_parking_lot_staff_lot unique (parking_lot_id);

alter table parking_lot_staff
    add constraint ux_parking_lot_staff_staff unique (staff_id);
