import { AdminScreen } from './AdminScreen.jsx';

const icons = {
  audit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6V3Zm2 2v14h8V5H8Zm2 3h4v2h-4V8Zm0 4h4v2h-4v-2Z" /></svg>',
  bookings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z" /></svg>',
  dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z" /></svg>',
  lots: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.3-3.3 1.4-1.4 1.9 1.9 4.6-4.6 1.4 1.4-6 6Z" /></svg>',
  money: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Zm2 2v8h12V8H6Zm6 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /></svg>',
  requests: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5V3Zm9 2v4h4l-4-4ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Zm0-8h4v2H8V7Z" /></svg>',
  staff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm6 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM9 13c-3.9 0-7 1.9-7 4.2V20h14v-2.8C16 14.9 12.9 13 9 13Zm6.3 1c1.7.8 2.7 1.9 2.7 3.2V20h4v-2.4c0-1.9-2.7-3.4-6.7-3.6Z" /></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.1-8 5v1h16v-1c0-2.9-3.6-5-8-5Z" /></svg>',
};

const adminPage = {
  "title": "ParkFinder Admin",
  "bodyClass": "",
  "pageKey": "admin",
  "markup": `
    <div class="admin-console admin-dashboard-shell">
      <aside class="admin-side-nav">
        <a class="admin-brand" href="/" aria-label="ParkFinder">
          <span class="admin-brand-mark" aria-hidden="true"></span>
          <span>
            <strong>ParkFinder</strong>
            <small>Admin Hub</small>
          </span>
        </a>

        <nav class="admin-nav-links" aria-label="Admin navigation">
          <a class="active" href="/admin.html">${icons.dashboard}Dashboard</a>
          <a href="/admin-users.html">${icons.users}Customers</a>
          <a href="/admin-staff.html">${icons.staff}Staff</a>
          <a href="/admin-requests.html">${icons.requests}Requests</a>
          <a href="/admin-bookings.html">${icons.bookings}Bookings</a>
          <a href="/admin-finance.html">${icons.money}Finance</a>
          <a href="/admin-audit.html">${icons.audit}Audit Logs</a>
        </nav>

        <div class="admin-side-footer">
          <a class="admin-icon-button" href="/admin-staff.html">
            <span class="material-symbols-outlined" aria-hidden="true">person_add</span>
            Add Staff
          </a>
          <button class="admin-logout-button" type="button" data-action="logout">
            <span class="material-symbols-outlined" aria-hidden="true">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <main class="admin-main-shell">
        <section class="admin-content admin-dashboard-content">
          <header class="dashboard-hero">
            <div>
              <p data-account-role>Admin · SmartPark</p>
              <h1>Dashboard</h1>
              <span>Monitor accounts, parking lots, booking exceptions, commission, and audit activity across the system.</span>
            </div>
            <div class="dashboard-hero-actions">
              <span class="dashboard-live-pill" id="adminLiveTime">Syncing backend...</span>
              <a class="dashboard-secondary-button" href="/admin-audit.html">
                <span class="material-symbols-outlined" aria-hidden="true">history</span>
                Audit Logs
              </a>
            </div>
          </header>

          <span class="status-line admin-status-line" id="adminStatus"></span>

          <section class="dashboard-kpi-grid admin-dashboard-kpis" aria-label="System summary">
            <article class="dashboard-kpi-card k-blue">
              <span>Total Users</span>
              <strong id="adminDashTotalUsers">0</strong>
              <small>All roles in system</small>
            </article>
            <article class="dashboard-kpi-card k-indigo">
              <span>Active Staff</span>
              <strong id="adminDashActiveStaff">0</strong>
              <small>Parking operators</small>
            </article>
            <article class="dashboard-kpi-card k-teal">
              <span>Active Parking Lots</span>
              <strong id="adminDashActiveLots">0</strong>
              <small>Lots visible to customers</small>
            </article>
            <article class="dashboard-kpi-card k-ochre">
              <span>Pending Approvals</span>
              <strong id="adminDashPending">0</strong>
              <small id="adminDashPendingSub">Staff 0 · Lots 0</small>
            </article>
            <article class="dashboard-kpi-card k-lav">
              <span>Bookings Today</span>
              <strong id="adminDashTodayBookings">0</strong>
              <small>Created or operating today</small>
            </article>
            <article class="dashboard-kpi-card k-green">
              <span>Revenue Today</span>
              <strong id="adminDashRevenue">0</strong>
              <small>Completed payment value</small>
            </article>
          </section>

          <div class="dashboard-grid admin-performance-grid">
            <section class="dashboard-panel">
              <div class="dashboard-panel-head">
                <div>
                  <p id="adminPerformanceRangeLabel">Today</p>
                  <h2>Platform Performance</h2>
                </div>
                <div class="staff-performance-filters admin-performance-filters">
                  <div class="dashboard-tabs compact" id="adminPerformanceMetricTabs" aria-label="Platform performance metric">
                    <button class="active" type="button" data-admin-performance-metric="bookings">Bookings</button>
                    <button type="button" data-admin-performance-metric="revenue">Revenue</button>
                  </div>
                  <div class="dashboard-tabs compact" id="adminPerformanceRangeTabs" aria-label="Platform performance range">
                    <button class="active" type="button" data-admin-performance-range="today">Today</button>
                    <button type="button" data-admin-performance-range="7">7 days</button>
                    <button type="button" data-admin-performance-range="30">30 days</button>
                  </div>
                  <a href="/admin-bookings.html">View bookings</a>
                </div>
              </div>
              <div class="dashboard-performance-cards">
                <article>
                  <span>Bookings</span>
                  <strong id="adminPerfBookings">0</strong>
                </article>
                <article>
                  <span>Revenue</span>
                  <strong id="adminPerfRevenue">0</strong>
                </article>
              </div>
              <div class="dashboard-bar-chart" id="adminPerformanceChart" aria-label="Booking activity chart"></div>
            </section>
          </div>

          <div class="dashboard-grid two">
            <section class="dashboard-panel">
              <div class="dashboard-panel-head">
                <div>
                  <p>Staff</p>
                  <h2>Pending Staff Queue</h2>
                </div>
                <a href="/admin-staff.html">Manage staff</a>
              </div>
              <div class="dashboard-data-list" id="adminStaffQueue"></div>
            </section>

            <section class="dashboard-panel">
              <div class="dashboard-panel-head">
                <div>
                  <p>Parking Lots</p>
                  <h2>Change Requests</h2>
                </div>
                <a href="/admin-requests.html">Review requests</a>
              </div>
              <div class="dashboard-data-list" id="adminLotQueue"></div>
            </section>
          </div>

          <div class="dashboard-grid two">
            <section class="dashboard-panel">
              <div class="dashboard-panel-head">
                <div>
                  <p>Bookings</p>
                  <h2>Exceptions</h2>
                </div>
                <a href="/admin-bookings.html">Resolve</a>
              </div>
              <div class="dashboard-data-list" id="adminExceptionQueue"></div>
            </section>

            <section class="dashboard-panel">
              <div class="dashboard-panel-head">
                <div>
                  <p>Audit</p>
                  <h2>Recent Activity</h2>
                </div>
                <a href="/admin-audit.html">Full log</a>
              </div>
              <div class="dashboard-data-list audit" id="adminRecentAudit"></div>
            </section>
          </div>
        </section>
      </main>
    </div>
  `
};

export function AdminDashboard() {
  return <AdminScreen page={adminPage} />;
}
