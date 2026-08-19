import { PageShell } from '../../components/PageShell.jsx';
import { createStaffPage, icons, staffButton } from './staffLayout.js';

const dashboardContent = `
  <header class="dashboard-hero staff-dashboard-hero">
    <div>
      <p data-account-role>Staff · SmartPark</p>
      <h1>Dashboard</h1>
      <span>Monitor capacity, bookings, revenue, and daily operations for your parking lot.</span>
    </div>
    <div class="dashboard-hero-actions">
      <span class="dashboard-live-pill" id="staffLiveTime">Syncing backend...</span>
      <a class="dashboard-secondary-button" href="/staff-bookings.html">
        <span class="material-symbols-outlined" aria-hidden="true">event_available</span>
        Booking Queue
      </a>
    </div>
  </header>

  <span class="status-line staff-status-line" id="staffStatus"></span>

  <section class="dashboard-kpi-grid staff-dashboard-kpis" aria-label="Capacity overview">
    <article class="dashboard-kpi-card k-lav">
      <span>Available</span>
      <strong id="staffAvailable">0</strong>
      <small>Slots ready now</small>
    </article>
    <article class="dashboard-kpi-card k-peach">
      <span>Occupied</span>
      <strong id="staffOccupied">0</strong>
      <small>Checked-in vehicles</small>
    </article>
    <article class="dashboard-kpi-card k-ochre">
      <span>Reserved</span>
      <strong id="staffReserved">0</strong>
      <small>Approved bookings</small>
    </article>
    <article class="dashboard-kpi-card k-pink">
      <span>Blocked</span>
      <strong id="staffBlocked">0</strong>
      <small>Unavailable slots</small>
    </article>
    <article class="dashboard-kpi-card dark staff-occupancy-card">
      <span>Occupancy Rate</span>
      <strong id="staffOccupancyRate">0%</strong>
      <small id="staffOccupancySub">0 of 0 slots active</small>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="46"></circle>
        <circle cx="60" cy="60" r="46" id="staffOccupancyRing"></circle>
      </svg>
    </article>
  </section>

  <div class="dashboard-grid two">
    <section class="dashboard-panel">
      <div class="dashboard-panel-head">
        <div>
          <p>Capacity</p>
          <h2>Capacity by Vehicle Type</h2>
        </div>
        <span id="staffTotalCapacity">0 slots</span>
      </div>
      <div class="staff-vehicle-capacity-list" id="staffCapacityRows"></div>
      <div class="dashboard-legend">
        <span><i class="available"></i>Available</span>
        <span><i class="occupied"></i>Checked-in</span>
        <span><i class="reserved"></i>Reserved</span>
        <span><i class="blocked"></i>Blocked</span>
      </div>
    </section>

    <section class="dashboard-panel">
      <div class="dashboard-panel-head">
        <div>
          <p>Today</p>
          <h2>Performance</h2>
        </div>
        <a href="/staff-bookings.html">View bookings</a>
      </div>
      <div class="dashboard-performance-cards">
        <article>
          <span>Bookings Today</span>
          <strong id="staffTodayBookings">0</strong>
        </article>
        <article>
          <span>Revenue Today</span>
          <strong id="staffRevenue">0</strong>
        </article>
      </div>
      <div class="dashboard-bar-chart" id="staffActivityChart" aria-label="Activity trend"></div>
    </section>
  </div>

  <div class="dashboard-grid two">
    <section class="dashboard-panel" id="operations">
      <div class="dashboard-panel-head">
        <div>
          <p>Operations</p>
          <h2>Operational Status</h2>
        </div>
        <span>Needs attention</span>
      </div>
      <div class="dashboard-ops-list" id="staffOpsList"></div>
    </section>

    <section class="dashboard-panel">
      <div class="dashboard-panel-head">
        <div>
          <p>Location</p>
          <h2>My Parking Lot</h2>
        </div>
        <span id="staffManagedLots">No lot yet</span>
      </div>
      <article class="staff-lot-dashboard-card">
        <div class="staff-lot-status-row">
          <span class="dashboard-status-pill" id="staffLotStatus">UNKNOWN</span>
          <a href="/staff-parking-lots.html" aria-label="Edit parking lot">
            <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </a>
        </div>
        <h3 id="staffLotName">No assigned parking lot</h3>
        <p id="staffLotAddress">Create or update your parking lot details.</p>
        <div class="staff-lot-dashboard-metrics">
          <span><strong id="staffLotLowestRate">0</strong><small>Lowest hourly price</small></span>
          <span><strong id="staffLotServices">0</strong><small>Services</small></span>
          <span><strong id="staffLotPromotions">0</strong><small>Promotions</small></span>
        </div>
      </article>
    </section>
  </div>

  <div class="dashboard-grid two">
    <section class="dashboard-panel" id="bookings">
      <div class="dashboard-panel-head">
        <div>
          <p>Bookings</p>
          <h2>Booking Queue</h2>
        </div>
        <span id="staffOpenBookings">0 records</span>
      </div>
      <div class="dashboard-tabs" id="staffBookingTabs">
        <button class="active" type="button" data-staff-dashboard-booking-filter="">All</button>
        <button type="button" data-staff-dashboard-booking-filter="PENDING_APPROVAL">Pending</button>
        <button type="button" data-staff-dashboard-booking-filter="CHECKED_IN">Checked in</button>
        <button type="button" data-staff-dashboard-booking-filter="OVERDUE">Overdue</button>
      </div>
      <div class="dashboard-data-list" id="staffBookingList"></div>
    </section>

    <section class="dashboard-panel">
      <div class="dashboard-panel-head">
        <div>
          <p>Schedule</p>
          <h2>Check-in Today</h2>
        </div>
        <a href="/staff-bookings.html">Open schedule</a>
      </div>
      <div class="staff-checkin-schedule" id="staffCheckinSchedule"></div>
    </section>
  </div>
`;

const staffPage = createStaffPage({
  activeNav: 'dashboard',
  content: dashboardContent,
  contentClass: 'staff-dashboard-content',
  pageClass: 'staff-dashboard-console',
  pageKey: 'staff',
  title: 'ParkFinder Staff | Dashboard',
});

export function StaffPage(props) {
  return <PageShell {...props} page={staffPage} />;
}
