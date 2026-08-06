import { useEffect, useMemo, useState } from 'react';
import {
  apiPage,
  apiRequest,
} from '../../services/api.js';
import { CustomerMobileNav, CustomerSidebar, initialsFor } from './CustomerChrome.jsx';

const emptyProfile = {
  fullName: '',
  email: '',
  phone: '',
};

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

function profileLabel(profile, account) {
  return profile.fullName || account?.email || account?.phone || 'Customer';
}

function isActiveBooking(booking) {
  return ['PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'OVERDUE'].includes(booking.status);
}

function isPendingPayment(booking) {
  return ['UNPAID', 'PENDING', 'FAILED'].includes(booking.paymentStatus);
}

export function CustomerDashboard() {
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [lots, setLots] = useState([]);
  const [status, setStatus] = useState('Loading');
  const [loading, setLoading] = useState(true);

  const activeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status !== 'INACTIVE'),
    [vehicles],
  );

  const activeBookings = useMemo(
    () => bookings.filter(isActiveBooking),
    [bookings],
  );

  const currentBooking = useMemo(() => {
    return activeBookings
      .slice()
      .sort((left, right) => new Date(left.startTime) - new Date(right.startTime))[0] || null;
  }, [activeBookings]);

  const currentVehicle = useMemo(() => {
    return vehicles.find((vehicle) => vehicle.id === currentBooking?.vehicleId) || null;
  }, [currentBooking, vehicles]);

  const currentLot = useMemo(() => {
    return lots.find((lot) => lot.id === currentBooking?.parkingLotId) || null;
  }, [currentBooking, lots]);

  const pendingPaymentBookings = useMemo(() => bookings.filter(isPendingPayment), [bookings]);
  const pendingPaymentTotal = pendingPaymentBookings.reduce((sum, booking) => {
    return sum + Number(booking.total?.amount ?? 0);
  }, 0);

  async function loadDashboard() {
    setLoading(true);
    setStatus('Loading');

    try {
      const currentAccount = await apiRequest('/auth/me');

      if (currentAccount.role !== 'CUSTOMER') {
        window.location.href = currentAccount.role === 'ADMIN' ? '/admin-users.html' : '/staff.html';
        return;
      }

      const [profileResponse, vehicleResponse, bookingPage, lotPage] = await Promise.all([
        apiRequest('/customers/me'),
        apiRequest('/customer/vehicles'),
        apiPage('/customer/bookings', { size: 12 }),
        apiPage('/public/parking-lots', { size: 12 }),
      ]);

      setAccount(currentAccount);
      setProfile(profileResponse);
      setVehicles(vehicleResponse);
      setBookings(bookingPage.items);
      setLots(lotPage.items);
      setStatus('Online');
    } catch (error) {
      setStatus(error.message);
      if (error.message.toLowerCase().includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        window.location.href = '/auth.html';
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'ParkFinder | Customer Dashboard';
    document.body.className = 'customer-dashboard-page';
    document.body.dataset.page = 'customer';
    loadDashboard();
  }, []);

  const name = profileLabel(profile, account);
  const initials = initialsFor(name);
  const displayVehicle = currentVehicle
    ? `${currentVehicle.brand || currentVehicle.vehicleType} ${currentVehicle.plateNumber}`
    : 'No vehicle selected';

  return (
    <div className="customer-dashboard">
      <CustomerSidebar active="dashboard" initials={initials} name={name} />

      <main className="customer-main">
        <header className="customer-top-nav">
          <div className="customer-mobile-title">
            <strong>ParkFinder</strong>
            <span>Premium Parking</span>
          </div>

        </header>

        <section className="customer-content" id="dashboard">
          <div className="customer-welcome">
            <div>
              <h1>Welcome back, {name}</h1>
              <p>{loading ? 'Syncing your parking data...' : 'Here is your parking overview for today.'}</p>
            </div>
            <span className={`customer-status ${status === 'Online' ? 'online' : ''}`}>{status}</span>
          </div>

          <section className="customer-stat-grid" aria-label="Customer dashboard stats">
            <article className="customer-profile-card">
              <span className="customer-profile-avatar">{initials}</span>
              <div>
                <h2>{name}</h2>
                <p>{profile.email || profile.phone || 'Premium Member'}</p>
              </div>
            </article>

            <article className="customer-stat-card">
              <span>Registered Vehicles</span>
              <strong>{activeVehicles.length}</strong>
              <p>active</p>
            </article>

            <article className="customer-stat-card accent">
              <span>Active Bookings</span>
              <strong>{activeBookings.length}</strong>
              <p>{currentBooking ? currentBooking.status : 'No active session'}</p>
            </article>

            <article className="customer-stat-card">
              <span>Pending Payments</span>
              <strong>{pendingPaymentBookings.length}</strong>
              <p>Total: {formatMoney(pendingPaymentTotal)}</p>
            </article>
          </section>

          <div className="customer-dashboard-grid">
            <section className="customer-current-session">
              <div className="section-title">
                <h2>Current Session</h2>
              </div>

              <div className="customer-map-strip">
                <img src="/assets/home-map.svg" alt="" />
                <span>{currentLot?.address || 'Find a parking lot to start a session'}</span>
              </div>

              {currentBooking ? (
                <div className="customer-session-body">
                  <div>
                    <div className="customer-session-meta">
                      <span className="customer-badge">{currentBooking.status}</span>
                      <span>{formatDateTime(currentBooking.startTime)} - {formatDateTime(currentBooking.endTime)}</span>
                    </div>
                    <h3>{currentLot?.name || currentBooking.parkingLotId}</h3>
                    <p>{currentLot?.address || 'Parking lot details from booking'}</p>
                  </div>

                  <div className="customer-session-vehicle">
                    <strong>{displayVehicle}</strong>
                    <span>{currentVehicle?.vehicleType || 'Vehicle'}</span>
                  </div>

                  <div className="customer-session-actions">
                    <a className="primary-button" href="/customer-support.html">Get Help</a>
                    <a className="ghost-button" href={currentLot ? `/parking-detail.html?id=${currentLot.id}` : '/'}>Get Directions</a>
                  </div>
                </div>
              ) : (
                <div className="customer-empty-action">
                  <h3>No active session</h3>
                  <p>Start from the home map, choose a parking lot, then confirm your booking.</p>
                  <a className="primary-button" href="/">Find Parking</a>
                </div>
              )}

              <section className="customer-quick-actions" aria-label="Quick actions">
                <a href="/">Find Parking</a>
                <a href="/customer-vehicles.html">Add Vehicle</a>
                <a href="/customer-support.html">Contact Support</a>
              </section>
            </section>

            <aside className="customer-activity-panel">
              <div className="section-title">
                <h2>Recent Activity</h2>
              </div>

              <div className="customer-activity-list">
                {bookings.slice(0, 2).map((booking) => (
                  <article key={booking.id}>
                    <span>{booking.status?.slice(0, 1) || 'B'}</span>
                    <div>
                      <strong>{booking.bookingCode || booking.id}</strong>
                      <p>{booking.status} - {booking.paymentStatus}</p>
                    </div>
                    <small>{formatDateTime(booking.updatedAt || booking.createdAt)}</small>
                  </article>
                ))}

                {vehicles.slice(0, 2).map((vehicle) => (
                  <article key={vehicle.id}>
                    <span>V</span>
                    <div>
                      <strong>Vehicle Added</strong>
                      <p>{vehicle.plateNumber} - {vehicle.vehicleType}</p>
                    </div>
                    <small>{formatDateTime(vehicle.createdAt)}</small>
                  </article>
                ))}

                {!bookings.length && !vehicles.length && (
                  <div className="empty-state">No activity yet.</div>
                )}
              </div>
            </aside>
          </div>
        </section>
      </main>

      <CustomerMobileNav active="dashboard" />
    </div>
  );
}
