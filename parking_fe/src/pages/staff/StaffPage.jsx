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
        <span><i class="pending"></i>Pending approvals</span>
      </div>
    </section>

    <section class="dashboard-panel">
      <div class="dashboard-panel-head">
        <div>
          <p>Today</p>
          <h2>Performance</h2>
        </div>
        <div class="staff-performance-filters">
          <div class="dashboard-tabs compact" id="staffPerformanceMetricTabs" aria-label="Performance metric">
            <button class="active" type="button" data-staff-performance-metric="bookings">Bookings</button>
            <button type="button" data-staff-performance-metric="revenue">Revenue</button>
          </div>
          <div class="dashboard-tabs compact" id="staffPerformanceRangeTabs" aria-label="Performance range">
            <button class="active" type="button" data-staff-performance-range="today">Today</button>
            <button type="button" data-staff-performance-range="7">7 days</button>
            <button type="button" data-staff-performance-range="30">30 days</button>
          </div>
          <a href="/staff-bookings.html">View bookings</a>
        </div>
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

    <section class="dashboard-panel staff-review-panel">
      <div class="dashboard-panel-head">
        <div>
          <p>Reviews</p>
          <h2>Customer Reviews</h2>
        </div>
        <span id="staffReviewSummary">No reviews yet</span>
      </div>
      <article class="staff-review-score-card">
        <div>
          <strong id="staffReviewAverage">0.0</strong>
          <span id="staffReviewStars" aria-label="Average rating">★★★★★</span>
        </div>
        <small id="staffReviewCount">0 completed booking reviews</small>
      </article>
      <div class="staff-review-list" id="staffReviewList"></div>
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
