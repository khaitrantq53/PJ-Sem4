import { AdminScreen } from './AdminScreen.jsx';

const adminStaffPage = {
  title: 'ParkFinder Admin | Staff Management',
  bodyClass: '',
  pageKey: 'admin-staff',
  markup: `
    <div class="admin-console">
      <aside class="admin-side-nav">
        <a class="admin-brand" href="/" aria-label="ParkFinder">
          <span class="admin-brand-mark" aria-hidden="true"></span>
          <span><strong>ParkFinder</strong><small>Admin Console</small></span>
        </a>

        <nav class="admin-nav-links" aria-label="Admin navigation">
          <a href="/admin-users.html">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.1-8 5v1h13.2a5.7 5.7 0 0 1-.2-1.5c0-1.5.6-2.9 1.5-3.9A13.6 13.6 0 0 0 10 14Zm9.5.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0 1.5 2 2-.9.9-1.1-1.1-1.7 1.7-.9-.9 2.6-2.6Z" /></svg>
            Customers
          </a>
          <a class="active" href="/admin-staff.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8.5 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM8 13c-3.3 0-6 1.7-6 3.8V20h12v-3.2C14 14.7 11.3 13 8 13Zm8.5 1c-.9 0-1.8.2-2.6.5a4 4 0 0 1 2.1 3.4V20h6v-2.6c0-1.9-2.5-3.4-5.5-3.4Z" /></svg>Staff</a>
          <a href="/admin-lots.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.3-3.3 1.4-1.4 1.9 1.9 4.6-4.6 1.4 1.4-6 6Z" /></svg>Parking Lots</a>
          <a href="/admin-bookings.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z" /></svg>Bookings</a>
          <a href="/admin-refunds.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12H6a3 3 0 0 1-3-3V6Zm3-1a1 1 0 0 0-1 1v2h14V6a1 1 0 0 0-1-1H6Zm-1 5v5a1 1 0 0 0 1 1h13v-6H5Zm7 1h5v2h-5v-2Z" /></svg>Refunds</a>
          <a href="/admin-audit.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-1.3V3Zm3 5h8V6H8v2Zm0 4h8v-2H8v2Zm0 4h5v-2H8v2Z" /></svg>Audit Logs</a>
        </nav>
      </aside>

      <div class="admin-main-shell">
        <main class="admin-content admin-customer-content">
          <section class="admin-page-heading" id="summary">
            <div>
              <p data-account-role>Admin</p>
              <h1>Staff Management</h1>
              <span>Manage staff accounts, approval status, and staff profile metadata.</span>
            </div>
            <div class="admin-user-actions">
              <button class="admin-add-user-button" type="button" data-admin-open-staff-modal>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" /></svg>
                Add Staff
              </button>
            </div>
          </section>

          <span class="status-line admin-status-line" id="adminStatus"></span>

          <section class="admin-user-section" id="staff">
            <div class="admin-user-filter-card admin-customer-filter-card">
              <label class="admin-user-search">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 20.1-4.7-4.7a7.5 7.5 0 1 0-1.1 1.1l4.7 4.7 1.1-1.1ZM4.5 10.5a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" /></svg>
                <input id="adminStaffSearch" type="search" placeholder="Search by email, phone, name, or ID..." />
              </label>

              <div class="admin-user-filters">
                <label>
                  <select id="adminStaffStatusFilter">
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING_APPROVAL">Pending</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="LOCKED">Locked</option>
                  </select>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5H7Z" /></svg>
                </label>
              </div>
            </div>

            <div class="admin-user-table-card admin-customer-table-card">
              <div class="admin-user-table-scroll">
                <table class="admin-user-table admin-customer-table">
                  <thead>
                    <tr>
                      <th>Staff</th>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="adminStaffList"></tbody>
                </table>
              </div>
              <div class="admin-user-pagination">
                <p id="adminStaffPagination">Showing staff from backend</p>
                <div>
                  <button type="button" disabled aria-label="Previous page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6 1.4-1.4-4.6-4.6 4.6-4.6L15 6Z" /></svg></button>
                  <button class="active" type="button">1</button>
                  <button type="button">2</button>
                  <button type="button">3</button>
                  <span>...</span>
                  <button type="button" aria-label="Next page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6-1.4 1.4 4.6 4.6-4.6 4.6L9 18Z" /></svg></button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>

    <div class="admin-user-detail-modal hidden" id="staffDetailModal" aria-hidden="true">
      <div class="admin-staff-lot-detail-card" role="dialog" aria-modal="true" aria-labelledby="staffDetailTitle">
        <div class="admin-user-detail-head">
          <div>
            <h2 id="staffDetailTitle">Parking Lot Detail</h2>
            <p id="staffDetailSubtitle">Parking lot managed by this staff account</p>
          </div>
          <button type="button" data-admin-close-staff-detail aria-label="Close staff detail">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" /></svg>
          </button>
        </div>

        <div class="admin-staff-lot-detail-body" id="staffLotDetailContent">
          <div class="admin-vehicles-loading">Loading managed parking lot...</div>
        </div>
      </div>
    </div>

    <div class="admin-staff-modal hidden" id="staffModal" aria-hidden="true">
      <div class="admin-staff-modal-card" role="dialog" aria-modal="true" aria-labelledby="staffModalTitle">
        <div class="admin-staff-modal-head">
          <div>
            <h2 id="staffModalTitle">Add Staff</h2>
            <p>Create a staff login that can manage one assigned parking lot.</p>
          </div>
          <button type="button" data-admin-close-staff-modal aria-label="Close staff form"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm11.2 0L19 6.4 6.4 19 5 17.6 17.6 5Z" /></svg></button>
        </div>

        <form class="staff-create-form" id="staffCreateForm">
          <aside class="staff-create-preview" aria-label="Staff account preview">
            <span class="staff-create-avatar" id="staffCreatePreviewAvatar">ST</span>
            <div>
              <strong id="staffCreatePreviewName">New staff account</strong>
              <p id="staffCreatePreviewEmail">staff@example.com</p>
            </div>
            <dl>
              <div>
                <dt>Role</dt>
                <dd>Staff</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>Pending approval</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd id="staffCreatePreviewPhone">Not provided</dd>
              </div>
            </dl>
          </aside>

          <div class="staff-create-fields">
            <section>
              <div class="staff-create-section-title">
                <span>Identity</span>
                <strong>Staff profile</strong>
              </div>
              <label class="staff-create-field">
                <span>Full name</span>
                <input name="fullName" autocomplete="name" placeholder="Tran Staff Demo" required />
              </label>
              <label class="staff-create-field">
                <span>Phone</span>
                <input name="phone" autocomplete="tel" placeholder="0987654321" required />
              </label>
            </section>

            <section>
              <div class="staff-create-section-title">
                <span>Account access</span>
                <strong>Login credentials</strong>
              </div>
              <label class="staff-create-field">
                <span>Email</span>
                <input name="email" type="email" autocomplete="email" placeholder="staff@example.com" required />
              </label>
              <label class="staff-create-field">
                <span>Password</span>
                <input name="password" type="password" autocomplete="new-password" placeholder="Minimum 8 characters" required minlength="8" />
              </label>
            </section>
          </div>

          <div class="admin-staff-modal-actions">
            <button class="secondary-button" type="button" data-admin-close-staff-modal>Cancel</button>
            <button class="primary-button" type="submit">Create staff</button>
          </div>
        </form>
      </div>
    </div>
  `,
};

export function AdminStaff() {
  return <AdminScreen page={adminStaffPage} />;
}
