update parking_services
set price = 50000,
    updated_at = now()
where active = true
  and (
    lower(name) like '%ev%'
    or lower(name) like '%electric%'
    or lower(name) like '%sạc%'
  );

update parking_services
set price = 10000,
    updated_at = now()
where active = true
  and (
    lower(name) like '%wash%'
    or lower(name) like '%rửa%'
  );
