import {
  apiPage,
  apiRequest,
  clearSession,
  getStoredAccount,
  jsonBody,
} from '../../services/api.js';

const page = document.body.dataset.page;

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return [...document.querySelectorAll(selector)];
}

function setText(selector, value) {
  const element = $(selector);
  if (element) {
    element.textContent = value ?? '-';
  }
}

function setStatus(selector, message, error = false) {
  const element = $(selector);
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle('error', error);
}

function formData(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (value !== '') {
      data[key] = value;
    }
  });
  return data;
}

function money(value, currency = 'VND') {
  const amount = Number(value?.amount ?? value ?? 0);
  return new Intl.NumberFormat('en-US', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]);
}

function renderList(selector, items, renderItem, empty = 'No records yet.') {
  const element = $(selector);
  if (!element) {
    return;
  }

  element.innerHTML = items.length
    ? items.map(renderItem).join('')
    : `<div class="empty-state">${empty}</div>`;
}

function normalizeFilterValue(value) {
  return String(value || '').trim().toLowerCase();
}

function bindLogout() {
  $all('[data-action="logout"]').forEach((button) => {
    button.addEventListener('click', () => {
      clearSession();
      window.location.href = '/auth.html';
    });
  });
}

function pathForRole(role) {
  if (role === 'ADMIN') {
    return '/admin-users.html';
  }

  if (role === 'STAFF') {
    return '/staff.html';
  }

  return '/';
}

async function loadIdentity() {
  const account = getStoredAccount();
  if (account) {
    setText('[data-account-role]', account.role || 'Signed in');
    setText('[data-account-avatar]', (account.role || 'ME').slice(0, 2));
  }

  try {
    const current = await apiRequest('/auth/me');
    setText('[data-account-role]', current.role || 'Signed in');
    setText('[data-account-avatar]', (current.role || 'ME').slice(0, 2));
    return current;
  } catch (error) {
    setText('[data-account-role]', 'Guest');
    return null;
  }
}

async function requireStaff() {
  const current = await loadIdentity();

  if (!current) {
    window.location.href = '/auth.html';
    return null;
  }

  if (current.role !== 'STAFF') {
    window.location.href = pathForRole(current.role);
    return null;
  }

  return current;
}

async function loadStaffDashboard() {
  const current = await requireStaff();
  if (!current) {
    return;
  }

  try {
    const [summary, lots, bookings] = await Promise.all([
      apiRequest('/staff/dashboard/summary'),
      apiPage('/staff/parking-lots'),
      apiPage('/staff/bookings'),
    ]);

    setText('#staffAvailable', summary.available);
    setText('#staffOccupied', summary.occupied);
    setText('#staffReserved', summary.reserved);
    setText('#staffBlocked', summary.blocked);
    setText('#staffPending', summary.pendingApprovals);
    setText('#staffOverdue', summary.overdue);
    setText('#staffTodayBookings', summary.todayBookings);
    setText('#staffRevenue', money(summary.revenue, summary.currency || 'VND'));
    setText('#staffOfflineDevices', summary.offlineDevices);
    setText('#staffManagedLots', `${lots.items.length} ${lots.items.length === 1 ? 'lot' : 'lots'}`);
    setText('#staffOpenBookings', `${bookings.items.length} ${bookings.items.length === 1 ? 'record' : 'records'}`);

    renderList('#staffLotList', lots.items, (lot) => `
      <article class="data-row staff-list-card">
        <div>
          <h3>${escapeHtml(lot.name)}</h3>
          <p>${escapeHtml(lot.address)}</p>
        </div>
        <div class="pill-row">
          <span class="pill">${escapeHtml(lot.status)}</span>
          <button class="ghost-button" type="button" data-select-lot="${escapeHtml(lot.id)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6-1.4 1.4 4.6 4.6-4.6 4.6L9 18Z" /></svg>
            View
          </button>
        </div>
      </article>
    `);

    renderList('#staffBookingList', bookings.items, (booking) => `
      <article class="data-row staff-list-card">
        <div>
          <h3>${escapeHtml(booking.bookingCode || booking.id)}</h3>
          <p>${escapeHtml(formatDate(booking.startTime))} ${escapeHtml(formatTime(booking.startTime))} to ${escapeHtml(formatTime(booking.endTime))}</p>
        </div>
        <div class="pill-row">
          <span class="pill">${escapeHtml(booking.status)}</span>
          <span class="pill">${escapeHtml(booking.paymentStatus || 'PAYMENT')}</span>
        </div>
      </article>
    `);

    $all('[data-select-lot]').forEach((button) => {
      button.addEventListener('click', () => {
        window.location.href = `/staff-parking-lots.html?lot=${encodeURIComponent(button.dataset.selectLot)}`;
      });
    });
  } catch (error) {
    setStatus('#staffStatus', error.message, true);
  }
}

let parkingLotsCache = [];
let selectedLotId = null;
let bookingsCache = [];
let changeRequestsCache = [];
let extensionRequestsCache = [];
let bookingLotsCache = [];
let activeBookingTab = '';
let activeBookingStatusGroup = '';

