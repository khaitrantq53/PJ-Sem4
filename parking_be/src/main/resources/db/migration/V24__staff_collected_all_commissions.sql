update staff_commissions
set status = 'PAYABLE',
    paid_at = null,
    updated_at = now()
where status = 'DEDUCTED';
