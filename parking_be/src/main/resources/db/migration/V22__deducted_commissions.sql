update staff_commissions
set status = 'DEDUCTED',
    paid_at = null,
    updated_at = now()
where status in ('PAYABLE', 'PAID', 'CANCELLED');
