update staff_commissions commission
set status = case
        when payment.payment_method in ('CASH', 'BANK_TRANSFER') then 'PAYABLE'
        else 'DEDUCTED'
    end,
    paid_at = null,
    updated_at = now()
from payments payment
where payment.id = commission.payment_id;
