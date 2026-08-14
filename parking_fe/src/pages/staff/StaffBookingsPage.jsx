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
  </header>

  <span class="status-line staff-status-line" id="staffBookingsStatus"></span>

  <nav class="staff-booking-tabs" aria-label="Booking queues">
    <button class="active" type="button" data-staff-booking-tab="">Active Bookings</button>
    <button type="button" data-staff-booking-tab="PENDING_APPROVAL">
      Pending Approvals
      <span id="staffPendingBookingCount">0</span>
    </button>
    <button type="button" data-staff-booking-tab="CHANGE_REQUESTS">Change Requests</button>
    <button type="button" data-staff-booking-tab="EXTENSION_REQUESTS">Extension Requests</button>
    <button type="button" data-staff-booking-tab="OVERDUE">Overdue</button>
  </nav>

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
            <th>Checked-in Hours</th>
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

  <section class="staff-checkout-modal hidden" id="staffCheckoutModal" aria-hidden="true">
    <div class="staff-checkout-modal-card" role="dialog" aria-modal="true" aria-labelledby="staffCheckoutTitle">
      <div class="staff-checkout-modal-head">
        <div>
          <span>Active booking</span>
          <h2 id="staffCheckoutTitle">Confirm Check Out</h2>
        </div>
        <button type="button" data-staff-checkout-close aria-label="Close checkout dialog">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" /></svg>
        </button>
      </div>

      <div class="staff-checkout-summary">
        <div>
          <span>Booking ID</span>
          <strong id="staffCheckoutBookingCode">-</strong>
        </div>
        <div>
          <span>Amount to pay</span>
          <strong id="staffCheckoutAmount">-</strong>
        </div>
        <div>
          <span>Overtime</span>
          <strong id="staffCheckoutOvertime">-</strong>
        </div>
        <div>
          <span>Overtime fee</span>
          <strong id="staffCheckoutOvertimeFee">-</strong>
        </div>
      </div>

      <label class="staff-checkout-notes">
        <span>Vehicle condition notes</span>
        <textarea id="staffCheckoutNotes" rows="3">Vehicle checked out by staff</textarea>
      </label>

      <div class="staff-checkout-modal-actions">
        <button type="button" data-staff-checkout-close>Cancel</button>
        <button type="button" id="staffCheckoutConfirmButton">Check Out</button>
      </div>
    </div>
  </section>
`;

const staffBookingsPage = createStaffPage({
  activeNav: 'bookings',
  content: bookingsContent,
  contentClass: 'staff-bookings-content',
  pageClass: 'staff-bookings-page',
  pageKey: 'staff-bookings',
  sideFooterAction: `<button class="staff-verify-button" type="button" id="staffVerifyQrButton">${scannerIcon} Verify QR</button>`,
  sideFooterHref: '/staff-bookings.html',
  sideFooterLabel: 'New Booking',
  title: 'ParkFinder Staff | Bookings',
});

export function StaffBookingsPage(props) {
  return <PageShell {...props} page={staffBookingsPage} />;
}
