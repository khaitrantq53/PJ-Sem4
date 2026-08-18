create table parking_lot_update_images (
    id uuid primary key,
    request_id uuid not null references parking_lot_update_requests(id) on delete cascade,
    bucket varchar(255) not null,
    object_key varchar(500) not null,
    content_type varchar(120) not null,
    file_size bigint not null,
    checksum varchar(255),
    version bigint not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    created_by uuid,
    updated_by uuid,
    constraint ck_parking_lot_update_images_file_size check (file_size > 0)
);

create index idx_parking_lot_update_images_request on parking_lot_update_images(request_id);