function parkingLotCounts(lots) {
  return lots.reduce((counts, lot) => {
    const status = lot.status || 'UNKNOWN';
    counts.total += 1;
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, { total: 0 });
}

function parkingLotMatchesFilters(lot) {
  const search = normalizeFilterValue($('#staffLotSearch')?.value);
  const status = $('#staffLotStatusFilter')?.value || '';
  const text = normalizeFilterValue(`${lot.name} ${lot.address} ${lot.id}`);

  return (!search || text.includes(search)) && (!status || lot.status === status);
}

function selectedParkingLot() {
  return parkingLotsCache.find((lot) => lot.id === selectedLotId) || parkingLotsCache[0] || null;
}

function renderParkingLotDetail(lot) {
  setText('#staffLotSelectedStatus', lot?.status || '-');
  setText('#staffLotSelectedId', lot?.id ? `ID: ${lot.id}` : 'ID: -');
  setText('#staffLotSelectedName', lot?.name || 'Parking Lots');
  setText('#staffLotSelectedDescription', lot?.description || 'Manage your assigned parking facilities, rates, policies, and location details.');
  setText('#staffLotHourlyRate', lot?.hourlyRate != null ? `${money(lot.hourlyRate, 'VND')}/hr` : '-');
  setText('#staffLotUpdatedAt', formatDate(lot?.updatedAt));
  setText('#staffLotVersion', lot?.version != null ? `v${lot.version}` : '-');
  setText('#staffLotAddress', lot?.address || '-');
  setText('#staffLotCoordinates', lot?.latitude && lot?.longitude ? `${lot.latitude}, ${lot.longitude}` : '-');
  setText('#staffLotStatusChip', lot?.status || '-');
  setText('#staffLotSystemVersion', lot?.version != null ? `v${lot.version}` : '-');
}

function renderStaffParkingLots() {
  const counts = parkingLotCounts(parkingLotsCache);
  const filteredLots = parkingLotsCache.filter(parkingLotMatchesFilters);

  setText('#staffLotsTotal', counts.total);
  setText('#staffLotsActive', counts.ACTIVE || 0);
  setText('#staffLotsPending', (counts.PENDING_APPROVAL || 0) + (counts.DRAFT || 0));
  setText('#staffLotsPaused', counts.PAUSED || 0);
  setText('#staffLotsCountLabel', `${filteredLots.length} ${filteredLots.length === 1 ? 'lot' : 'lots'}`);

  renderParkingLotDetail(selectedParkingLot());
  renderList('#staffParkingLotList', filteredLots, (lot) => {
    const active = lot.id === selectedLotId ? ' active' : '';
    const rate = lot.hourlyRate != null ? `${money(lot.hourlyRate, 'VND')}/hr` : 'No rate';
    return `
      <article class="staff-lot-row${active}">
        <button type="button" data-staff-lot-id="${escapeHtml(lot.id)}">
          <span class="staff-lot-row-main">
            <strong>${escapeHtml(lot.name)}</strong>
            <small>${escapeHtml(lot.address || 'No address')}</small>
          </span>
          <span class="staff-lot-row-meta">
            <span>${escapeHtml(rate)}</span>
            <em>${escapeHtml(lot.status || 'UNKNOWN')}</em>
          </span>
        </button>
      </article>
    `;
  }, 'No parking lots match your filters.');

  $all('[data-staff-lot-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedLotId = button.dataset.staffLotId;
      const url = new URL(window.location.href);
      url.searchParams.set('lot', selectedLotId);
      window.history.replaceState(null, '', url);
      renderStaffParkingLots();
    });
  });
}

async function loadStaffParkingLots() {
  const current = await requireStaff();
  if (!current) {
    return;
  }

  try {
    const lots = await apiPage('/staff/parking-lots', { size: 50 });
    parkingLotsCache = lots.items || [];
    const requestedLotId = new URLSearchParams(window.location.search).get('lot');
    selectedLotId = requestedLotId && parkingLotsCache.some((lot) => lot.id === requestedLotId)
      ? requestedLotId
      : parkingLotsCache[0]?.id || null;
    renderStaffParkingLots();
  } catch (error) {
    setStatus('#staffLotsStatus', error.message, true);
  }
}

function bindStaffParkingLotsPage() {
  $('#staffLotSearch')?.addEventListener('input', renderStaffParkingLots);
  $('#staffLotStatusFilter')?.addEventListener('change', renderStaffParkingLots);

  $('#staffParkingLotForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    setStatus('#staffLotsStatus', 'Creating parking lot...');
    try {
      await apiRequest('/staff/parking-lots', {
        method: 'POST',
        body: jsonBody({
          name: data.name,
          address: data.address,
          latitude: data.latitude ? Number(data.latitude) : null,
          longitude: data.longitude ? Number(data.longitude) : null,
          description: data.description || null,
        }),
      });
      event.currentTarget.reset();
      setStatus('#staffLotsStatus', 'Parking lot created as draft.');
      await loadStaffParkingLots();
    } catch (error) {
      setStatus('#staffLotsStatus', error.message, true);
    }
  });
}

