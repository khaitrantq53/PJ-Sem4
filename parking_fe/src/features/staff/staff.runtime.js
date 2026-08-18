import {
  apiPage,
  apiRequest,
  clearSession,
  getStoredAccount,
  jsonBody,
  startSessionGuard,
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
    currency: value?.currency || currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number.isFinite(amount) ? amount : 0);
}

function moneyAmount(value) {
  const amount = Number(value?.amount ?? value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function moneyCurrency(value, fallback = 'VND') {
  return value?.currency || fallback;
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

function idempotencyKey() {
  return window.crypto?.randomUUID?.() || '88888888-8888-4888-8888-888888888888';
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
    setText('#staffTodayBookings', summary.todayBookings);
    setText('#staffRevenue', money(summary.revenue, summary.currency || 'VND'));
    setText('#staffOfflineDevices', summary.offlineDevices);
    setText('#staffManagedLots', lots.items.length ? 'Assigned lot' : 'No lot yet');
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
let selectedLotCapacities = [];
let selectedLotPricingRules = [];
let selectedLotServices = [];
let selectedStaffLotImageFiles = [];
let bookingsCache = [];
let changeRequestsCache = [];
let extensionRequestsCache = [];
let bookingLotsCache = [];
let activeBookingTab = '';
let activeBookingStatusGroup = '';
let staffBookingDurationTimer = null;
let checkoutPreviewTimer = null;
let checkoutDraft = null;
const STAFF_ACTIVE_BOOKING_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'];
const staffLotIcons = {
  amenity: (name) => `<span class="material-symbols-outlined" aria-hidden="true">${amenityIcon(name)}</span>`,
  service: '<span class="material-symbols-outlined" aria-hidden="true">local_car_wash</span>',
};
const STAFF_AMENITY_NAMES = ['EV Charging', 'Camera/Security', 'Covered Parking', 'Valet', 'Car Wash', '24/7 Access'];
const STAFF_PAID_AMENITY_PRICES = {
  'car wash': 10000,
  'ev charging': 50000,
};
const STAFF_LOT_IMAGE_LIMIT = 3;
const STAFF_LOT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const STAFF_LOT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function clearSelectedStaffLotImages() {
  selectedStaffLotImageFiles = [];
  const input = $('#staffLotImageInput');
  if (input) {
    input.value = '';
  }
  renderStaffLotImagePreview();
}

function setSelectedStaffLotImages(files) {
  const validFiles = [];
  const rejectedFiles = [];

  files.forEach((file) => {
    if (!STAFF_LOT_IMAGE_TYPES.includes(file.type) || file.size > STAFF_LOT_IMAGE_MAX_BYTES) {
      rejectedFiles.push(file.name || 'image');
      return;
    }
    validFiles.push(file);
  });

  selectedStaffLotImageFiles = validFiles.slice(0, STAFF_LOT_IMAGE_LIMIT);
  if (files.length > STAFF_LOT_IMAGE_LIMIT || rejectedFiles.length) {
    const messages = [];
    if (files.length > STAFF_LOT_IMAGE_LIMIT) {
      messages.push('Only the first 3 valid images will be sent for review.');
    }
    if (rejectedFiles.length) {
      messages.push(`Skipped unsupported or larger than 5MB: ${rejectedFiles.join(', ')}`);
    }
    setStatus('#staffLotsStatus', messages.join(' '), true);
  }
  renderStaffLotImagePreview();
}

function renderStaffLotImagePreview() {
  const preview = $('#staffLotImagePreview');
  if (!preview) {
    return;
  }

  if (!selectedStaffLotImageFiles.length) {
    preview.innerHTML = '<span>No images selected</span>';
    return;
  }

  preview.innerHTML = selectedStaffLotImageFiles.map((file, index) => `
    <figure>
      <img src="${escapeHtml(URL.createObjectURL(file))}" alt="${escapeHtml(file.name || `Parking image ${index + 1}`)}" />
      <figcaption>${escapeHtml(file.name || `Image ${index + 1}`)}</figcaption>
    </figure>
  `).join('');
}

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

function setFormValue(form, name, value) {
  const field = form?.elements.namedItem(name);
  if (field) {
    field.value = value ?? '';
  }
}

function setFormChecked(form, name, checked) {
  const field = form?.elements.namedItem(name);
  if (field) {
    field.checked = Boolean(checked);
  }
}

function vehicleTypeLabel(value) {
  return String(value || 'Parking').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function findPricingRule(vehicleType, startTime, endTime) {
  return selectedLotPricingRules.find((rule) => (
    rule.vehicleType === vehicleType
    && String(rule.startTime || '').startsWith(startTime.slice(0, 5))
    && String(rule.endTime || '').startsWith(endTime.slice(0, 5))
  ));
}

function findCapacity(vehicleType) {
  return selectedLotCapacities.find((capacity) => capacity.vehicleType === vehicleType);
}

function upsertById(items, item) {
  if (!item?.id) {
    return items;
  }
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index === -1) {
    return [...items, item];
  }
  const next = [...items];
  next[index] = item;
  return next;
}

function upsertCapacity(item) {
  if (!item?.parkingLotId || !item?.vehicleType) {
    return;
  }
  const index = selectedLotCapacities.findIndex((capacity) => (
    capacity.parkingLotId === item.parkingLotId && capacity.vehicleType === item.vehicleType
  ));
  if (index === -1) {
    selectedLotCapacities = [...selectedLotCapacities, item];
    return;
  }
  selectedLotCapacities = selectedLotCapacities.map((capacity, capacityIndex) => (
    capacityIndex === index ? item : capacity
  ));
}

function upsertPricingRule(item) {
  selectedLotPricingRules = upsertById(selectedLotPricingRules, item);
}

function upsertService(item) {
  selectedLotServices = upsertById(selectedLotServices, item);
}

function upsertParkingLot(item) {
  if (!item?.id) {
    return;
  }
  parkingLotsCache = upsertById(parkingLotsCache, item);
  selectedLotId = item.id;
}

function pricingRuleMeta(rule) {
  const start = String(rule.startTime || '').slice(0, 5);
  const end = String(rule.endTime || '').slice(0, 5);
  if (start === '07:00' && end === '17:00') {
    return { icon: 'light_mode', className: 'day', label: 'Day Shift' };
  }
  if (start === '17:00' && end === '22:00') {
    return { icon: 'wb_twilight', className: 'evening', label: 'Evening Shift' };
  }
  if (start === '22:00' && end === '07:00') {
    return { icon: 'dark_mode', className: 'night', label: 'Night Shift' };
  }
  return { icon: 'payments', className: 'default', label: vehicleTypeLabel(rule.vehicleType) };
}

function amenityIcon(name) {
  const normalized = normalizeFilterValue(name);
  if (normalized.includes('ev')) return 'ev_station';
  if (normalized.includes('camera') || normalized.includes('security')) return 'videocam';
  if (normalized.includes('valet')) return 'directions_car';
  if (normalized.includes('wash')) return 'local_car_wash';
  if (normalized.includes('24') || normalized.includes('access')) return 'schedule';
  if (normalized.includes('covered')) return 'garage';
  return 'local_parking';
}

function isAmenityService(serviceOrName) {
  const name = typeof serviceOrName === 'string' ? serviceOrName : serviceOrName?.name;
  const normalizedName = normalizeFilterValue(name);
  return STAFF_AMENITY_NAMES.some((amenity) => normalizeFilterValue(amenity) === normalizedName);
}

function findServiceByName(name) {
  const normalizedName = normalizeFilterValue(name);
  return selectedLotServices.find((service) => normalizeFilterValue(service.name) === normalizedName);
}

function renderStaffLotCapacity(capacities = []) {
  const capacityFor = (vehicleType) => capacities.find((item) => item.vehicleType === vehicleType) || {};
  const bookedFor = (capacity) => Number(capacity.reserved || 0) + Number(capacity.checkedIn || 0);
  const carCapacity = capacityFor('CAR');
  const motorbikeCapacity = capacityFor('MOTORBIKE');
  const carAvailable = Number(carCapacity.available || 0);
  const carBooked = bookedFor(carCapacity);
  const motorbikeAvailable = Number(motorbikeCapacity.available || 0);
  const motorbikeBooked = bookedFor(motorbikeCapacity);
  const total = Number(carCapacity.totalCapacity || 0) + Number(motorbikeCapacity.totalCapacity || 0);

  setText('#staffCapacityTotal', total.toLocaleString('en-US'));
  setText('#staffCapacityCarAvailable', carAvailable.toLocaleString('en-US'));
  setText('#staffCapacityCarBooked', carBooked.toLocaleString('en-US'));
  setText('#staffCapacityMotorbikeAvailable', motorbikeAvailable.toLocaleString('en-US'));
  setText('#staffCapacityMotorbikeBooked', motorbikeBooked.toLocaleString('en-US'));
}

function renderStaffLotPricing(rules = []) {
  const element = $('#staffHourlyRates');
  if (!element) {
    return;
  }
  const activeRules = rules.filter((rule) => rule.active !== false);
  const rateSlots = [
    ['day', 'Day', '07:00:00', '17:00:00'],
    ['evening', 'Evening', '17:00:00', '22:00:00'],
    ['night', 'Night', '22:00:00', '07:00:00'],
  ];
  const vehicleGroups = [
    ['CAR', 'Car'],
    ['MOTORBIKE', 'Motorbike'],
  ];
  const ruleFor = (vehicleType, startTime, endTime) => activeRules.find((rule) => (
    rule.vehicleType === vehicleType
    && String(rule.startTime || '').startsWith(startTime.slice(0, 5))
    && String(rule.endTime || '').startsWith(endTime.slice(0, 5))
  ));

  if (!activeRules.length) {
    element.innerHTML = '<div class="empty-state">No pricing rules yet.</div>';
    return;
  }

  element.innerHTML = vehicleGroups.map(([vehicleType, vehicleLabel]) => `
    <div class="staff-rate-group-card">
      <div class="staff-rate-group-title">
        <strong>${escapeHtml(vehicleLabel)}</strong>
        <span>${escapeHtml(vehicleTypeLabel(vehicleType))} hourly pricing</span>
      </div>
      <div class="staff-rate-group-list">
        ${rateSlots.map(([slotClass, slotLabel, startTime, endTime]) => {
          const rule = ruleFor(vehicleType, startTime, endTime);
          const meta = pricingRuleMeta({ startTime, endTime, vehicleType });
          return `
            <div class="staff-rate-row compact">
              <div>
                <span class="material-symbols-outlined staff-rate-icon ${slotClass || meta.className}" aria-hidden="true">${meta.icon}</span>
                <div>
                  <strong>${escapeHtml(slotLabel)}</strong>
                  <small>${escapeHtml(`${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`)}</small>
                </div>
              </div>
              <p>${rule ? escapeHtml(money(rule.hourlyRate, 'VND')) : '-'}${rule ? '<span>/hr</span>' : ''}</p>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function renderStaffLotServices(services = []) {
  const amenities = $('#staffAmenities');
  if (amenities) {
    const activeAmenities = services.filter((service) => service.active !== false && isAmenityService(service));
    amenities.innerHTML = activeAmenities.length ? activeAmenities.map((service) => `
      <span>${staffLotIcons.amenity(service.name)}${escapeHtml(service.name)}</span>
    `).join('') : `<span>${staffLotIcons.amenity('parking')} No amenities yet</span>`;
  }
}

function approvedLotImages(lot) {
  const images = Array.isArray(lot?.images) ? lot.images : [];
  const imageUrls = Array.isArray(lot?.imageUrls) ? lot.imageUrls : [];
  return [
    ...images.map((image) => image.imageUrl).filter(Boolean),
    ...imageUrls.filter(Boolean),
  ].filter((url, index, urls) => urls.indexOf(url) === index).slice(0, 3);
}

function renderStaffLotImages(lot) {
  const gallery = $('#staffLotImageGallery');
  if (!gallery) {
    return;
  }
  const images = approvedLotImages(lot);
  if (!images.length) {
    gallery.innerHTML = '<div class="empty-state">No approved images yet. Upload images in Edit Details and wait for admin approval.</div>';
    return;
  }

  gallery.innerHTML = images.map((imageUrl, index) => `
    <figure class="${index === 0 ? 'primary' : ''}">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${lot?.name || 'Parking lot'} image ${index + 1}`)}" onerror="this.closest('figure').classList.add('image-error');" />
      <figcaption>${index === 0 ? 'Primary image' : `Image ${index + 1}`}</figcaption>
    </figure>
  `).join('');
}

function renderParkingLotDetail(lot) {
  setText('#staffLotSelectedStatus', lot?.status || '-');
  setText('#staffLotSelectedId', lot?.id ? `ID: ${lot.id}` : 'ID: -');
  setText('#staffLotSelectedName', lot?.name ? `${lot.name} - Facility Overview` : 'My Parking Lot');
  setText('#staffLotSelectedDescription', lot?.description || 'Overview of facility details, pricing tiers, slot capacity, and available amenities for this parking location.');
  setText('#staffLotHourlyRate', lot?.hourlyRate != null ? `${money(lot.hourlyRate, 'VND')}/hr` : '-');
  setText('#staffLotUpdatedAt', formatDate(lot?.updatedAt));
  setText('#staffLotVersion', lot?.version != null ? `v${lot.version}` : '-');
  setText('#staffLotAddress', lot?.address || '-');
  setText('#staffLotCoordinates', lot?.latitude && lot?.longitude ? `${lot.latitude}, ${lot.longitude}` : '-');
  setText('#staffLotStatusChip', lot?.status || '-');
  setText('#staffLotSystemVersion', lot?.version != null ? `v${lot.version}` : '-');
  setText('#staffBasicName', lot?.name || '-');
  setText('#staffBasicAddress', lot?.address || '-');
  setText('#staffBasicLatitude', lot?.latitude != null ? `${lot.latitude}` : '-');
  setText('#staffBasicLongitude', lot?.longitude != null ? `${lot.longitude}` : '-');
  setText('#staffBasicDescription', lot?.description || '-');
  renderStaffLotCapacity(lot ? selectedLotCapacities : []);
  renderStaffLotPricing(lot ? selectedLotPricingRules : []);
  renderStaffLotServices(lot ? selectedLotServices : []);
  renderStaffLotImages(lot);
}

function syncStaffParkingLotForm(lot) {
  const form = $('#staffParkingLotForm');
  if (!form) {
    return;
  }

  setFormValue(form, 'name', lot?.name || '');
  setFormValue(form, 'address', lot?.address || '');
  setFormValue(form, 'latitude', lot?.latitude ?? '');
  setFormValue(form, 'longitude', lot?.longitude ?? '');
  setFormValue(form, 'description', lot?.description || '');

  setFormValue(form, 'capacity_car', findCapacity('CAR')?.totalCapacity ?? '');
  setFormValue(form, 'capacity_motorbike', findCapacity('MOTORBIKE')?.totalCapacity ?? '');

  setFormValue(form, 'price_car_day', findPricingRule('CAR', '07:00:00', '17:00:00')?.hourlyRate ?? '');
  setFormValue(form, 'price_car_evening', findPricingRule('CAR', '17:00:00', '22:00:00')?.hourlyRate ?? '');
  setFormValue(form, 'price_car_night', findPricingRule('CAR', '22:00:00', '07:00:00')?.hourlyRate ?? '');
  setFormValue(form, 'price_motorbike_day', findPricingRule('MOTORBIKE', '07:00:00', '17:00:00')?.hourlyRate ?? '');
  setFormValue(form, 'price_motorbike_evening', findPricingRule('MOTORBIKE', '17:00:00', '22:00:00')?.hourlyRate ?? '');
  setFormValue(form, 'price_motorbike_night', findPricingRule('MOTORBIKE', '22:00:00', '07:00:00')?.hourlyRate ?? '');

  STAFF_AMENITY_NAMES.forEach((amenity) => {
    const checked = selectedLotServices.some((service) => normalizeFilterValue(service.name) === normalizeFilterValue(amenity) && service.active !== false);
    setFormChecked(form, `amenity_${amenity}`, checked);
  });
}

function renderStaffParkingLots() {
  const counts = parkingLotCounts(parkingLotsCache);
  const filteredLots = parkingLotsCache.filter(parkingLotMatchesFilters);
  const hasAssignedLot = parkingLotsCache.length > 0;
  const selectedLot = selectedParkingLot();
  const canEditBasicInfo = !hasAssignedLot || Boolean(selectedLot);

  setText('#staffLotsTotal', counts.total);
  setText('#staffLotsActive', counts.ACTIVE || 0);
  setText('#staffLotsPending', (counts.PENDING_APPROVAL || 0) + (counts.DRAFT || 0));
  setText('#staffLotsPaused', counts.PAUSED || 0);
  setText('#staffLotsCountLabel', hasAssignedLot ? 'Assigned lot' : 'No lot yet');
  setText('#staffParkingLotSubmitLabel', hasAssignedLot ? 'Save Details' : 'Create My Parking Lot');

  ['name', 'address', 'latitude', 'longitude', 'description'].forEach((name) => {
    const field = $('#staffParkingLotForm')?.elements.namedItem(name);
    if (field) {
      field.disabled = !canEditBasicInfo;
    }
  });

  renderParkingLotDetail(selectedLot);
  syncStaffParkingLotForm(selectedLot);
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
  }, hasAssignedLot ? 'No parking lot matches your filters.' : 'No parking lot yet. Create your first draft from the form on the right.');

  $all('[data-staff-lot-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedLotId = button.dataset.staffLotId;
      const url = new URL(window.location.href);
      url.searchParams.set('lot', selectedLotId);
      window.history.replaceState(null, '', url);
      renderStaffParkingLots();
      loadStaffParkingLotConfig(selectedParkingLot());
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
    await loadStaffParkingLotConfig(selectedParkingLot());
  } catch (error) {
    setStatus('#staffLotsStatus', error.message, true);
  }
}

async function loadStaffParkingLotConfig(lot) {
  selectedLotCapacities = [];
  selectedLotPricingRules = [];
  selectedLotServices = [];
  renderParkingLotDetail(lot);
  syncStaffParkingLotForm(lot);

  if (!lot?.id) {
    return;
  }

  try {
    const [detail, capacities, pricingRules, services] = await Promise.all([
      apiRequest(`/staff/parking-lots/${lot.id}`).catch(() => lot),
      apiRequest(`/staff/parking-lots/${lot.id}/capacities`).catch(() => []),
      apiRequest(`/staff/parking-lots/${lot.id}/pricing-rules`).catch(() => []),
      apiRequest(`/staff/parking-lots/${lot.id}/services`).catch(() => []),
    ]);
    if (selectedParkingLot()?.id !== lot.id) {
      return;
    }
    upsertParkingLot(detail || lot);
    selectedLotCapacities = capacities || [];
    selectedLotPricingRules = pricingRules || [];
    selectedLotServices = services || [];
    renderParkingLotDetail(selectedParkingLot());
    syncStaffParkingLotForm(selectedParkingLot());
  } catch (error) {
    setStatus('#staffLotsStatus', error.message, true);
  }
}

function openStaffLotModal() {
  const modal = $('#staffLotEditModal');
  if (!modal) {
    return;
  }
  syncStaffParkingLotForm(selectedParkingLot());
  clearSelectedStaffLotImages();
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => $('#staffParkingLotForm')?.elements.namedItem('name')?.focus(), 30);
}

function closeStaffLotModal() {
  const modal = $('#staffLotEditModal');
  if (!modal) {
    return;
  }
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

async function saveStaffLotCapacity(parkingLotId, data) {
  const capacityFields = [
    ['capacity_car', 'CAR'],
    ['capacity_motorbike', 'MOTORBIKE'],
  ];
  const capacities = await Promise.all(capacityFields.map(([fieldName, vehicleType]) => {
    const value = data[fieldName];
    if (value === undefined || value === '') {
      return null;
    }
    return apiRequest(`/staff/parking-lots/${parkingLotId}/capacities/${vehicleType}`, {
      method: 'PUT',
      body: jsonBody({
        totalCapacity: Number(value),
      }),
    });
  }).filter(Boolean));
  capacities.forEach(upsertCapacity);
}

async function saveStaffLotPricing(parkingLotId, data) {
  const rateFields = [
    ['price_car_day', 'CAR', '07:00:00', '17:00:00'],
    ['price_car_evening', 'CAR', '17:00:00', '22:00:00'],
    ['price_car_night', 'CAR', '22:00:00', '07:00:00'],
    ['price_motorbike_day', 'MOTORBIKE', '07:00:00', '17:00:00'],
    ['price_motorbike_evening', 'MOTORBIKE', '17:00:00', '22:00:00'],
    ['price_motorbike_night', 'MOTORBIKE', '22:00:00', '07:00:00'],
  ];
  const rules = await Promise.all(rateFields.map(([fieldName, vehicleType, startTime, endTime]) => {
    const value = data[fieldName];
    if (value === undefined) {
      return null;
    }
    return apiRequest(`/staff/parking-lots/${parkingLotId}/pricing-rules`, {
      method: 'PUT',
      body: jsonBody({
        active: true,
        endTime,
        hourlyRate: Number(value),
        startTime,
        vehicleType,
      }),
    });
  }).filter(Boolean));
  rules.forEach(upsertPricingRule);
}

async function saveStaffLotServices(parkingLotId, data) {
  const amenityRequests = STAFF_AMENITY_NAMES.map((amenity) => {
    const existing = findServiceByName(amenity);
    const active = data[`amenity_${amenity}`] === 'on';
    if (!active && !existing?.id) {
      return null;
    }
    const path = existing?.id
      ? `/staff/parking-lots/${parkingLotId}/services/${existing.id}`
      : `/staff/parking-lots/${parkingLotId}/services`;
    return apiRequest(path, {
      method: existing?.id ? 'PUT' : 'POST',
      body: jsonBody({
        active,
        name: amenity,
        price: STAFF_PAID_AMENITY_PRICES[normalizeFilterValue(amenity)] || 0,
      }),
    });
  }).filter(Boolean);

  const services = await Promise.all(amenityRequests);
  services.forEach(upsertService);
}

async function uploadStaffLotRequestImages(parkingLotId, requestId, files) {
  if (!files.length) {
    return;
  }
  const payload = new FormData();
  files.slice(0, STAFF_LOT_IMAGE_LIMIT).forEach((file) => {
    payload.append('files', file);
  });
  await apiRequest(`/staff/parking-lots/${parkingLotId}/update-requests/${requestId}/images/batch`, {
    method: 'POST',
    body: payload,
  });
}

function buildStaffLotReviewPayload(data, selectedLot) {
  const capacityFields = [
    ['capacity_car', 'CAR'],
    ['capacity_motorbike', 'MOTORBIKE'],
  ];
  const rateFields = [
    ['price_car_day', 'CAR', '07:00:00', '17:00:00'],
    ['price_car_evening', 'CAR', '17:00:00', '22:00:00'],
    ['price_car_night', 'CAR', '22:00:00', '07:00:00'],
    ['price_motorbike_day', 'MOTORBIKE', '07:00:00', '17:00:00'],
    ['price_motorbike_evening', 'MOTORBIKE', '17:00:00', '22:00:00'],
    ['price_motorbike_night', 'MOTORBIKE', '22:00:00', '07:00:00'],
  ];

  return {
    address: data.address,
    capacities: capacityFields
      .filter(([fieldName]) => data[fieldName] !== undefined && data[fieldName] !== '')
      .map(([fieldName, vehicleType]) => ({
        totalCapacity: Number(data[fieldName]),
        vehicleType,
      })),
    description: data.description || null,
    latitude: data.latitude ? Number(data.latitude) : null,
    longitude: data.longitude ? Number(data.longitude) : null,
    name: data.name,
    pricingRules: rateFields
      .filter(([fieldName]) => data[fieldName] !== undefined && data[fieldName] !== '')
      .map(([fieldName, vehicleType, startTime, endTime]) => ({
        active: true,
        endTime,
        hourlyRate: Number(data[fieldName]),
        startTime,
        vehicleType,
      })),
    services: STAFF_AMENITY_NAMES.map((amenity) => ({
      active: data[`amenity_${amenity}`] === 'on',
      name: amenity,
      price: STAFF_PAID_AMENITY_PRICES[normalizeFilterValue(amenity)] || 0,
    })),
    version: selectedLot?.version ?? null,
  };
}

async function saveStaffParkingLotDetails(form) {
  let selectedLot = selectedParkingLot();
  const data = formData(form);

  if (parkingLotsCache.length > 0 && !selectedLot) {
    throw new Error('Cannot find assigned parking lot.');
  }

  if (!selectedLot) {
    selectedLot = await apiRequest('/staff/parking-lots', {
      method: 'POST',
      body: jsonBody({
        address: data.address,
        description: data.description || null,
        latitude: data.latitude ? Number(data.latitude) : null,
        longitude: data.longitude ? Number(data.longitude) : null,
        name: data.name,
      }),
    });
    selectedLotId = selectedLot.id;
    upsertParkingLot(selectedLot);
    await saveStaffLotCapacity(selectedLot.id, data);
    await saveStaffLotPricing(selectedLot.id, data);
    await saveStaffLotServices(selectedLot.id, data);
    return 'Parking lot details saved.';
  } else {
    const request = await apiRequest(`/staff/parking-lots/${selectedLot.id}/update-requests`, {
      method: 'POST',
      body: jsonBody(buildStaffLotReviewPayload(data, selectedLot)),
    });
    await uploadStaffLotRequestImages(selectedLot.id, request.id, selectedStaffLotImageFiles);
    clearSelectedStaffLotImages();
    return 'Parking lot changes sent for admin approval.';
  }
}

function bindStaffParkingLotsPage() {
  $('#staffLotSearch')?.addEventListener('input', renderStaffParkingLots);
  $('#staffLotStatusFilter')?.addEventListener('change', renderStaffParkingLots);

  $all('[data-action="open-staff-lot-modal"]').forEach((button) => {
    button.addEventListener('click', openStaffLotModal);
  });

  $all('[data-action="close-staff-lot-modal"]').forEach((button) => {
    button.addEventListener('click', closeStaffLotModal);
  });

  $('[data-action="select-staff-lot-images"]')?.addEventListener('click', () => {
    $('#staffLotImageInput')?.click();
  });

  $('#staffLotImageInput')?.addEventListener('change', (event) => {
    setSelectedStaffLotImages([...event.currentTarget.files]);
  });

  $('#staffLotEditModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeStaffLotModal();
    }
  });

  $('#staffParkingLotForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#staffLotsStatus', 'Submitting parking lot changes...');
    try {
      const message = await saveStaffParkingLotDetails(event.currentTarget);
      closeStaffLotModal();
      setStatus('#staffLotsStatus', message);
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

function parseBookingDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatBookingDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function checkedInDuration(booking) {
  const actualCheckIn = parseBookingDate(booking?.actualCheckInTime);
  if (!actualCheckIn) {
    return {
      className: 'waiting',
      label: 'Not checked in',
      value: '-',
    };
  }

  const actualCheckOut = parseBookingDate(booking?.actualCheckOutTime);
  const endTime = actualCheckOut || new Date();
  const elapsed = Math.max(0, endTime.getTime() - actualCheckIn.getTime());
  const statusClassName = bookingStatusClass(booking?.status);

  return {
    className: actualCheckOut ? 'completed' : statusClassName,
    label: actualCheckOut ? `Out ${formatTime(actualCheckOut)}` : `Since ${formatTime(actualCheckIn)}`,
    value: formatBookingDuration(elapsed),
  };
}

function hasRunningCheckedInBooking() {
  return bookingsCache.some((booking) => {
    return booking.actualCheckInTime
      && !booking.actualCheckOutTime
      && booking.status === 'CHECKED_IN';
  });
}

function bookingStatusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('pending')) {
    return 'pending';
  }
  if (normalized.includes('completed') || normalized.includes('checked_out') || normalized.includes('checked out') || normalized.includes('cancel') || normalized.includes('declin')) {
    return 'completed';
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
  const brand = booking.vehicleBrand || booking.brand;
  const color = booking.vehicleColor || booking.color;
  const type = booking.vehicleType || booking.vehicleName;
  const description = [brand, color].filter(Boolean).join(' / ');

  return description
    || type
    || booking.vehicleName
    || booking.paymentMethod
    || 'Vehicle request';
}

function bookingSelectedServices(booking) {
  const services = Array.isArray(booking?.services) ? booking.services : [];
  const selectedServices = services
    .map((service) => ({
      name: service.serviceName || service.name,
      price: service.price,
    }))
    .filter((service) => service.name);

  if (!selectedServices.length) {
    return '<div class="staff-booking-services empty">No services</div>';
  }

  return `
    <div class="staff-booking-services">
      ${selectedServices.map((service) => `
        <span>
          ${escapeHtml(service.name)}
          ${service.price ? `<small>${escapeHtml(money(service.price, service.price.currency))}</small>` : ''}
        </span>
      `).join('')}
    </div>
  `;
}

function bookingServiceItems(booking) {
  return (Array.isArray(booking?.services) ? booking.services : [])
    .map((service) => ({
      name: service.serviceName || service.name,
      price: service.price,
    }))
    .filter((service) => service.name);
}

function checkoutServicesHtml(booking) {
  const services = bookingServiceItems(booking);

  if (!services.length) {
    return '<span class="empty">No services selected</span>';
  }

  return services.map((service) => `
    <span>
      ${escapeHtml(service.name)}
      ${service.price ? `<small>${escapeHtml(money(service.price))}</small>` : ''}
    </span>
  `).join('');
}

function checkoutParkingFee(booking, preview) {
  if (preview?.priceBreakdown?.parkingFee) {
    return preview.priceBreakdown.parkingFee;
  }

  const breakdown = booking?.priceBreakdown || {};
  const currency = moneyCurrency(preview?.totalAmount || breakdown.parkingFee);
  const total = moneyAmount(preview?.totalAmount);
  const serviceFee = moneyAmount(breakdown.serviceFee);
  const overtimeFee = moneyAmount(preview?.overtimeFee || breakdown.overtimeFee);
  const pickupFee = moneyAmount(breakdown.pickupFee);
  const platformFee = moneyAmount(breakdown.platformFee);
  const tax = moneyAmount(breakdown.tax);
  const discount = moneyAmount(breakdown.discount);
  const parkingFee = total - serviceFee - overtimeFee - pickupFee - platformFee - tax + discount;

  return {
    amount: Math.max(0, parkingFee),
    currency,
  };
}

function bookingCustomerLabel(booking) {
  return booking.customerName
    || booking.customerEmail
    || booking.customerPhone
    || String(booking.customerId || 'Customer').slice(0, 8);
}

function bookingCustomerDetail(booking) {
  return booking.customerPhone
    || booking.customerEmail
    || 'No phone number';
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
    return STAFF_ACTIVE_BOOKING_STATUSES.includes(booking.status);
  }
  return booking.status === activeBookingTab;
}

function bookingMatchesStatusGroup(booking) {
  if (!activeBookingStatusGroup) {
    return true;
  }

  const status = String(booking.status || '');
  if (activeBookingStatusGroup === 'active') {
    return ['PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'].includes(status);
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
    booking.licensePlate,
    booking.plateNumber,
    booking.vehiclePlate,
    booking.customerName,
    booking.customerPhone,
    booking.customerEmail,
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
  const filters = $('#staffBookingFilters');
  const pagination = $('#staffBookingPaginationFooter');
  const tableCard = $('#staffBookingTableCard');
  const table = $('#staffBookingTableRoot');
  const tableHead = $('#staffBookingTableHead');
  const changePanel = $('#staffChangeRequestsPanel');
  const extensionPanel = $('#staffExtensionRequestsPanel');

  const titles = {
    change: 'Change Requests',
    extension: 'Extension Requests',
    pending: 'Pending Approvals',
    table: 'Active Bookings',
  };
  const subtitles = {
    change: 'Review and manage active booking modification requests from customers.',
    extension: 'Review and approve customer requests to extend their active parking sessions. Approving a request will automatically charge their payment method on file.',
    pending: 'Review new booking requests before they become active reservations.',
    table: 'Track bookings that are currently moving through payment, check-in, and parking.',
  };

  $('#staffBookingsTitle') && setText('#staffBookingsTitle', titles[mode] || titles.table);
  $('#staffBookingsSubtitle') && setText('#staffBookingsSubtitle', subtitles[mode] || subtitles.table);
  filters?.classList.toggle('is-hidden', isPendingApprovals || isChangeRequests || isExtensionRequests);
  pagination?.classList.toggle('is-hidden', isPendingApprovals || isChangeRequests || isExtensionRequests);
  tableCard?.classList.toggle('is-hidden', isChangeRequests || isExtensionRequests);
  changePanel?.classList.toggle('is-hidden', !isChangeRequests);
  extensionPanel?.classList.toggle('is-hidden', !isExtensionRequests);
  table?.classList.toggle('staff-pending-approvals-table', isPendingApprovals);

  if (!tableHead) {
    return;
  }

  tableHead.innerHTML = isPendingApprovals
    ? `
      <tr>
        <th>Booking ID</th>
        <th>Customer</th>
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
        <th>Services</th>
        <th>Checked-in Hours</th>
        <th>Actions</th>
      </tr>
    `;
}

function renderPendingApprovalRows(bookings) {
  if (!bookings.length) {
    return `
      <tr>
        <td colspan="5">
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
    const customerLabel = bookingCustomerLabel(booking);
    const customerDetail = bookingCustomerDetail(booking);
    const tone = bookingTone(booking);

    return `
      <tr class="staff-pending-approval-row">
        <td>
          <strong>${escapeHtml(bookingLabel)}</strong>
          <span>${escapeHtml(lotName)}</span>
        </td>
        <td>
          <strong>${escapeHtml(customerLabel)}</strong>
          <span>${escapeHtml(customerDetail)}</span>
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
            <button class="staff-booking-approve" type="button" data-staff-booking-action="activate" data-booking-id="${escapeHtml(booking.id)}">
              Check In
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

  const emptyMessage = activeBookingTab === 'CHANGE_REQUESTS' || activeBookingTab === 'EXTENSION_REQUESTS'
    ? 'Request list API is not available yet.'
    : !activeBookingTab
      ? 'No active bookings match your filters.'
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
    const duration = checkedInDuration(booking);
    const rowAccent = statusClassName === 'pending' ? ' pending' : statusClassName === 'completed' ? ' completed' : '';
    const bookingLabel = booking.bookingCode || booking.id;
    const vehicleLabel = bookingVehicleLabel(booking);
    const vehicleDetail = bookingVehicleDetail(booking);
    const selectedServices = bookingSelectedServices(booking);
    const lotName = bookingLotName(booking.parkingLotId);
    let actions = `
        <button class="staff-booking-icon-action" type="button" title="Edit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h1.4l9.9-9.9-1.4-1.4L5 17.6V19Zm14.7-11.3-3.4-3.4 1-1a1.5 1.5 0 0 1 2.1 0l1.3 1.3a1.5 1.5 0 0 1 0 2.1l-1 1Z" /></svg></button>
        <button class="staff-booking-icon-action" type="button" title="More"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg></button>
      `;

    if (booking.status === 'PENDING_APPROVAL') {
      actions = `
        <button class="staff-booking-decline" type="button" data-staff-booking-action="decline" data-booking-id="${escapeHtml(booking.id)}">Decline</button>
        <button class="staff-booking-approve" type="button" data-staff-booking-action="approve" data-booking-id="${escapeHtml(booking.id)}">Approve</button>
      `;
    } else if (booking.status === 'PENDING_PAYMENT') {
      actions = `
        <button class="staff-booking-toggle-action" type="button" data-staff-booking-action="done" data-booking-id="${escapeHtml(booking.id)}">
          <span aria-hidden="true"></span>
          Done
        </button>
      `;
    } else if (booking.status === 'CONFIRMED') {
      actions = `
        <button class="staff-booking-approve" type="button" data-staff-booking-action="check-in" data-booking-id="${escapeHtml(booking.id)}">Check In</button>
        <button class="staff-booking-icon-action" type="button" title="More"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg></button>
      `;
    } else if (booking.status === 'CHECKED_IN') {
      actions = `
        <button class="staff-booking-toggle-action" type="button" data-staff-booking-action="check-out" data-booking-id="${escapeHtml(booking.id)}">
          <span aria-hidden="true"></span>
          Check Out
        </button>
      `;
    } else if (booking.status === 'CHECKED_OUT') {
      actions = `
        <button class="staff-booking-toggle-action is-on" type="button" disabled>
          <span aria-hidden="true"></span>
          Checked Out
        </button>
      `;
    }

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
              <span>${escapeHtml(vehicleDetail)}</span>
            </div>
          </div>
        </td>
        <td><span class="staff-booking-status ${escapeHtml(statusClassName)}">${escapeHtml(booking.status || '-')}</span></td>
        <td>${selectedServices}</td>
        <td>
          <div class="staff-booking-duration ${escapeHtml(duration.className)}">
            <strong>${escapeHtml(duration.value)}</strong>
            <span>${escapeHtml(duration.label)}</span>
          </div>
        </td>
        <td><div class="staff-booking-actions">${actions}</div></td>
      </tr>
    `;
  }).join('');

  bindStaffBookingActions();
}

async function staffCheckInBooking(booking, initialQrCode = '') {
  if (!booking) {
    return;
  }

  const qrCode = initialQrCode || window.prompt('Booking code / QR code', booking.bookingCode || '');
  if (!qrCode) {
    setStatus('#staffBookingsStatus', 'Check-in cancelled.');
    return;
  }

  const plateNumber = window.prompt('Plate number (optional)', '') || '';
  const conditionNotes = window.prompt('Vehicle condition notes', 'Vehicle checked in by staff') || 'Vehicle checked in by staff';

  setStatus('#staffBookingsStatus', 'Verifying QR and checking in booking...');
  await apiRequest(`/staff/bookings/${booking.id}/verify-qr`, {
    method: 'POST',
    body: jsonBody({ qrCode, plateNumber }),
  });
  await apiRequest(`/staff/bookings/${booking.id}/check-in`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: jsonBody({
      qrCode,
      plateNumber,
      conditionNotes,
      expectedVersion: booking.version,
    }),
  });
}

async function staffCheckOutBooking(booking) {
  if (!booking) {
    return null;
  }

  setStatus('#staffBookingsStatus', 'Calculating checkout amount...');
  const preview = await apiRequest(`/staff/bookings/${booking.id}/checkout-preview`, {
    method: 'POST',
  });

  openStaffCheckoutModal(booking, preview);
  setStatus('#staffBookingsStatus', 'Review checkout amount before confirming.');
  return preview;
}

function openStaffCheckoutModal(booking, preview) {
  checkoutDraft = { booking, preview };
  renderStaffCheckoutPreview(booking, preview);

  setText('#staffCheckoutBookingCode', booking.bookingCode || booking.id);
  setText('#staffCheckoutCustomer', bookingCustomerLabel(booking));
  setText('#staffCheckoutCustomerPhone', bookingCustomerDetail(booking));
  setText('#staffCheckoutVehicle', bookingVehicleLabel(booking));
  setText('#staffCheckoutVehicleDetail', bookingVehicleDetail(booking));

  const services = $('#staffCheckoutServices');
  if (services) {
    services.innerHTML = checkoutServicesHtml(booking);
  }

  const notes = $('#staffCheckoutNotes');
  if (notes) {
    notes.value = 'Vehicle checked out by staff';
  }

  const modal = $('#staffCheckoutModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  startStaffCheckoutPreviewTimer();
}

function renderStaffCheckoutPreview(booking, preview) {
  const actualCheckIn = parseBookingDate(booking.actualCheckInTime);
  const actualCheckOut = parseBookingDate(preview.actualCheckOutTime) || new Date();
  const duration = actualCheckIn ? formatBookingDuration(actualCheckOut.getTime() - actualCheckIn.getTime()) : '-';
  const serviceFee = preview.priceBreakdown?.serviceFee || booking.priceBreakdown?.serviceFee || { amount: 0, currency: moneyCurrency(preview.totalAmount) };
  const totalAmount = preview.priceBreakdown?.total || preview.totalAmount;
  const parkingFee = checkoutParkingFee(booking, preview);

  setText('#staffCheckoutDuration', duration);
  setText('#staffCheckoutParkingFee', money(parkingFee));
  setText('#staffCheckoutServiceFee', money(serviceFee));
  setText('#staffCheckoutAmount', money(totalAmount));
}

function stopStaffCheckoutPreviewTimer() {
  if (checkoutPreviewTimer) {
    window.clearInterval(checkoutPreviewTimer);
    checkoutPreviewTimer = null;
  }
}

function startStaffCheckoutPreviewTimer() {
  stopStaffCheckoutPreviewTimer();
  checkoutPreviewTimer = window.setInterval(async () => {
    if (!checkoutDraft?.booking?.id) {
      stopStaffCheckoutPreviewTimer();
      return;
    }

    try {
      const preview = await apiRequest(`/staff/bookings/${checkoutDraft.booking.id}/checkout-preview`, {
        method: 'POST',
      });
      checkoutDraft = { ...checkoutDraft, preview };
      renderStaffCheckoutPreview(checkoutDraft.booking, preview);
    } catch (error) {
      stopStaffCheckoutPreviewTimer();
      setStatus('#staffBookingsStatus', error.message, true);
    }
  }, 1000);
}

function closeStaffCheckoutModal() {
  stopStaffCheckoutPreviewTimer();
  checkoutDraft = null;
  const modal = $('#staffCheckoutModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
}

async function confirmStaffCheckOut() {
  if (!checkoutDraft) {
    return;
  }

  stopStaffCheckoutPreviewTimer();
  const { booking, preview } = checkoutDraft;
  const button = $('#staffCheckoutConfirmButton');
  const conditionNotes = $('#staffCheckoutNotes')?.value?.trim() || 'Vehicle checked out by staff';

  if (button) {
    button.disabled = true;
    button.textContent = 'Checking out...';
  }

  try {
    setStatus('#staffBookingsStatus', 'Checking out booking...');
    await apiRequest(`/staff/bookings/${booking.id}/check-out`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey() },
      body: jsonBody({
        actualCheckOutTime: preview.actualCheckOutTime,
        conditionNotes,
        expectedVersion: preview.version ?? booking.version,
      }),
    });

    closeStaffCheckoutModal();
    setStatus('#staffBookingsStatus', 'Booking checked out. Customer amount is ready to pay.');
    await loadStaffBookings();
  } catch (error) {
    setStatus('#staffBookingsStatus', error.message, true);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Confirm Check Out';
    }
  }
}

function bindStaffCheckoutModal() {
  $all('[data-staff-checkout-close]').forEach((button) => {
    button.addEventListener('click', () => {
      closeStaffCheckoutModal();
      setStatus('#staffBookingsStatus', 'Check-out cancelled.');
    });
  });

  $('#staffCheckoutConfirmButton')?.addEventListener('click', confirmStaffCheckOut);
}

function bindStaffBookingActions() {
  $all('[data-staff-booking-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const bookingId = button.dataset.bookingId;
      const action = button.dataset.staffBookingAction;
      const booking = bookingsCache.find((item) => item.id === bookingId);
      const label = action === 'approve'
        ? 'Approving'
        : action === 'activate'
          ? 'Checking in'
        : action === 'decline'
          ? 'Declining'
          : action === 'check-out'
            ? 'Checking out'
            : action === 'done'
              ? 'Completing'
              : 'Checking in';
      setStatus('#staffBookingsStatus', `${label} booking...`);
      try {
        if (action === 'check-in') {
          await staffCheckInBooking(booking);
        } else if (action === 'check-out') {
          await staffCheckOutBooking(booking);
          return;
        } else if (action === 'done') {
          await apiRequest(`/staff/bookings/${bookingId}/done`, {
            method: 'POST',
            body: jsonBody({
              expectedVersion: booking?.version,
              note: 'Completed by staff after checkout',
            }),
          });
        } else if (action === 'activate') {
          await apiRequest(`/staff/bookings/${bookingId}/check-in`, {
            method: 'POST',
            headers: { 'Idempotency-Key': idempotencyKey() },
            body: jsonBody({
              qrCode: booking?.bookingCode || '',
              plateNumber: booking?.plateNumber || '',
              conditionNotes: 'Vehicle checked in by staff from pending approvals',
              expectedVersion: booking?.version,
            }),
          });
          activeBookingTab = '';
          $all('[data-staff-booking-tab]').forEach((item) => {
            item.classList.toggle('active', !item.dataset.staffBookingTab);
          });
        } else {
          await apiRequest(`/staff/bookings/${bookingId}/${action}`, {
            method: 'POST',
            body: action === 'decline' ? jsonBody({ reason: 'Declined by staff from booking table' }) : undefined,
          });
        }
        setStatus('#staffBookingsStatus', action === 'check-in'
          ? 'Booking checked in.'
          : action === 'check-out'
            ? 'Booking checked out. Customer amount is ready to pay.'
            : action === 'done'
              ? 'Booking completed.'
            : action === 'activate'
              ? 'Booking checked in and moved to active bookings.'
              : 'Booking updated.');
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
  bindStaffCheckoutModal();
  if (!staffBookingDurationTimer) {
    staffBookingDurationTimer = window.setInterval(() => {
      if (document.body.dataset.page === 'staff-bookings' && hasRunningCheckedInBooking()) {
        renderStaffBookings();
      }
    }, 1000);
  }
  $('#staffVerifyQrButton')?.addEventListener('click', async () => {
    const bookingCode = window.prompt('Booking code / QR code', '');
    if (!bookingCode) {
      setStatus('#staffBookingsStatus', 'QR verification cancelled.');
      return;
    }

    const booking = bookingsCache.find((item) => {
      return String(item.bookingCode || '').toLowerCase() === bookingCode.trim().toLowerCase();
    });

    if (!booking) {
      setStatus('#staffBookingsStatus', 'Booking code was not found in the current staff booking list.', true);
      return;
    }

    try {
      await staffCheckInBooking(booking, bookingCode);
      setStatus('#staffBookingsStatus', 'Booking checked in.');
      await loadStaffBookings();
    } catch (error) {
      setStatus('#staffBookingsStatus', error.message, true);
    }
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
startSessionGuard();

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
