import { AdminScreen } from './AdminScreen.jsx';

const adminBookingsPage = {
  title: 'ParkFinder Admin | Bookings',
  bodyClass: '',
  pageKey: 'admin-bookings',
  markup: `
    <div class="admin-console">
      <aside class="admin-side-nav"></aside>
      <div class="admin-main-shell">
        <main class="admin-content">
          <section class="admin-page-heading">
            <div>
              <p data-account-role>Admin</p>
              <h1>Bookings</h1>
              <span>Monitor system bookings and resolve stuck exceptions.</span>
            </div>
          </section>

          <span class="status-line admin-status-line" id="adminStatus"></span>

          <section class="admin-booking-table-card">
            <div class="admin-booking-toolbar admin-booking-toolbar-clean">
              <div class="admin-booking-search">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10.5 4a6.5 6.5 0 0 1 5.1 10.5l4 4-1.4 1.4-4-4A6.5 6.5 0 1 1 10.5 4Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
                </svg>
                <input id="adminBookingSearch" type="search" placeholder="Search booking code or plate number" />
              </div>

              <div class="admin-booking-filter-group">
                <div class="dashboard-tabs compact admin-booking-date-tabs" aria-label="Booking date range">
                  <button class="active" type="button" data-admin-booking-range="today">Today</button>
                  <button type="button" data-admin-booking-range="7">7 days</button>
                  <button type="button" data-admin-booking-range="30">30 days</button>
                </div>
                <select id="adminBookingStatusFilter" aria-label="Booking status">
                  <option value="">All Status</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="CHECKED_IN">Checked In</option>
                  <option value="PENDING_PAYMENT">Pending Payment</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <button class="admin-booking-refresh" type="button" data-admin-refresh-bookings aria-label="Refresh bookings">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.2L13 11h8V3l-3.3 3.3Z" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="admin-booking-summary-strip">
              <span>Total <strong id="adminBookingTotal">0</strong></span>
              <span>Active <strong id="adminBookingActive">0</strong></span>
              <span>Revenue <strong id="adminBookingRevenue">0</strong></span>
            </div>

            <div class="admin-booking-table-scroll">
              <table class="admin-booking-table admin-booking-table-clean">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Parking Lot</th>
                    <th>Check in / out</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="adminBookingList"></tbody>
              </table>
            </div>

            <div class="admin-booking-pagination">
              <span id="adminBookingPagination">Showing bookings</span>
            </div>
          </section>

          <section class="admin-booking-detail-modal hidden" id="adminBookingDetailModal" aria-hidden="true">
            <div class="admin-booking-detail-card" role="dialog" aria-modal="true" aria-labelledby="adminBookingDetailTitle">
              <div class="admin-booking-detail-head">
                <div>
                  <p>Booking Detail</p>
                  <h2 id="adminBookingDetailTitle">Booking</h2>
                  <span id="adminBookingDetailMeta">-</span>
                </div>
                <button type="button" data-admin-close-booking-detail aria-label="Close booking detail">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z" />
                  </svg>
                </button>
              </div>

              <div class="admin-booking-detail-grid">
                <article><span>Customer</span><strong id="adminBookingDetailCustomer">-</strong><small id="adminBookingDetailCustomerMeta">-</small></article>
                <article><span>Vehicle</span><strong id="adminBookingDetailVehicle">-</strong><small id="adminBookingDetailVehicleMeta">-</small></article>
                <article><span>Parking Lot</span><strong id="adminBookingDetailLot">-</strong><small id="adminBookingDetailLotMeta">-</small></article>
                <article><span>Total</span><strong id="adminBookingDetailTotal">-</strong><small id="adminBookingDetailPayment">-</small></article>
              </div>

              <div class="admin-booking-detail-timeline admin-booking-detail-session">
                <div><span>Check in</span><strong id="adminBookingDetailCheckIn">-</strong></div>
                <div><span>Check out</span><strong id="adminBookingDetailCheckOut">-</strong></div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  `,
};

export function AdminBookings() {
  return <AdminScreen page={adminBookingsPage} />;
}
