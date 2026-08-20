import { useEffect, useMemo, useState } from 'react';
import {
  apiPage,
  apiRequest,
} from '../../services/api.js';
import { CustomerMobileNav, CustomerSidebar, initialsFor } from './CustomerChrome.jsx';

function formatMoney(value, currency = 'VND') {
  const amount = Number(value?.amount ?? value ?? 0);
  return new Intl.NumberFormat('en-US', {
    currency: value?.currency || currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isPaidStatus(status) {
  return ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(status);
}

function isUnpaidStatus(status) {
  return ['UNPAID', 'PENDING', 'FAILED'].includes(status);
}

function monthMatches(value, now = new Date()) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime())
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear();
}

function methodLabel(row) {
  if (row.paymentMethod === 'QR') {
    return 'QR';
  }

  if (row.paymentMethod === 'CARD') {
    return 'CARD';
  }

  if (row.paymentMethod === 'BANK_TRANSFER') {
    return 'BANK';
  }

  return row.paymentMethod || 'QR';
}

function buildRows(bookings, paymentMap) {
  return bookings.flatMap((booking) => {
    const payments = paymentMap[booking.id] || [];

    if (payments.length) {
      return payments.map((payment) => ({
        id: payment.id,
        bookingId: booking.id,
        bookingCode: booking.bookingCode || booking.id,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider || 'Smart Parking',
        providerTransactionId: payment.providerTransactionId || payment.id,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      }));
    }

    return [{
      id: booking.id,
      bookingId: booking.id,
      bookingCode: booking.bookingCode || booking.id,
      paymentMethod: booking.paymentMethod,
      status: booking.paymentStatus,
      amount: booking.total?.amount ?? 0,
      currency: booking.total?.currency || 'VND',
      provider: 'Booking payment',
      providerTransactionId: booking.id,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }];
  });
}

export function CustomerPayments() {
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [paymentMap, setPaymentMap] = useState({});
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState('Loading');

  const profileName = profile?.fullName || account?.email || account?.phone || 'Customer';
  const initials = initialsFor(profileName);
  const rows = useMemo(() => buildRows(bookings, paymentMap), [bookings, paymentMap]);
  const selected = rows.find((row) => row.id === selectedId) || rows[0] || null;

  const totalSpent = rows
    .filter((row) => isPaidStatus(row.status) && monthMatches(row.createdAt || row.updatedAt))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const unpaidRows = rows.filter((row) => isUnpaidStatus(row.status));
  const unpaidTotal = unpaidRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  async function loadPayments() {
    setStatus('Loading');

    try {
      const currentAccount = await apiRequest('/auth/me');

      if (currentAccount.role !== 'CUSTOMER') {
        window.location.href = currentAccount.role === 'ADMIN' ? '/admin-users.html' : '/staff.html';
        return;
      }

      const [profileResponse, bookingPage] = await Promise.all([
        apiRequest('/customers/me'),
        apiPage('/customer/bookings', { size: 20 }),
      ]);

      const pairs = await Promise.all(bookingPage.items.map(async (booking) => {
        try {
          return [booking.id, await apiRequest(`/customer/bookings/${booking.id}/payments`)];
        } catch (error) {
          return [booking.id, []];
        }
      }));

      setAccount(currentAccount);
      setProfile(profileResponse);
      setBookings(bookingPage.items);
      setPaymentMap(Object.fromEntries(pairs));
      setSelectedId((current) => current || pairs.find(([, payments]) => payments.length)?.[1]?.[0]?.id || bookingPage.items[0]?.id || '');
      setStatus('Online');
    } catch (error) {
      setStatus(error.message);
      if (error.message.toLowerCase().includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        window.location.href = '/auth.html';
      }
    }
  }

  useEffect(() => {
    document.title = 'ParkFinder | Payments';
    document.body.className = 'customer-dashboard-page';
    document.body.dataset.page = 'customer-payments';
    loadPayments();
  }, []);

  return (
    <div className="customer-dashboard">
      <CustomerSidebar active="payments" initials={initials} name={profileName} />

      <main className="customer-main">
        <header className="customer-top-nav">
          <div className="customer-mobile-title">
            <strong>ParkFinder</strong>
            <span>Payments</span>
          </div>

        </header>

        <section className="customer-content customer-payment-content">
          <div className="payment-page-heading">
            <div>
              <h1>Payment History & Wallet</h1>
              <p>Manage your balances, view recent transactions, and handle invoices.</p>
            </div>
            <button type="button">Export Statement</button>
          </div>

          <section className="payment-summary-grid" aria-label="Payment summary">
            <article className="payment-summary-card wallet">
              <span>Current Balance</span>
              <strong>{formatMoney(0)}</strong>
              <p>Wallet API not connected yet</p>
            </article>
            <article className="payment-summary-card">
              <span>Total Spent (This Month)</span>
              <strong>{formatMoney(totalSpent)}</strong>
              <p>{rows.filter((row) => isPaidStatus(row.status)).length} completed payments</p>
            </article>
            <article className="payment-summary-card danger">
              <div>
                <span>Unpaid Invoices</span>
                <b>{unpaidRows.length}</b>
              </div>
              <strong>{formatMoney(unpaidTotal)}</strong>
              <button type="button">Pay Now</button>
            </article>
          </section>

          <div className="payment-layout-grid">
            <section className="payment-transaction-panel">
              <div className="payment-panel-head">
                <h2>Recent Transactions</h2>
                <button type="button" aria-label="Filter transactions">Filter</button>
              </div>

              <div className="payment-table-wrap">
                <table className="payment-table">
                  <thead>
                    <tr>
                      <th>Date & ID</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        className={row.id === selected?.id ? 'selected' : ''}
                        key={row.id}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td>
                          <strong>{formatDateTime(row.createdAt || row.updatedAt)}</strong>
                          <span>{row.bookingCode}</span>
                        </td>
                        <td>
                          <div className="payment-method-cell">
                            <b>{methodLabel(row)}</b>
                            <span>{row.provider || row.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="amount">{formatMoney(row.amount, row.currency)}</td>
                        <td><span className={`payment-status ${String(row.status).toLowerCase()}`}>{row.status}</span></td>
                      </tr>
                    ))}
                    {!rows.length && (
                      <tr>
                        <td colSpan="4"><div className="empty-state">No transactions yet.</div></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="payment-detail-panel">
              {selected ? (
                <>
                  <div className="payment-detail-head">
                    <span>Transaction Details</span>
                    <strong>{formatMoney(selected.amount, selected.currency)}</strong>
                    <p><b className={`payment-status ${String(selected.status).toLowerCase()}`}>{selected.status}</b> {formatDateTime(selected.createdAt)}</p>
                  </div>

                  <div className="payment-detail-body">
                    <dl>
                      <div><dt>Booking ID</dt><dd>{selected.bookingCode}</dd></div>
                      <div><dt>Provider</dt><dd>{selected.provider}</dd></div>
                      <div><dt>Method</dt><dd>{selected.paymentMethod}</dd></div>
                    </dl>

                    <section>
                      <h3>Payload Summary</h3>
                      <pre>{JSON.stringify({
                        payment_id: selected.id,
                        booking_id: selected.bookingId,
                        provider_transaction_id: selected.providerTransactionId,
                        status: selected.status,
                        amount: selected.amount,
                      }, null, 2)}</pre>
                    </section>
                  </div>

                  <div className="payment-detail-actions">
                    <button type="button">View Full Receipt</button>
                  </div>
                </>
              ) : (
                <div className="empty-state">Select a transaction to view details.</div>
              )}
            </aside>
          </div>
        </section>
      </main>

      <CustomerMobileNav active="payments" />
    </div>
  );
}
