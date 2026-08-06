import { useEffect, useMemo, useState } from 'react';
import {
  apiPage,
  apiRequest,
} from '../../services/api.js';
import { CustomerMobileNav, CustomerSidebar, initialsFor } from './CustomerChrome.jsx';

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

function isActiveBooking(booking) {
  return ['PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'OVERDUE'].includes(booking.status);
}

function supportNotifications(bookings) {
  const active = bookings.find(isActiveBooking);
  const pendingPayment = bookings.find((booking) => ['UNPAID', 'PENDING', 'FAILED'].includes(booking.paymentStatus));
  const recent = bookings[0];

  return [
    active && {
      tone: 'primary',
      title: 'Booking Active',
      time: formatDateTime(active.updatedAt || active.createdAt),
      body: `${active.bookingCode || active.id} is currently ${active.status}.`,
    },
    pendingPayment && {
      tone: 'error',
      title: 'Payment Attention',
      time: formatDateTime(pendingPayment.updatedAt || pendingPayment.createdAt),
      body: `${pendingPayment.bookingCode || pendingPayment.id} payment is ${pendingPayment.paymentStatus}.`,
    },
    recent && {
      tone: 'muted',
      title: 'Recent Booking Update',
      time: formatDateTime(recent.updatedAt || recent.createdAt),
      body: `${recent.bookingCode || recent.id} was updated recently.`,
    },
  ].filter(Boolean);
}

function supportRequests(bookings) {
  return bookings.slice(0, 2).map((booking, index) => ({
    id: `REQ-${String(index + 91).padStart(3, '0')}`,
    subject: index === 0 ? 'Refund Request' : 'Booking Assistance',
    status: index === 0 ? 'In Progress' : 'Resolved',
    bookingCode: booking.bookingCode || booking.id,
    opened: formatDateTime(booking.createdAt),
  }));
}

function reviewCards(bookings, lots) {
  return bookings.slice(0, 2).map((booking, index) => {
    const lot = lots.find((candidate) => candidate.id === booking.parkingLotId);
    return {
      id: booking.id,
      lotName: lot?.name || `Booking ${booking.bookingCode || booking.id}`,
      date: formatDateTime(booking.endTime || booking.updatedAt),
      rating: index === 0 ? 4 : 5,
      text: booking.status === 'CHECKED_OUT'
        ? 'Completed session. Review details can be synced when the review API is available.'
        : 'This booking will be ready for review after checkout.',
    };
  });
}

export function CustomerSupport() {
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [lots, setLots] = useState([]);
  const [status, setStatus] = useState('Loading');
  const [form, setForm] = useState({
    subject: 'Billing Issue',
    bookingId: '',
    description: '',
  });

  const profileName = profile?.fullName || account?.email || account?.phone || 'Customer';
  const initials = initialsFor(profileName);
  const notifications = useMemo(() => supportNotifications(bookings), [bookings]);
  const requests = useMemo(() => supportRequests(bookings), [bookings]);
  const reviews = useMemo(() => reviewCards(bookings, lots), [bookings, lots]);

  async function loadSupport() {
    setStatus('Loading');

    try {
      const currentAccount = await apiRequest('/auth/me');

      if (currentAccount.role !== 'CUSTOMER') {
        window.location.href = currentAccount.role === 'ADMIN' ? '/admin-users.html' : '/staff.html';
        return;
      }

      const [profileResponse, bookingPage, lotPage] = await Promise.all([
        apiRequest('/customers/me'),
        apiPage('/customer/bookings', { size: 12 }),
        apiPage('/public/parking-lots', { size: 12 }),
      ]);

      setAccount(currentAccount);
      setProfile(profileResponse);
      setBookings(bookingPage.items);
      setLots(lotPage.items);
      setStatus('Online');
    } catch (error) {
      setStatus(error.message);
      if (error.message.toLowerCase().includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        window.location.href = '/auth.html';
      }
    }
  }

  useEffect(() => {
    document.title = 'ParkFinder | Support';
    document.body.className = 'customer-dashboard-page';
    document.body.dataset.page = 'customer-support';
    loadSupport();
  }, []);

  function submitSupport(event) {
    event.preventDefault();
    setStatus('Support request ready. Backend API for complaints can be connected next.');
  }

  return (
    <div className="customer-dashboard">
      <CustomerSidebar active="support" initials={initials} name={profileName} />

      <main className="customer-main">
        <header className="customer-top-nav">
          <div className="customer-mobile-title">
            <strong>ParkFinder</strong>
            <span>Support</span>
          </div>

        </header>

        <section className="customer-content customer-support-content">
          <div className="customer-welcome">
            <div>
              <h1>Support & Activity</h1>
              <p>Manage your requests, review your experiences, and stay updated.</p>
            </div>
            <span className={`customer-status ${status === 'Online' ? 'online' : ''}`}>{status}</span>
          </div>

          <div className="customer-support-grid">
            <aside className="support-notifications-panel">
              <div className="section-title">
                <h2>Notifications</h2>
                <button type="button">Mark all read</button>
              </div>

              <div className="support-notification-list">
                {notifications.map((notification) => (
                  <article className={notification.tone} key={`${notification.title}-${notification.time}`}>
                    <div>
                      <strong>{notification.title}</strong>
                      <small>{notification.time}</small>
                    </div>
                    <p>{notification.body}</p>
                  </article>
                ))}
                {!notifications.length && <div className="empty-state">No notifications yet.</div>}
              </div>
            </aside>

            <div className="support-main-column">
              <section className="support-hub-panel">
                <div className="section-title">
                  <h2>Support Hub</h2>
                </div>

                <div className="support-hub-grid">
                  <form className="support-request-form" onSubmit={submitSupport}>
                    <h3>Submit Request</h3>
                    <label>
                      <span>Subject</span>
                      <select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}>
                        <option>Billing Issue</option>
                        <option>Space Occupied</option>
                        <option>App Feedback</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <label>
                      <span>Booking ID (Optional)</span>
                      <select value={form.bookingId} onChange={(event) => setForm({ ...form, bookingId: event.target.value })}>
                        <option value="">None</option>
                        {bookings.map((booking) => (
                          <option key={booking.id} value={booking.id}>{booking.bookingCode || booking.id}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Description</span>
                      <textarea
                        value={form.description}
                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                        placeholder="Describe your issue..."
                        rows="4"
                      />
                    </label>
                    <button className="primary-button" type="submit">Submit</button>
                  </form>

                  <section className="support-request-list">
                    <h3>Active Requests</h3>
                    {requests.map((request) => (
                      <article className={request.status === 'Resolved' ? 'resolved' : ''} key={request.id}>
                        <div>
                          <strong>{request.subject}</strong>
                          <span>{request.status}</span>
                        </div>
                        <p>ID: #{request.id} - Booking {request.bookingCode}</p>
                        <button type="button">View details</button>
                      </article>
                    ))}
                    {!requests.length && <div className="empty-state">No support requests yet.</div>}
                  </section>
                </div>
              </section>

              <section className="support-reviews-panel">
                <div className="section-title">
                  <h2>My Reviews</h2>
                </div>
                <div className="support-review-grid">
                  {reviews.map((review) => (
                    <article key={review.id}>
                      <div>
                        <h3>{review.lotName}</h3>
                        <span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                      </div>
                      <small>{review.date}</small>
                      <p>{review.text}</p>
                    </article>
                  ))}
                  {!reviews.length && <div className="empty-state">No reviews yet.</div>}
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>

      <CustomerMobileNav active="support" />
    </div>
  );
}
