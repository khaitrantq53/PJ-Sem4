import { PageShell } from '../../components/PageShell.jsx';
import { createStaffPage, icons, staffButton, staffHeadActions } from './staffLayout.js';

const editIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20h14v-2H5v2ZM19 9h-4V3H9v6H5l7 7 7-7Z" /></svg>';
const moneyIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Zm2 2v8h12V8H6Zm6 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /></svg>';

const parkingLotsContent = `
  <header class="staff-lots-header">
    <div>
      <div class="staff-lots-kicker">
        <span class="staff-lot-state" id="staffLotSelectedStatus">Active</span>
        <span id="staffLotSelectedId">ID: -</span>
      </div>
      <h1 id="staffLotSelectedName">Parking Lots</h1>
      <p id="staffLotSelectedDescription">Manage your assigned parking facilities, rates, policies, and location details.</p>
    </div>
    ${staffHeadActions(staffButton('Edit Information', editIcon))}
  </header>

  <span class="status-line staff-status-line" id="staffLotsStatus"></span>

  <div class="staff-lots-layout">
    <div class="staff-lots-main">
      <section class="staff-lots-section" id="capacity">
        <h2>Facility Status</h2>
        <div class="staff-lots-metrics">
          <article><span>Total Lots</span><strong id="staffLotsTotal">0</strong></article>
          <article><span>Active</span><strong class="tone-lavender" id="staffLotsActive">0</strong></article>
          <article><span>Pending</span><strong id="staffLotsPending">0</strong></article>
          <article><span>Paused</span><strong class="tone-pink" id="staffLotsPaused">0</strong></article>
        </div>
        <a class="staff-inline-link" href="#managed-lots">
          Manage facilities
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6-1.4 1.4 4.6 4.6-4.6 4.6L9 18Z" /></svg>
        </a>
      </section>

      <section class="staff-lots-section">
        <h2>${moneyIcon} Rate Card</h2>
        <div class="staff-rate-grid">
          <article><span>Hourly Rate</span><strong id="staffLotHourlyRate">-</strong></article>
          <article><span>Updated</span><strong id="staffLotUpdatedAt">-</strong></article>
          <article><span>Version</span><strong id="staffLotVersion">-</strong></article>
        </div>
      </section>

      <section class="staff-lots-section staff-lots-split">
        <article>
          <h2><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4V5Zm2 2v2h12V7H6Zm0 4v6h12v-6H6Z" /></svg> Active Promotions</h2>
          <div class="staff-promo-chip">PROMO CODE</div>
          <strong>No active promo loaded</strong>
          <p>Promotion data will appear here when staff promotion APIs are connected to this page.</p>
        </article>
        <article>
          <h2><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10v20H7V2Zm2 2v16h6V4H9Zm1 3h4v2h-4V7Zm0 4h4v2h-4v-2Z" /></svg> Key Policies</h2>
          <ul>
            <li><strong>Cancellation</strong><span>Policies are managed from backend policy rules.</span></li>
            <li><strong>Operating Rules</strong><span>Show policy values after selecting a lot.</span></li>
          </ul>
        </article>
      </section>

      <section class="staff-panel staff-lots-list-panel" id="managed-lots">
        <div class="staff-section-title"><h2>Managed Parking Lots</h2><span id="staffLotsCountLabel">0 lots</span></div>
        <div class="staff-lots-toolbar">
          <label>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 20.1-4.7-4.7a7.5 7.5 0 1 0-1.1 1.1l4.7 4.7 1.1-1.1ZM4.5 10.5a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" /></svg>
            <input id="staffLotSearch" type="search" placeholder="Search lot name or address" />
          </label>
          <select id="staffLotStatusFilter" aria-label="Filter parking lots by status">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
        <div class="staff-lots-list" id="staffParkingLotList"></div>
      </section>
    </div>

    <aside class="staff-lots-aside">
      <section class="staff-lots-section">
        <h2>Location</h2>
        <dl class="staff-lot-details">
          <div><dt>Address</dt><dd id="staffLotAddress">-</dd></div>
          <div><dt>Coordinates</dt><dd id="staffLotCoordinates">-</dd></div>
          <div><dt>Status</dt><dd><span class="staff-lot-mini-chip" id="staffLotStatusChip">-</span></dd></div>
        </dl>
      </section>

      <section class="staff-lots-section">
        <h2>Amenities</h2>
        <ul class="staff-amenity-list">
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h8v8h2a3 3 0 0 1 3 3v7h-2v-7a1 1 0 0 0-1-1h-2v10H7V2Zm2 2v16h4V4H9Zm1 2h2v4h-2V6Z" /></svg>EV Charging</li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11h14l-1.5-4.5A2 2 0 0 0 15.6 5H8.4a2 2 0 0 0-1.9 1.5L5 11Zm-1 2v5h2v-2h12v2h2v-5H4Z" /></svg>Valet Drop</li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17h16v2H4v-2Zm2-4h12l-2-6H8l-2 6Zm2.5-8h7A2 2 0 0 1 17.4 6.4L20 15H4l2.6-8.6A2 2 0 0 1 8.5 5Z" /></svg>Detailing</li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Z" /></svg>24/7 Security</li>
        </ul>
      </section>

      <section class="staff-lots-section">
        <h2>System</h2>
        <dl class="staff-lot-details"><div><dt>Current Version</dt><dd id="staffLotSystemVersion">-</dd></div></dl>
      </section>

      <section class="staff-panel staff-create-lot-panel" id="create-lot">
        <div class="staff-section-title"><h2>New Location</h2><span>Draft setup</span></div>
        <form class="staff-create-lot-form" id="staffParkingLotForm">
          <label class="input-group"><span>Name</span><input name="name" required /></label>
          <label class="input-group"><span>Address</span><input name="address" required /></label>
          <div class="staff-create-coordinates">
            <label class="input-group"><span>Latitude</span><input name="latitude" type="number" step="0.000001" /></label>
            <label class="input-group"><span>Longitude</span><input name="longitude" type="number" step="0.000001" /></label>
          </div>
          <label class="input-group"><span>Description</span><input name="description" /></label>
          <button class="staff-location-button" type="submit">${icons.add} Create Draft Lot</button>
        </form>
      </section>
    </aside>
  </div>
`;

const staffParkingLotsPage = createStaffPage({
  activeNav: 'lots',
  content: parkingLotsContent,
  contentClass: 'staff-lots-content',
  pageClass: 'staff-lots-page',
  pageKey: 'staff-lots',
  sideFooterHref: '#create-lot',
  title: 'ParkFinder Staff | Parking Lots',
});

export function StaffParkingLotsPage(props) {
  return <PageShell {...props} page={staffParkingLotsPage} />;
}