function bookingLotName(parkingLotId) {
  return bookingLotsCache.find((lot) => lot.id === parkingLotId)?.name || parkingLotId || '-';
}

function bookingDateParts(value) {
  if (!value) {
    return { day: '-', time: '-' };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: '-', time: '-' };
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  return {
    day: sameDay(date, today) ? 'Today' : sameDay(date, yesterday) ? 'Yesterday' : sameDay(date, tomorrow) ? 'Tomorrow' : formatDate(value),
    time: formatTime(value),
  };
}

function bookingDateLabel(parts) {
  if (!parts || parts.day === '-') {
    return '-';
  }
  return `${parts.day}, ${parts.time}`;
}

function bookingStatusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('pending')) {
    return 'pending';
  }
  if (normalized.includes('completed') || normalized.includes('cancel') || normalized.includes('declin')) {
    return 'completed';
  }
  if (normalized.includes('overdue')) {
    return 'overdue';
  }
  return 'active';
}

function bookingVehicleIcon(statusClassName) {
  const iconClass = statusClassName === 'pending' ? ' warning' : statusClassName === 'completed' ? ' muted' : '';
  return `<span class="staff-booking-vehicle-icon${iconClass}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11h14l-1.5-4.5A2 2 0 0 0 15.6 5H8.4a2 2 0 0 0-1.9 1.5L5 11Zm-1 2v5h2v-2h12v2h2v-5H4Z" /></svg></span>`;
}

function bookingVehicleLabel(booking) {
  return booking.licensePlate
    || booking.plateNumber
    || booking.vehiclePlate
    || String(booking.vehicleId || 'Vehicle').slice(0, 8);
}

function bookingVehicleDetail(booking) {
  return booking.vehicleType
    || booking.vehicleName
    || booking.paymentMethod
    || 'Vehicle request';
}

function bookingTone(booking) {
  const tones = ['ochre', 'lavender', 'peach', 'teal'];
  const source = String(booking.id || booking.bookingCode || '');
  const score = source.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return tones[score % tones.length];
}

function bookingMatchesTab(booking) {
  if (activeBookingTab === 'CHANGE_REQUESTS' || activeBookingTab === 'EXTENSION_REQUESTS') {
    return false;
  }
  if (!activeBookingTab) {
    return true;
  }
  return booking.status === activeBookingTab;
}

