alter table parking_lots
    add column previous_status varchar(30);

alter table parking_lots
    add constraint ck_parking_lots_previous_status
        check (previous_status is null or previous_status in ('ACTIVE','PAUSED'));
