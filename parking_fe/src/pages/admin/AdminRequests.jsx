import { AdminScreen } from './AdminScreen.jsx';

const requestIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5V3Zm9 2v4h4l-4-4ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Zm0-8h4v2H8V7Z" /></svg>';

const adminRequestsPage = {
  title: 'ParkFinder Admin | Requests',
  bodyClass: 'page-admin',
  pageKey: 'admin-requests',
  markup: `
    <div class="admin-console">
      <aside class="admin-side-nav">
        <a class="admin-brand" href="/" aria-label="ParkFinder">
          <span class="admin-brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 20V4h7.1c3.4 0 5.9 2.3 5.9 5.6s-2.5 5.7-5.9 5.7h-3.7V20H7Zm3.4-7.8h3.4c1.6 0 2.8-1 2.8-2.6S15.4 7 13.8 7h-3.4v5.2Z" /></svg></span>
          <span><strong>ParkFinder</strong><small>Admin Console</small></span>
        </a>

        <nav class="admin-nav-links" aria-label="Admin navigation">
          <a href="/admin-users.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.1-8 5v1h13.2a5.7 5.7 0 0 1-.2-1.5c0-1.5.6-2.9 1.5-3.9A13.6 13.6 0 0 0 10 14Zm9.5.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0 1.5 2 2-.9.9-1.1-1.1-1.7 1.7-.9-.9 2.6-2.6Z" /></svg>Customers</a>
          <a href="/admin-staff.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8.5 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM8 13c-3.3 0-6 1.7-6 3.8V20h12v-3.2C14 14.7 11.3 13 8 13Zm8.5 1c-.9 0-1.8.2-2.6.5a4 4 0 0 1 2.1 3.4V20h6v-2.6c0-1.9-2.5-3.4-5.5-3.4Z" /></svg>Staff</a>
          <a class="active" href="/admin-requests.html">${requestIcon}Requests</a>
          <a href="/admin-bookings.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z" /></svg>Bookings</a>
          <a href="/admin-refunds.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12H6a3 3 0 0 1-3-3V6Zm3-1a1 1 0 0 0-1 1v2h14V6a1 1 0 0 0-1-1H6Zm-1 5v5a1 1 0 0 0 1 1h13v-6H5Zm7 1h5v2h-5v-2Z" /></svg>Refunds</a>
          <a href="/admin-audit.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-1.3V3Zm3 5h8V6H8v2Zm0 4h8v-2H8v2Zm0 4h5v-2H8v2Z" /></svg>Audit Logs</a>
        </nav>
      </aside>

      <div class="admin-main-shell">
        <main class="admin-content">
          <section class="admin-page-heading">
            <div>
              <p data-account-role>Admin</p>
              <h1>Requests</h1>
              <span>Review parking lot edit requests submitted by staff.</span>
            </div>
          </section>

          <span class="status-line admin-status-line" id="adminStatus"></span>

          <section class="admin-staff-stats admin-request-stats">
            <article><span>Pending Requests</span><strong id="adminRequestTotal">0</strong><p>Waiting for admin review</p></article>
            <article><span>Active Lots</span><strong id="adminLots">0</strong><p>Visible to customers</p></article>
            <article><span>System Revenue</span><strong id="adminRevenue">0</strong><p>Current dashboard total</p></article>
          </section>

          <section class="admin-request-table-card">
            <div class="admin-request-table-head">
              <div>
                <h2>Parking Lot Change Requests</h2>
                <p id="adminRequestPagination">Showing requests from backend</p>
              </div>
              <button type="button" data-admin-refresh-requests>${requestIcon}Refresh</button>
            </div>
            <div class="admin-staff-table-scroll">
              <table class="admin-staff-table admin-request-table">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>ID</th>
                    <th>Parking Lot Name</th>
                    <th>Time Request</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="adminRequestList"></tbody>
              </table>
            </div>
          </section>

          <section class="admin-request-detail-modal hidden" id="requestDetailModal" aria-hidden="true">
            <div class="admin-request-detail-card" role="dialog" aria-modal="true" aria-labelledby="requestDetailTitle">
              <div class="admin-user-detail-head">
                <div>
                  <h2 id="requestDetailTitle">Request Change Detail</h2>
                  <p id="requestDetailSubtitle">Review requested parking lot updates.</p>
                </div>
                <button type="button" data-admin-close-request-detail aria-label="Close request detail">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" /></svg>
                </button>
              </div>
              <div class="admin-request-detail-body" id="requestDetailContent"></div>
              <div class="admin-request-detail-actions">
                <button type="button" class="secondary-button" data-admin-close-request-detail>Cancel</button>
                <button type="button" class="danger-button" id="rejectRequestButton">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z" /></svg>
                  Reject
                </button>
                <button type="button" class="primary-button" id="approveRequestButton">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z" /></svg>
                  Agree
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  `,
};

export function AdminRequests() {
  return <AdminScreen page={adminRequestsPage} />;
}