function bookingMatchesStatusGroup(booking) {
  if (!activeBookingStatusGroup) {
    return true;
  }

  const status = String(booking.status || '');
  if (activeBookingStatusGroup === 'active') {
    return ['PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'OVERDUE'].includes(status);
  }
  if (activeBookingStatusGroup === 'completed') {
    return ['COMPLETED', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(status);
  }
  return true;
}

function bookingMatchesFilters(booking) {
  if (activeBookingTab === 'PENDING_APPROVAL') {
    return bookingMatchesTab(booking);
  }

  const search = normalizeFilterValue($('#staffBookingSearch')?.value);
  const lotId = $('#staffBookingLotFilter')?.value || '';
  const date = $('#staffBookingDateFilter')?.value || '';
  const haystack = normalizeFilterValue([
    booking.id,
    booking.bookingCode,
    booking.vehicleId,
    booking.parkingLotId,
    booking.status,
    booking.paymentStatus,
  ].join(' '));
  const bookingDate = booking.startTime ? new Date(booking.startTime).toISOString().slice(0, 10) : '';

  return bookingMatchesTab(booking)
    && bookingMatchesStatusGroup(booking)
    && (!search || haystack.includes(search))
    && (!lotId || booking.parkingLotId === lotId)
    && (!date || bookingDate === date);
}

function setStaffBookingViewMode(mode) {
  const isPendingApprovals = mode === 'pending';
  const isChangeRequests = mode === 'change';
  const isExtensionRequests = mode === 'extension';
  const isOverdue = mode === 'overdue';
  const filters = $('#staffBookingFilters');
  const pagination = $('#staffBookingPaginationFooter');
  const tableCard = $('#staffBookingTableCard');
  const table = $('#staffBookingTableRoot');
  const tableHead = $('#staffBookingTableHead');
  const changePanel = $('#staffChangeRequestsPanel');
  const extensionPanel = $('#staffExtensionRequestsPanel');
  const overduePanel = $('#staffOverduePanel');

  const titles = {
    change: 'Change Requests',
    extension: 'Extension Requests',
    overdue: 'Overdue Vehicles',
    pending: 'Pending Approvals',
    table: 'Booking Management',
  };
  const subtitles = {
    change: 'Review and manage active booking modification requests from customers.',
    extension: 'Review and approve customer requests to extend their active parking sessions. Approving a request will automatically charge their payment method on file.',
    overdue: 'Monitor and manage vehicles that have exceeded their booked departure time. Action required to free up capacity.',
    pending: 'Review new booking requests before they become active reservations.',
    table: 'Track active reservations, approvals, and customer request queues.',
  };

  $('#staffBookingsTitle') && setText('#staffBookingsTitle', titles[mode] || titles.table);
  $('#staffBookingsSubtitle') && setText('#staffBookingsSubtitle', subtitles[mode] || subtitles.table);
  filters?.classList.toggle('is-hidden', isPendingApprovals || isChangeRequests || isExtensionRequests || isOverdue);
  pagination?.classList.toggle('is-hidden', isPendingApprovals || isChangeRequests || isExtensionRequests || isOverdue);
  tableCard?.classList.toggle('is-hidden', isChangeRequests || isExtensionRequests || isOverdue);
  changePanel?.classList.toggle('is-hidden', !isChangeRequests);
  extensionPanel?.classList.toggle('is-hidden', !isExtensionRequests);
  overduePanel?.classList.toggle('is-hidden', !isOverdue);
  table?.classList.toggle('staff-pending-approvals-table', isPendingApprovals);

  if (!tableHead) {
    return;
  }

  tableHead.innerHTML = isPendingApprovals
    ? `
      <tr>
        <th>Booking ID</th>
        <th>Vehicle Details</th>
        <th>Requested Time</th>
        <th>Actions</th>
      </tr>
    `
    : `
      <tr>
        <th>Booking ID</th>
        <th>Plate / Vehicle</th>
        <th>Status</th>
        <th>Arrival</th>
        <th>Departure</th>
        <th>Actions</th>
      </tr>
    `;
}

function renderPendingApprovalRows(bookings) {
  if (!bookings.length) {
    return `
      <tr>
        <td colspan="4">
          <div class="staff-pending-empty">
            <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v14H7.8L4 21.8V4Zm3 5h10V7H7v2Zm0 4h7v-2H7v2Z" /></svg></span>
            <strong>All caught up!</strong>
            <p>There are no pending booking approvals at this time.</p>
          </div>
        </td>
      </tr>
    `;
  }

  return bookings.map((booking) => {
    const arrival = bookingDateParts(booking.startTime);
    const departure = bookingDateParts(booking.endTime);
    const bookingLabel = booking.bookingCode || booking.id;
    const lotName = bookingLotName(booking.parkingLotId);
    const vehicleLabel = bookingVehicleLabel(booking);
    const vehicleDetail = bookingVehicleDetail(booking);
    const tone = bookingTone(booking);

    return `
      <tr class="staff-pending-approval-row">
        <td>
          <strong>${escapeHtml(bookingLabel)}</strong>
          <span>${escapeHtml(lotName)}</span>
        </td>
        <td>
          <strong>${escapeHtml(vehicleLabel)}</strong>
          <span class="staff-pending-vehicle-detail">
            <i class="tone-${escapeHtml(tone)}"></i>
            ${escapeHtml(vehicleDetail)}
          </span>
        </td>
        <td>
          <strong>${escapeHtml(bookingDateLabel(arrival))}</strong>
          <span>to ${escapeHtml(bookingDateLabel(departure))}</span>
        </td>
        <td>
          <div class="staff-booking-actions">
            <button class="staff-pending-action decline" type="button" title="Decline" data-staff-booking-action="decline" data-booking-id="${escapeHtml(booking.id)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" /></svg>
            </button>
            <button class="staff-pending-action approve" type="button" title="Approve" data-staff-booking-action="approve" data-booking-id="${escapeHtml(booking.id)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.2 16.2-4-4L3.8 13.6l5.4 5.4L20.5 7.7l-1.4-1.4-9.9 9.9Z" /></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function bookingById(bookingId) {
  return bookingsCache.find((booking) => booking.id === bookingId);
}

function changeRequestIcon(request) {
  const booking = bookingById(request.bookingId);
  const hasStartChange = request.requestedStartTime && booking?.startTime
    && new Date(request.requestedStartTime).getTime() !== new Date(booking.startTime).getTime();
  return hasStartChange ? 'schedule' : 'edit';
}

function changeRequestCurrentDetail(request) {
  const booking = bookingById(request.bookingId);
  if (!booking) {
    return 'Current booking detail';
  }

  const start = bookingDateLabel(bookingDateParts(booking.startTime));
  const end = bookingDateLabel(bookingDateParts(booking.endTime));
  return `${start} to ${end}`;
}

function changeRequestNewDetail(request) {
  const start = bookingDateLabel(bookingDateParts(request.requestedStartTime));
  const end = bookingDateLabel(bookingDateParts(request.requestedEndTime));
  return `${start} to ${end}`;
}

function renderChangeRequests() {
  const list = $('#staffChangeRequestList');
  if (!list) {
    return;
  }

  if (!changeRequestsCache.length) {
    list.innerHTML = `
      <div class="staff-change-empty">
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 2h2v3h-2V2Zm0 17h2v3h-2v-3Zm8-8h3v2h-3v-2ZM2 11h3v2H2v-2Zm14.9-5.3 2.1-2.1L20.4 5l-2.1 2.1-1.4-1.4ZM3.6 19l2.1-2.1 1.4 1.4L5 20.4 3.6 19Zm14.7-2.1 2.1 2.1-1.4 1.4-2.1-2.1 1.4-1.4ZM3.6 5 5 3.6l2.1 2.1-1.4 1.4L3.6 5ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg></span>
        <strong>No change requests</strong>
        <p>Change request list API is not available yet. New request cards will appear here when the backend exposes the queue.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = changeRequestsCache.map((request) => {
    const booking = bookingById(request.bookingId);
    const bookingLabel = booking?.bookingCode || request.bookingId || request.id;
    const created = bookingDateLabel(bookingDateParts(request.createdAt));
    const icon = changeRequestIcon(request);

    return `
      <article class="staff-change-request-card">
        <div class="staff-change-request-grid">
          <div>
            <span>Booking ID</span>
            <strong>${escapeHtml(bookingLabel)}</strong>
            <small>${escapeHtml(created)}</small>
          </div>
          <div>
            <span>Current Detail</span>
            <p>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Z" /></svg>
              ${escapeHtml(changeRequestCurrentDetail(request))}
            </p>
          </div>
          <div>
            <span class="accent">Requested Change</span>
            <p class="accent">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon === 'schedule' ? 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5h-2v6l5 3 .9-1.5-3.9-2.3V7Z' : 'M5 19h1.4l9.9-9.9-1.4-1.4L5 17.6V19Zm14.7-11.3-3.4-3.4 1-1a1.5 1.5 0 0 1 2.1 0l1.3 1.3a1.5 1.5 0 0 1 0 2.1l-1 1Z'}" /></svg>
              ${escapeHtml(changeRequestNewDetail(request))}
            </p>
          </div>
        </div>
        <div class="staff-change-request-actions">
          <button class="staff-change-request-button reject" type="button" data-staff-change-request-action="reject" data-request-id="${escapeHtml(request.id)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" /></svg>
            Reject
          </button>
          <button class="staff-change-request-button approve" type="button" data-staff-change-request-action="approve" data-request-id="${escapeHtml(request.id)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.2 16.2-4-4L3.8 13.6l5.4 5.4L20.5 7.7l-1.4-1.4-9.9 9.9Z" /></svg>
            Approve
          </button>
        </div>
      </article>
    `;
  }).join('');

  bindStaffChangeRequestActions();
}

function requestMoneyLabel(request) {
  const value = request.extraCost
    ?? request.extraCharge
    ?? request.estimatedCharge
    ?? request.additionalAmount
    ?? request.additionalFee;
  return value == null ? 'Pending charge' : money(value);
}

function extensionDurationMinutes(request) {
  const booking = bookingById(request.bookingId);
  if (!booking?.endTime || !request.requestedEndTime) {
    return 0;
  }

  const currentEnd = new Date(booking.endTime).getTime();
  const requestedEnd = new Date(request.requestedEndTime).getTime();
  if (Number.isNaN(currentEnd) || Number.isNaN(requestedEnd)) {
    return 0;
  }
  return Math.max(0, Math.round((requestedEnd - currentEnd) / 60000));
}

function extensionCardTone(index) {
  return ['lavender', 'peach', 'cream'][index % 3];
}

function renderExtensionRequests() {
  const list = $('#staffExtensionRequestList');
  if (!list) {
    return;
  }

  const pendingRequests = extensionRequestsCache.filter((request) => String(request.status || 'PENDING') === 'PENDING');
  setText('#staffExtensionPendingCount', pendingRequests.length);

  if (!pendingRequests.length) {
    list.innerHTML = `
      <div class="staff-extension-empty">
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Zm-7 8v-4H8l5-6v4h3l-5 6Z" /></svg></span>
        <strong>No extension requests</strong>
        <p>Extension request list API is not available yet. Customer extension cards will appear here when the backend exposes the queue.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = pendingRequests.map((request, index) => {
    const booking = bookingById(request.bookingId);
    const currentDeparture = bookingDateLabel(bookingDateParts(booking?.endTime));
    const requestedDeparture = bookingDateLabel(bookingDateParts(request.requestedEndTime));
    const durationMinutes = extensionDurationMinutes(request);
    const isUrgent = durationMinutes >= 180;
    const lotName = bookingLotName(booking?.parkingLotId);
    const vehicleLabel = bookingVehicleLabel(booking || request);
    const vehicleDetail = bookingVehicleDetail(booking || request);
    const tone = extensionCardTone(index);

    return `
      <article class="staff-extension-card tone-${escapeHtml(tone)}">
        <div class="staff-extension-card-head">
          <div>
            <span>${escapeHtml(lotName)}</span>
            <h3>${escapeHtml(vehicleLabel)}</h3>
            <p>${escapeHtml(vehicleDetail)}</p>
          </div>
          ${isUrgent ? '<em>Urgent</em>' : ''}
        </div>
        <div class="staff-extension-card-details">
          <div>
            <span>Current Departure:</span>
            <strong>${escapeHtml(currentDeparture)}</strong>
          </div>
          <div>
            <span>Requested:</span>
            <strong>${escapeHtml(requestedDeparture)} <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 19V8.8l-4.6 4.6L5 12l7-7 7 7-1.4 1.4L13 8.8V19h-2Z" /></svg></strong>
          </div>
          <div>
            <span>Extra Cost:</span>
            <strong>${escapeHtml(requestMoneyLabel(request))}</strong>
          </div>
        </div>
        <div class="staff-extension-card-actions">
          <button class="approve" type="button" data-staff-extension-request-action="approve" data-request-id="${escapeHtml(request.id)}">Approve</button>
          <button class="reject" type="button" aria-label="Reject extension request" data-staff-extension-request-action="reject" data-request-id="${escapeHtml(request.id)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" /></svg>
          </button>
        </div>
      </article>
    `;
  }).join('');

  bindStaffExtensionRequestActions();
}

function overdueMinutes(booking) {
  if (!booking?.endTime) {
    return 0;
  }

  const end = new Date(booking.endTime).getTime();
  if (Number.isNaN(end)) {
    return 0;
  }
  return Math.max(0, Math.round((Date.now() - end) / 60000));
}

function overdueDurationLabel(minutes) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `+${hours}h${rest ? ` ${rest}m` : ''}`;
  }
  return `+${minutes}m`;
}

function overduePriority(minutes) {
  if (minutes >= 90) {
    return {
      action: 'Trigger Fine',
      className: 'critical',
      label: 'Critical',
      tone: 'pink',
    };
  }
  if (minutes >= 30) {
    return {
      action: 'Issue Warning',
      className: 'warning',
      label: 'Warning',
      tone: 'ochre',
    };
  }
  return {
    action: 'Monitor',
    className: 'grace',
    label: 'Grace Period',
    tone: 'lavender',
  };
}

function renderOverdueBookings() {
  const list = $('#staffOverdueList');
  if (!list) {
    return;
  }

  const overdueBookings = bookingsCache
    .filter((booking) => booking.status === 'OVERDUE' || overdueMinutes(booking) > 0 && ['CHECKED_IN', 'CONFIRMED'].includes(booking.status))
    .sort((a, b) => overdueMinutes(b) - overdueMinutes(a));

  if (!overdueBookings.length) {
    list.innerHTML = `
      <div class="staff-overdue-empty">
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 16.2-4.2-4.2-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z" /></svg></span>
        <strong>All Clear</strong>
        <p>No vehicles are currently overdue. Everything is running smoothly.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = overdueBookings.map((booking) => {
    const minutes = overdueMinutes(booking);
    const priority = overduePriority(minutes);
    const bookingLabel = booking.bookingCode || booking.id;
    const vehicleLabel = bookingVehicleLabel(booking);
    const departure = bookingDateParts(booking.endTime);
    const lotName = bookingLotName(booking.parkingLotId);

    return `
      <article class="staff-overdue-card ${escapeHtml(priority.className)}">
        <i class="staff-overdue-accent tone-${escapeHtml(priority.tone)}"></i>
        <div class="staff-overdue-card-head">
          <div>
            <span class="staff-overdue-priority ${escapeHtml(priority.className)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${priority.className === 'critical' ? 'M11 2h2v12h-2V2Zm0 16h2v4h-2v-4Z' : priority.className === 'warning' ? 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5h-2v6h2V7Zm0 8h-2v2h2v-2Z' : 'M11 17h2v-6h-2v6Zm0-8h2V7h-2v2Z'}" /></svg>
              ${escapeHtml(priority.label)}
            </span>
            <h3>${escapeHtml(bookingLabel)}</h3>
          </div>
          <div class="staff-overdue-time">
            <strong>${escapeHtml(overdueDurationLabel(minutes))}</strong>
            <span>Overdue</span>
          </div>
        </div>
        <dl class="staff-overdue-details">
          <div>
            <dt>Plate</dt>
            <dd>${escapeHtml(vehicleLabel)}</dd>
          </div>
          <div>
            <dt>Original Dep.</dt>
            <dd>${escapeHtml(departure.time)}</dd>
          </div>
          <div>
            <dt>Lot / Zone</dt>
            <dd>${escapeHtml(lotName)}</dd>
          </div>
        </dl>
        <div class="staff-overdue-card-actions">
          ${priority.className === 'grace'
            ? `<button class="monitor" type="button" data-staff-overdue-action="monitor" data-booking-id="${escapeHtml(booking.id)}">Monitor</button>`
            : `
              <button class="contact" type="button" data-staff-overdue-action="contact" data-booking-id="${escapeHtml(booking.id)}">Contact</button>
              <button class="${priority.className === 'critical' ? 'fine' : 'warn'}" type="button" data-staff-overdue-action="${priority.className === 'critical' ? 'fine' : 'warn'}" data-booking-id="${escapeHtml(booking.id)}">${escapeHtml(priority.action)}</button>
            `}
        </div>
      </article>
    `;
  }).join('');

  bindStaffOverdueActions();
}

function renderStaffBookings() {
  const pendingCount = bookingsCache.filter((booking) => booking.status === 'PENDING_APPROVAL').length;
  const filteredBookings = bookingsCache.filter(bookingMatchesFilters);
  const table = $('#staffBookingTable');
  const mode = activeBookingTab === 'PENDING_APPROVAL'
    ? 'pending'
    : activeBookingTab === 'CHANGE_REQUESTS'
      ? 'change'
      : activeBookingTab === 'EXTENSION_REQUESTS'
        ? 'extension'
        : activeBookingTab === 'OVERDUE'
          ? 'overdue'
          : 'table';
  const isPendingApprovals = mode === 'pending';
  setStaffBookingViewMode(mode);
  setText('#staffPendingBookingCount', pendingCount);
  setText('#staffBookingPagination', `Showing ${filteredBookings.length} of ${bookingsCache.length} bookings`);

  if (mode === 'change') {
    renderChangeRequests();
    return;
  }

  if (mode === 'extension') {
    renderExtensionRequests();
    return;
  }

  if (mode === 'overdue') {
    renderOverdueBookings();
    return;
  }

  const emptyMessage = activeBookingTab === 'CHANGE_REQUESTS' || activeBookingTab === 'EXTENSION_REQUESTS'
    ? 'Request list API is not available yet.'
    : 'No bookings match your filters.';

  if (!table) {
    return;
  }

  if (isPendingApprovals) {
    table.innerHTML = renderPendingApprovalRows(filteredBookings);
    bindStaffBookingActions();
    return;
  }

  if (!filteredBookings.length) {
    table.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">${escapeHtml(emptyMessage)}</div>
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = filteredBookings.map((booking) => {
    const statusClassName = bookingStatusClass(booking.status);
    const arrival = bookingDateParts(booking.startTime);
    const departure = bookingDateParts(booking.endTime);
    const rowAccent = statusClassName === 'pending' ? ' pending' : statusClassName === 'completed' ? ' completed' : '';
    const bookingLabel = booking.bookingCode || booking.id;
    const vehicleLabel = String(booking.vehicleId || 'Vehicle').slice(0, 8);
    const lotName = bookingLotName(booking.parkingLotId);
    const actions = booking.status === 'PENDING_APPROVAL'
      ? `
        <button class="staff-booking-decline" type="button" data-staff-booking-action="decline" data-booking-id="${escapeHtml(booking.id)}">Decline</button>
        <button class="staff-booking-approve" type="button" data-staff-booking-action="approve" data-booking-id="${escapeHtml(booking.id)}">Approve</button>
      `
      : `
        <button class="staff-booking-icon-action" type="button" title="Edit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h1.4l9.9-9.9-1.4-1.4L5 17.6V19Zm14.7-11.3-3.4-3.4 1-1a1.5 1.5 0 0 1 2.1 0l1.3 1.3a1.5 1.5 0 0 1 0 2.1l-1 1Z" /></svg></button>
        <button class="staff-booking-icon-action" type="button" title="More"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg></button>
      `;

    return `
      <tr class="${rowAccent}">
        <td>
          <strong>${escapeHtml(bookingLabel)}</strong>
          <span>${escapeHtml(lotName)}</span>
        </td>
        <td>
          <div class="staff-booking-vehicle-cell">
            ${bookingVehicleIcon(statusClassName)}
            <div>
              <strong>${escapeHtml(vehicleLabel)}</strong>
              <span>${escapeHtml(booking.paymentMethod || 'Vehicle')}</span>
            </div>
          </div>
        </td>
        <td><span class="staff-booking-status ${escapeHtml(statusClassName)}">${escapeHtml(booking.status || '-')}</span></td>
        <td><strong>${escapeHtml(arrival.time)}</strong><span>${escapeHtml(arrival.day)}</span></td>
        <td><strong>${escapeHtml(departure.time)}</strong><span>${escapeHtml(departure.day)}</span></td>
        <td><div class="staff-booking-actions">${actions}</div></td>
      </tr>
    `;
  }).join('');

  bindStaffBookingActions();
}

function bindStaffBookingActions() {
  $all('[data-staff-booking-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const bookingId = button.dataset.bookingId;
      const action = button.dataset.staffBookingAction;
      setStatus('#staffBookingsStatus', `${action === 'approve' ? 'Approving' : 'Declining'} booking...`);
      try {
        await apiRequest(`/staff/bookings/${bookingId}/${action}`, {
          method: 'POST',
          body: action === 'decline' ? jsonBody({ reason: 'Declined by staff from booking table' }) : undefined,
        });
        setStatus('#staffBookingsStatus', 'Booking updated.');
        await loadStaffBookings();
      } catch (error) {
        setStatus('#staffBookingsStatus', error.message, true);
      }
    });
  });
}

function bindStaffChangeRequestActions() {
  $all('[data-staff-change-request-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const requestId = button.dataset.requestId;
      const action = button.dataset.staffChangeRequestAction;
      setStatus('#staffBookingsStatus', `${action === 'approve' ? 'Approving' : 'Rejecting'} change request...`);
      try {
        await apiRequest(`/staff/booking-change-requests/${requestId}/${action}`, {
          method: 'POST',
          body: action === 'reject' ? jsonBody({ reason: 'Rejected by staff from change request queue' }) : undefined,
        });
        setStatus('#staffBookingsStatus', 'Change request updated.');
        await loadStaffBookings();
      } catch (error) {
        setStatus('#staffBookingsStatus', error.message, true);
      }
    });
  });
}

