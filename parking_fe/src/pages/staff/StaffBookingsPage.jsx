import { PageShell } from '../../components/PageShell.jsx';
import { createStaffPage } from './staffLayout.js';

const scannerIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM6 14v4h4v2H4v-6h2Zm12 4v-4h2v6h-6v-2h4ZM8 8h2v2H8V8Zm6 0h2v2h-2V8Zm-6 6h2v2H8v-2Zm6 0h2v2h-2v-2Zm-3-3h2v2h-2v-2Z" /></svg>';

const bookingsContent = `
  <header class="staff-bookings-head">
    <div>
      <p data-account-role>Staff</p>
      <h1 id="staffBookingsTitle">Booking Management</h1>
      <span id="staffBookingsSubtitle">Track active reservations, approvals, and customer request queues.</span>
    </div>
    <div class="staff-head-actions" id="account">
      <button class="staff-verify-button" type="button" id="staffVerifyQrButton">${scannerIcon} Verify QR</button>
      <button class="staff-avatar" type="button" data-account-avatar>ST</button>
      <button class="staff-logout" type="button" data-action="logout">Logout</button>
    </div>
  </header>

  <span class="status-line staff-status-line" id="staffBookingsStatus"></span>

  <nav class="staff-booking-tabs" aria-label="Booking queues">
    <button class="active" type="button" data-staff-booking-tab="">All Bookings</button>
    <button type="button" data-staff-booking-tab="PENDING_APPROVAL">
      Pending Approvals
      <span id="staffPendingBookingCount">0</span>
    </button>
    <button type="button" data-staff-booking-tab="CHANGE_REQUESTS">Change Requests</button>
    <button type="button" data-staff-booking-tab="EXTENSION_REQUESTS">Extension Requests</button>
    <button type="button" data-staff-booking-tab="OVERDUE">Overdue</button>
  </nav>

  <section class="staff-booking-filters" id="staffBookingFilters">
    <label class="staff-booking-search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 20.1-4.7-4.7a7.5 7.5 0 1 0-1.1 1.1l4.7 4.7 1.1-1.1ZM4.5 10.5a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" /></svg>
      <input id="staffBookingSearch" type="search" placeholder="Booking Code or Plate Number" />
    </label>

    <label class="staff-booking-select">
      <select id="staffBookingLotFilter" aria-label="Filter bookings by parking lot">
        <option value="">All Parking Lots</option>
      </select>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5H7Z" /></svg>
    </label>

    <label class="staff-booking-date">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Z" /></svg>
      <input id="staffBookingDateFilter" type="date" />
    </label>

    <div class="staff-booking-status-chips" role="group" aria-label="Status filter">
      <span>Status:</span>
      <button class="active" type="button" data-staff-booking-status="">All</button>
      <button type="button" data-staff-booking-status="active">Active</button>
      <button type="button" data-staff-booking-status="completed">Completed</button>
    </div>
  </section>

  <section class="staff-booking-table-card" id="staffBookingTableCard">
    <div class="staff-booking-table-scroll">
      <table class="staff-booking-table" id="staffBookingTableRoot">
        <thead id="staffBookingTableHead">
          <tr>
            <th>Booking ID</th>
            <th>Plate / Vehicle</th>
            <th>Status</th>
            <th>Arrival</th>
            <th>Departure</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="staffBookingTable"></tbody>
      </table>
    </div>

    <footer class="staff-booking-pagination" id="staffBookingPaginationFooter">
      <span id="staffBookingPagination">Showing bookings</span>
      <div>
        <button type="button" disabled aria-label="Previous page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6 1.4-1.4-4.6-4.6 4.6-4.6L15 6Z" /></svg></button>
        <button class="active" type="button">1</button>
        <button type="button">2</button>
        <button type="button">3</button>
        <span>...</span>
        <button type="button" aria-label="Next page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6-1.4 1.4 4.6 4.6-4.6 4.6L9 18Z" /></svg></button>
      </div>
    </footer>
  </section>

  <section class="staff-change-requests-panel is-hidden" id="staffChangeRequestsPanel">
    <div class="staff-change-request-list" id="staffChangeRequestList"></div>
  </section>

  <section class="staff-extension-requests-panel is-hidden" id="staffExtensionRequestsPanel">
    <div class="staff-extension-request-summary">
      <span>
        <i></i>
        <strong id="staffExtensionPendingCount">0</strong>
        Pending
      </span>
    </div>
    <div class="staff-extension-request-grid" id="staffExtensionRequestList"></div>
  </section>

  <section class="staff-overdue-panel is-hidden" id="staffOverduePanel">
    <div class="staff-overdue-actions">
      <button class="staff-overdue-filter" type="button" id="staffOverdueFilterButton">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v2H4V7Zm3 4h10v2H7v-2Zm3 4h4v2h-4v-2Z" /></svg>
        Filter
      </button>
      <button class="staff-overdue-refresh" type="button" id="staffOverdueRefreshButton">Refresh List</button>
    </div>
    <div class="staff-overdue-grid" id="staffOverdueList"></div>
  </section>
`;

const staffBookingsPage = createStaffPage({
  activeNav: 'bookings',
  content: bookingsContent,
  contentClass: 'staff-bookings-content',
  pageClass: 'staff-bookings-page',
  pageKey: 'staff-bookings',
  sideFooterHref: '/staff-bookings.html',
  sideFooterLabel: 'New Booking',
  title: 'ParkFinder Staff | Bookings',
});

export function StaffBookingsPage(props) {
  return <PageShell {...props} page={staffBookingsPage} />;
}
