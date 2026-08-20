import { PageShell } from '../../components/PageShell.jsx';
import { createStaffPage } from './staffLayout.js';

const commissionsContent = `
  <header class="staff-bookings-head staff-commission-head">
    <div>
      <p data-account-role>Staff</p>
      <h1>Commission</h1>
      <span>Track the 10% admin commission owed from staff-collected payments.</span>
    </div>
  </header>

  <span class="status-line staff-status-line" id="staffCommissionStatus"></span>

  <section class="staff-commission-metrics">
    <article>
      <span>Gross Amount</span>
      <strong id="staffCommissionGross">0</strong>
      <small>Total filtered parking payments</small>
    </article>
    <article>
      <span>Admin Commission</span>
      <strong id="staffCommissionAdmin">0</strong>
      <small>10% payable to admin</small>
    </article>
    <article>
      <span>Booking Commission</span>
      <strong id="staffCommissionBookings">0</strong>
      <small>Filtered commission records</small>
    </article>
    <article>
      <span>Staff Net</span>
      <strong id="staffCommissionNet">0</strong>
      <small>Your 90% remaining revenue</small>
    </article>
  </section>

  <section class="staff-commission-table-card">
    <div class="staff-commission-toolbar">
      <div>
        <h2>Commission History</h2>
        <span>All current payment methods are collected by staff until admin marks commission as paid.</span>
      </div>
      <div class="staff-commission-filters">
        <div class="staff-commission-periods" aria-label="Commission period">
          <button class="active" type="button" data-staff-commission-period="today">Today</button>
          <button type="button" data-staff-commission-period="7days">7 days</button>
          <button type="button" data-staff-commission-period="30days">30 days</button>
        </div>
        <select id="staffCommissionStatusFilter" aria-label="Commission status">
          <option value="">All Status</option>
          <option value="PAYABLE">Payable</option>
          <option value="PAID">Paid</option>
        </select>
      </div>
    </div>
    <div class="staff-booking-table-scroll">
      <table class="staff-booking-table staff-commission-table">
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
        <tbody id="staffCommissionList"></tbody>
        <tfoot>
          <tr class="staff-commission-total-row">
            <td>Total</td>
            <td id="staffCommissionTotalGross">0</td>
            <td>-</td>
            <td>-</td>
            <td id="staffCommissionTotalAdmin">0</td>
            <td id="staffCommissionTotalNet">0</td>
            <td id="staffCommissionTotalBookings">0 records</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
`;

const staffCommissionsPage = createStaffPage({
  activeNav: 'commissions',
  content: commissionsContent,
  contentClass: 'staff-commissions-content',
  pageClass: 'staff-commissions-page',
  pageKey: 'staff-commissions',
  sideFooterHref: '/staff-bookings.html',
  sideFooterLabel: 'View Bookings',
  title: 'ParkFinder Staff | Commission',
});

export function StaffCommissionsPage(props) {
  return <PageShell {...props} page={staffCommissionsPage} />;
}