function bindStaffExtensionRequestActions() {
  $all('[data-staff-extension-request-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const requestId = button.dataset.requestId;
      const action = button.dataset.staffExtensionRequestAction;
      setStatus('#staffBookingsStatus', `${action === 'approve' ? 'Approving' : 'Rejecting'} extension request...`);
      try {
        await apiRequest(`/staff/booking-extension-requests/${requestId}/${action}`, {
          method: 'POST',
          body: action === 'reject' ? jsonBody({ reason: 'Rejected by staff from extension request queue' }) : undefined,
        });
        setStatus('#staffBookingsStatus', 'Extension request updated.');
        await loadStaffBookings();
      } catch (error) {
        setStatus('#staffBookingsStatus', error.message, true);
      }
    });
  });
}

function bindStaffOverdueActions() {
  $all('[data-staff-overdue-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.staffOverdueAction;
      const messages = {
        contact: 'Customer contact flow will open after notification API is connected.',
        fine: 'Fine trigger flow will open after penalty API is connected.',
        monitor: 'Vehicle marked for monitoring in this session.',
        warn: 'Warning flow will open after notification API is connected.',
      };
      setStatus('#staffBookingsStatus', messages[action] || 'Overdue action selected.');
    });
  });
}

function populateBookingLotFilter() {
  const select = $('#staffBookingLotFilter');
  if (!select) {
    return;
  }

  select.innerHTML = '<option value="">All Parking Lots</option>'
    + bookingLotsCache.map((lot) => `<option value="${escapeHtml(lot.id)}">${escapeHtml(lot.name)}</option>`).join('');
}

