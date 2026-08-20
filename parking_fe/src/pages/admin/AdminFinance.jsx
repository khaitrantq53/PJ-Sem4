import { AdminScreen } from './AdminScreen.jsx';

const adminFinancePage = {
  title: 'ParkFinder Admin | Finance',
  bodyClass: '',
  pageKey: 'admin-finance',
  markup: `
    <div class="admin-console">
      <aside class="admin-side-nav"></aside>
      <div class="admin-main-shell">
        <main class="admin-content">
          <section class="admin-page-heading" id="summary">
            <div>
              <p data-account-role>Admin</p>
              <h1>Finance</h1>
              <span>Internal 10% commission owed from staff-collected parking payments.</span>
            </div>
          </section>

          <span class="status-line admin-status-line" id="adminStatus"></span>

          <section class="admin-finance-metrics">
            <article>
              <span>Gross Revenue</span>
              <strong id="adminFinanceGross">0</strong>
              <p>Total paid parking payments that generated commission.</p>
            </article>
            <article>
              <span>Admin Commission</span>
              <strong id="adminFinanceCommission">0</strong>
              <p>10% collected from staff parking revenue.</p>
            </article>
            <article>
              <span>Staff Net Revenue</span>
              <strong id="adminFinancePlatform">0</strong>
              <p>Remaining 90% kept by staff/parking lot.</p>
            </article>
            <article>
              <span>Staff Payable</span>
              <strong id="adminFinancePayable">0</strong>
              <p>Cash and bank transfer commission owed by staff.</p>
            </article>
          </section>

          <section class="admin-finance-table-card">
            <div class="admin-finance-table-head">
              <div>
                <h2>Admin Commission</h2>
                <span>Today totals by staff.</span>
              </div>
              <select id="adminCommissionStatusFilter" aria-label="Commission status">
                <option value="">All Status</option>
                <option value="COLLECTED">Collected</option>
                <option value="UNCOLLECTED">Uncollected</option>
              </select>
            </div>

            <div class="admin-refund-table-scroll">
              <table class="admin-refund-table admin-finance-table">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Parking Lot</th>
                    <th>Gross</th>
                    <th>Admin Commission</th>
                    <th>Staff Net</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="adminCommissionList"></tbody>
              </table>
            </div>
          </section>

          <section class="admin-commission-detail-modal hidden" id="adminCommissionDetailModal" aria-hidden="true">
            <div class="admin-commission-detail-card" role="dialog" aria-modal="true" aria-labelledby="adminCommissionDetailTitle">
              <div class="admin-commission-detail-head">
                <div>
                  <p>Commission History</p>
                  <h2 id="adminCommissionDetailTitle">Commission detail</h2>
                  <span id="adminCommissionDetailMeta">-</span>
                </div>
                <button type="button" data-admin-close-commission-detail aria-label="Close commission detail">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z" />
                  </svg>
                </button>
              </div>

              <div class="admin-commission-detail-toolbar">
                <div class="staff-commission-periods" aria-label="Commission detail period">
                  <button class="active" type="button" data-admin-commission-detail-period="today">Today</button>
                  <button type="button" data-admin-commission-detail-period="7days">7 days</button>
                  <button type="button" data-admin-commission-detail-period="30days">30 days</button>
                </div>
                <button class="admin-commission-detail-pay-button" type="button" id="adminCommissionMarkFilteredPaid">
                  Mark filtered paid
                </button>
                <div class="admin-commission-detail-totals">
                  <span>Gross <strong id="adminCommissionDetailGross">0</strong></span>
                  <span>Admin <strong id="adminCommissionDetailAdmin">0</strong></span>
                  <span>Staff Net <strong id="adminCommissionDetailNet">0</strong></span>
                </div>
              </div>

              <div class="admin-refund-table-scroll admin-commission-detail-scroll">
                <table class="staff-booking-table staff-commission-table admin-commission-detail-table">
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Gross Amount</th>
                      <th>Method</th>
                      <th>Rate</th>
                      <th>Admin Commission</th>
                      <th>Staff Net</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody id="adminCommissionDetailList"></tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  `,
};

export function AdminFinance() {
  return <AdminScreen page={adminFinancePage} />;
}
