import { PageShell } from '../../components/PageShell.jsx';
import { createStaffPage, icons, staffButton, staffHeadActions } from './staffLayout.js';

const dashboardContent = `
  <header class="staff-page-head">
    <div>
      <p data-account-role>Staff</p>
      <h1>Capacity Management</h1>
      <span>Monitor today capacity, bookings, revenue, and operational health.</span>
    </div>
    ${staffHeadActions(staffButton('Export Report', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.2l3.6-3.6L17 11l-5 5-5-5 1.4-1.4 3.6 3.6V3h2ZM5 19h14v2H5v-2Z" /></svg>'))}
  </header>

  <span class="status-line staff-status-line" id="staffStatus"></span>

  <section class="staff-capacity-hero" aria-label="Capacity overview">
    <div class="staff-capacity-metrics">
      <article><span>Available</span><strong class="tone-lavender" id="staffAvailable">0</strong></article>
      <article><span>Occupied</span><strong class="tone-peach" id="staffOccupied">0</strong></article>
      <article><span>Reserved</span><strong class="tone-ochre" id="staffReserved">0</strong></article>
      <article><span>Blocked</span><strong class="tone-pink" id="staffBlocked">0</strong></article>
    </div>
    <div class="staff-capacity-mark" aria-hidden="true">
      <svg viewBox="0 0 80 80">
        <path d="M40 6a34 34 0 1 0 0 68 34 34 0 0 0 0-68Zm-8 50V24h15c8 0 13 5 13 12.8 0 8-5 13.2-13 13.2h-7v6h-8Zm8-14h6.5c3.2 0 5.3-2 5.3-5.1 0-3-2.1-4.9-5.3-4.9H40v10Z" />
      </svg>
    </div>
  </section>

  <div class="staff-dashboard-grid">
    <section class="staff-panel">
      <div class="staff-section-title"><h2>Today's Performance</h2><span>Live from backend</span></div>
      <div class="staff-performance-grid">
        <article><div>${icons.bookings}<span>Bookings</span></div><strong id="staffTodayBookings">0</strong></article>
        <article><div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Zm2 2v8h12V8H6Zm6 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /></svg><span>Revenue</span></div><strong id="staffRevenue">0</strong></article>
      </div>
      <div class="staff-activity-chart" aria-label="Activity trend">
        <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
    </section>

    <section class="staff-panel" id="operations">
      <div class="staff-section-title"><h2>Operational Status</h2><span>Needs attention</span></div>
      <div class="staff-status-list">
        <article><div>${icons.bookings}<span>Pending</span></div><strong id="staffPending">0</strong></article>
        <article><div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.8 5.3 3.5 20.5 18.7 19.2 20l-2-2H4V6h2.2L4 4.8ZM8.2 8H6v8h9.2l-7-8ZM20 6v10.3L17.7 14H18V8h-6.3l-2-2H20Z" /></svg><span>Overdue</span></div><strong id="staffOverdue">0</strong></article>
        <article><div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2.8 4.2 1.4-1.4 17 17-1.4 1.4-2.4-2.4A10.8 10.8 0 0 1 12 20a11 11 0 0 1-9.7-5.8l1.8-1A9 9 0 0 0 12 18c1.4 0 2.8-.3 4-.9L2.8 4.2ZM12 4a11 11 0 0 1 9.7 5.8l-1.8 1A9 9 0 0 0 12 6c-1.3 0-2.5.3-3.6.7L6.8 5A10.8 10.8 0 0 1 12 4Z" /></svg><span>Offline</span></div><strong class="danger" id="staffOfflineDevices">0</strong></article>
      </div>
    </section>
  </div>

  <div class="staff-dashboard-grid lower">
    <section class="staff-panel" id="parking-lots">
      <div class="staff-section-title"><h2>Managed Parking Lots</h2><span id="staffManagedLots">0 lots</span></div>
      <div class="staff-data-list" id="staffLotList"></div>
    </section>

    <section class="staff-panel" id="bookings">
      <div class="staff-section-title"><h2>Booking Queue</h2><span id="staffOpenBookings">0 records</span></div>
      <div class="staff-data-list" id="staffBookingList"></div>
    </section>
  </div>
`;

const staffPage = createStaffPage({
  activeNav: 'dashboard',
  content: dashboardContent,
  pageKey: 'staff',
  title: 'ParkFinder Staff | Dashboard',
});

export function StaffPage(props) {
  return <PageShell {...props} page={staffPage} />;
}