async function optionalApiPage(path, params = {}) {
  try {
    return await apiPage(path, params);
  } catch {
    return { items: [] };
  }
}

async function loadStaffBookings() {
  const current = await requireStaff();
  if (!current) {
    return;
  }

  try {
    const [lots, bookings, changeRequests, extensionRequests] = await Promise.all([
      apiPage('/staff/parking-lots', { size: 50 }),
      apiPage('/staff/bookings', { size: 50 }),
      optionalApiPage('/staff/booking-change-requests', { size: 50, status: 'PENDING' }),
      optionalApiPage('/staff/booking-extension-requests', { size: 50, status: 'PENDING' }),
    ]);
    bookingLotsCache = lots.items || [];
    bookingsCache = bookings.items || [];
    changeRequestsCache = changeRequests.items || [];
    extensionRequestsCache = extensionRequests.items || [];
    populateBookingLotFilter();
    renderStaffBookings();
  } catch (error) {
    setStatus('#staffBookingsStatus', error.message, true);
  }
}

function bindStaffBookingsPage() {
  $('#staffBookingSearch')?.addEventListener('input', renderStaffBookings);
  $('#staffBookingLotFilter')?.addEventListener('change', renderStaffBookings);
  $('#staffBookingDateFilter')?.addEventListener('change', renderStaffBookings);
  $('#staffVerifyQrButton')?.addEventListener('click', () => {
    setStatus('#staffBookingsStatus', 'QR verification action will open after scanner flow is connected.');
  });
  $('#staffOverdueRefreshButton')?.addEventListener('click', loadStaffBookings);
  $('#staffOverdueFilterButton')?.addEventListener('click', () => {
    setStatus('#staffBookingsStatus', 'Overdue filters will open after alert filtering is connected.');
  });

  $all('[data-staff-booking-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      activeBookingTab = button.dataset.staffBookingTab || '';
      $all('[data-staff-booking-tab]').forEach((item) => item.classList.toggle('active', item === button));
      renderStaffBookings();
    });
  });

  $all('[data-staff-booking-status]').forEach((button) => {
    button.addEventListener('click', () => {
      activeBookingStatusGroup = button.dataset.staffBookingStatus || '';
      $all('[data-staff-booking-status]').forEach((item) => item.classList.toggle('active', item === button));
      renderStaffBookings();
    });
  });
}

bindLogout();

if (page === 'staff') {
  loadStaffDashboard();
}

if (page === 'staff-lots') {
  bindStaffParkingLotsPage();
  loadStaffParkingLots();
}

if (page === 'staff-bookings') {
  bindStaffBookingsPage();
  loadStaffBookings();
}
