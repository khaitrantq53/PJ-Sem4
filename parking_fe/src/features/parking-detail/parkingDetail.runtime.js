import {
  apiRequest,
  clearSession,
  getParkingLotCapacities,
  getParkingLotDetail,
  getParkingLotPricingRules,
  getParkingLotReviews,
  getParkingLotServices,
  getStoredAccount,
  jsonBody,
  saveSession,
  searchParkingLots,
} from '../../services/api.js';

const previewLot = {
  id: 'sample-financial-plaza',
  name: 'Skyline Plaza Underground Parking',
  address: '452 Metropolitan Way, Financial District',
  latitude: 21.0287,
  longitude: 105.8521,
  status: 'ACTIVE',
  description: 'The Skyline Plaza parking facility offers premier, secure underground parking in the heart of the city. It is designed for drivers who prioritize safety, convenience, and a clear arrival flow.',
  hourlyRate: 12000,
  version: 1,
  updatedAt: new Date().toISOString(),
};

let currentLot = null;
let customerVehicles = [];
const PAID_SERVICE_PRICES = {
  'car wash': 10000,
  'ev charging': 50000,
};
const CHECK_IN_WINDOW_MINUTES = 20;
const selectedServiceIds = new Set(new URLSearchParams(window.location.search).getAll('serviceIds'));

const elements = {
  topActions: document.querySelector('.top-actions'),
  galleryBadge: document.querySelector('#galleryBadge'),
  lotName: document.querySelector('#lotName'),
  lotAddress: document.querySelector('#lotAddress'),
  lotDescription: document.querySelector('#lotDescription'),
  lotStatus: document.querySelector('#lotStatus'),
  lotCoordinates: document.querySelector('#lotCoordinates'),
  bookingLotName: document.querySelector('#bookingLotName'),
  bookingAddress: document.querySelector('#bookingAddress'),
  bookingMeta: document.querySelector('#bookingMeta'),
  summaryStatus: document.querySelector('#summaryStatus'),
  summaryCoordinates: document.querySelector('#summaryCoordinates'),
  summaryRate: document.querySelector('#summaryRate'),
  baseHourlyRate: document.querySelector('#baseHourlyRate'),
  pricingRulesBody: document.querySelector('#pricingRulesBody'),
  amenityGrid: document.querySelector('#amenityGrid'),
  reviewAverage: document.querySelector('#reviewAverage'),
  reviewStars: document.querySelector('#reviewStars'),
  reviewCount: document.querySelector('#reviewCount'),
  reviewList: document.querySelector('#reviewList'),
  bookingServiceOptions: document.querySelector('#bookingServiceOptions'),
  bookingVehicleId: document.querySelector('#bookingVehicleId'),
  detailSpotHint: document.querySelector('#detailSpotHint'),
  bookingCheckIn: document.querySelector('#bookingCheckIn'),
  bookingCheckOut: document.querySelector('#bookingCheckOut'),
  bookingCheckInDate: document.querySelector('#bookingCheckInDate'),
  bookingCheckInTime: document.querySelector('#bookingCheckInTime'),
  bookingCheckOutDate: document.querySelector('#bookingCheckOutDate'),
  bookingCheckOutTime: document.querySelector('#bookingCheckOutTime'),
  bookingPickerTriggers: document.querySelectorAll('[data-booking-picker-trigger]'),
  bookingPickerPopovers: document.querySelectorAll('[data-booking-picker-popover]'),
  bookButton: document.querySelector('#bookButton'),
  directionsButton: document.querySelector('#directionsButton'),
};

const accountMenuIcons = {
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17ZM7.5 4A.5.5 0 0 0 7 4.5V17.1c.2-.1.3-.1.5-.1H18V4H7.5ZM4 4h1v18H4V4Z" /></svg>',
  dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 20h7v-5H4v5Z" /></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h9v2H6v14h7v2H4V3Zm12.6 5.4L20.2 12l-3.6 3.6-1.4-1.4 1.2-1.2H10v-2h6.4l-1.2-1.2 1.4-1.4Z" /></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.1-8 5v1h16v-1c0-2.9-3.6-5-8-5Z" /></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8.5 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM8 13c-3.3 0-6 1.7-6 3.8V20h12v-3.2C14 14.7 11.3 13 8 13Zm8.5 1c-.9 0-1.8.2-2.6.5a4 4 0 0 1 2.1 3.4V20h6v-2.6c0-1.9-2.5-3.4-5.5-3.4Z" /></svg>',
  vehicles: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h1a2 2 0 0 1 2 2v5h-2v-2H4v2H2v-5a2 2 0 0 1 2-2h1Zm2.1 0h9.8l-1.1-3.2a.8.8 0 0 0-.8-.6H9a.8.8 0 0 0-.8.6L7.1 11ZM6 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm12 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" /></svg>',
};

function getAccountContact(account) {
  return account?.email || account?.phone || 'Email not updated';
}

function getAccountDisplayName(account) {
  const label = account?.fullName
    || account?.name
    || account?.displayName
    || account?.email?.replace(/@.*/, '')
    || account?.phone
    || 'Customer';

  return String(label)
    .split(/[._-]+/)
    .filter(Boolean)
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(' ');
}

function getAccountInitials(account) {
  const label = getAccountDisplayName(account).replace(/@.*/, '');
  const pieces = label.split(/[.\-_\s]+/).filter(Boolean);
  const initials = pieces.length > 1 ? `${pieces[0][0]}${pieces[1][0]}` : label.slice(0, 2);
  return initials.toUpperCase();
}

function getAccountMenuItems(account) {
  if (account?.role === 'ADMIN') {
    return [
      { href: '/admin-users.html', icon: accountMenuIcons.dashboard, label: 'User Management' },
      { href: '/admin-staff.html', icon: accountMenuIcons.users, label: 'Staff Management' },
      { href: '/admin-bookings.html', icon: accountMenuIcons.book, label: 'Bookings' },
    ];
  }

  if (account?.role === 'STAFF') {
    return [
      { href: '/staff.html', icon: accountMenuIcons.dashboard, label: 'Staff Dashboard' },
      { href: '/staff-parking-lots.html', icon: accountMenuIcons.vehicles, label: 'My Parking Lot' },
      { href: '/staff-bookings.html', icon: accountMenuIcons.book, label: 'Bookings' },
    ];
  }

  return [
    { href: '/customer.html', icon: accountMenuIcons.dashboard, label: 'Active Bookings' },
    { href: '/customer-vehicles.html', icon: accountMenuIcons.vehicles, label: 'Vehicles' },
    { href: '/customer-profile.html', icon: accountMenuIcons.user, label: 'My Profile' },
  ];
}

function renderSignedInHeader(account) {
  if (!elements.topActions) {
    return;
  }

  const accountName = getAccountDisplayName(account);
  const accountContact = getAccountContact(account);
  const initials = getAccountInitials(account);
  const menuItems = getAccountMenuItems(account);

  elements.topActions.innerHTML = `
    <div class="account-menu" data-account-menu>
      <button class="account-menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false" data-account-menu-trigger>
        <span class="account-avatar" aria-hidden="true">${escapeHtml(initials)}</span>
      </button>

      <div class="account-menu-content" role="menu" aria-hidden="true" data-account-menu-content>
        <div class="account-menu-label">
          <span class="account-avatar large" aria-hidden="true">${escapeHtml(initials)}</span>
          <span>
            <strong>${escapeHtml(accountName)}</strong>
            <small>${escapeHtml(accountContact)}</small>
          </span>
        </div>
        <hr />
        ${menuItems.map((item) => `<a class="account-menu-item" role="menuitem" href="${item.href}">${item.icon}<span>${escapeHtml(item.label)}</span></a>`).join('')}
        <hr />
        <button class="account-menu-item destructive" type="button" role="menuitem" data-action="logout">${accountMenuIcons.logout}<span>Log out</span></button>
      </div>
    </div>
  `;

  const menu = elements.topActions.querySelector('[data-account-menu]');
  const trigger = elements.topActions.querySelector('[data-account-menu-trigger]');
  const content = elements.topActions.querySelector('[data-account-menu-content]');

  const setOpen = (open) => {
    menu?.classList.toggle('open', open);
    trigger?.setAttribute('aria-expanded', open ? 'true' : 'false');
    content?.setAttribute('aria-hidden', open ? 'false' : 'true');
  };

  const closeOnOutsideClick = (event) => {
    if (!menu?.contains(event.target)) {
      setOpen(false);
      document.removeEventListener('click', closeOnOutsideClick);
    }
  };

  trigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = !menu?.classList.contains('open');
    setOpen(open);
    if (open) {
      window.setTimeout(() => document.addEventListener('click', closeOnOutsideClick), 0);
    } else {
      document.removeEventListener('click', closeOnOutsideClick);
    }
  });

  content?.addEventListener('click', (event) => {
    if (!event.target.closest('[data-action="logout"]')) {
      setOpen(false);
    }
  });

  elements.topActions.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
    clearSession();
    window.location.href = '/auth.html';
  });
}

async function hydrateDetailAuth() {
  const storedAccount = getStoredAccount();

  if (!storedAccount) {
    return;
  }

  renderSignedInHeader(storedAccount);

  try {
    const currentAccount = await apiRequest('/auth/me');
    let hydratedAccount = currentAccount;

    if (currentAccount.role === 'CUSTOMER') {
      try {
        const customerProfile = await apiRequest('/customers/me');
        hydratedAccount = {
          ...currentAccount,
          ...customerProfile,
          role: currentAccount.role,
          status: currentAccount.status,
        };
      } catch (profileError) {
        hydratedAccount = currentAccount;
      }
    }

    saveSession({ account: hydratedAccount });
    renderSignedInHeader(hydratedAccount);
  } catch (error) {
    // Keep the local session visible if the backend is temporarily unavailable.
  }
}

function getLotId() {
  return new URLSearchParams(window.location.search).get('id');
}

function parseCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasCoordinates(lot) {
  return parseCoordinate(lot?.latitude) !== null && parseCoordinate(lot?.longitude) !== null;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getQueryDate(name) {
  const value = new URLSearchParams(window.location.search).get(name);
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDatetimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateInputValue(date) {
  return toDatetimeLocalValue(date).slice(0, 10);
}

function toTimeInputValue(date) {
  return toDatetimeLocalValue(date).slice(11, 16);
}

function combineDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return '';
  }

  return `${dateValue}T${timeValue}`;
}

function selectedValue(kind) {
  return kind === 'checkin'
    ? combineDateTime(elements.bookingCheckInDate?.value, elements.bookingCheckInTime?.value)
    : combineDateTime(elements.bookingCheckOutDate?.value, elements.bookingCheckOutTime?.value);
}

function bookingHoldWindow() {
  const start = new Date();
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + CHECK_IN_WINDOW_MINUTES);
  return { start, end };
}

function selectedDate(kind) {
  const selected = parseLocalDatetime(selectedValue(kind));
  if (selected) {
    return selected;
  }

  const hold = bookingHoldWindow();
  return kind === 'checkin' ? hold.start : hold.end;
}

function setPickerValue(kind, date) {
  if (kind === 'checkin') {
    if (elements.bookingCheckInDate) {
      elements.bookingCheckInDate.value = toDateInputValue(date);
    }
    if (elements.bookingCheckInTime) {
      elements.bookingCheckInTime.value = toTimeInputValue(date);
    }
    return;
  }

  if (elements.bookingCheckOutDate) {
    elements.bookingCheckOutDate.value = toDateInputValue(date);
  }
  if (elements.bookingCheckOutTime) {
    elements.bookingCheckOutTime.value = toTimeInputValue(date);
  }
}

function parseLocalDatetime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatBookingDateTime(value) {
  const date = value instanceof Date ? value : parseLocalDatetime(value);

  if (!date) {
    return '-';
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (left, right) =>
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();

  const dayLabel = sameDay(date, today)
    ? 'Today'
    : sameDay(date, tomorrow)
      ? 'Tomorrow'
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return `${dayLabel}, ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function formatCoordinates(lot) {
  return hasCoordinates(lot)
    ? `${Number(lot.latitude).toFixed(6)}, ${Number(lot.longitude).toFixed(6)}`
    : 'Not provided';
}

function formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 'Contact';
  }

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(number) + ' VND';
}

function formatCurrencyAmount(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 'Contact';
  }

  return new Intl.NumberFormat('en-US', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(number);
}

function formatHourlyRate(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return 'Contact';
  }

  return `${formatMoney(number)} / hour`;
}

function selectedBookingVehicle() {
  const vehicleId = elements.bookingVehicleId?.value;
  return customerVehicles.find((vehicle) => String(vehicle.id) === String(vehicleId)) || null;
}

function selectedBookingVehicleType() {
  const optionType = elements.bookingVehicleId?.selectedOptions?.[0]?.dataset.vehicleType;
  const queryType = new URLSearchParams(window.location.search).get('vehicleType');
  return selectedBookingVehicle()?.vehicleType || optionType || queryType || 'CAR';
}

function getHourlyRateForDate(lot, date, vehicleType = selectedBookingVehicleType()) {
  const fallbackRate = Number(lot?.hourlyRate);
  const rules = getActivePricingRules(lot, vehicleType);
  const matchingRule = date ? rules.find((rule) => ruleAppliesAt(rule, date)) : null;
  const ruleRate = Number(matchingRule?.hourlyRate);

  if (Number.isFinite(ruleRate) && ruleRate > 0) {
    return ruleRate;
  }

  return Number.isFinite(fallbackRate) && fallbackRate > 0 ? fallbackRate : null;
}

function renderBaseHourlyRate(lot = currentLot) {
  if (!elements.baseHourlyRate) {
    return;
  }

  const vehicleType = selectedBookingVehicleType();
  const number = getHourlyRateForDate(lot, selectedDate('checkin'), vehicleType);

  if (!Number.isFinite(number) || number <= 0) {
    elements.baseHourlyRate.innerHTML = `Contact<small>for ${escapeHtml(formatVehicleType(vehicleType))}</small>`;
    return;
  }

  elements.baseHourlyRate.innerHTML = `${escapeHtml(formatMoney(number))}<small>/hour for ${escapeHtml(formatVehicleType(vehicleType))}</small>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatVehicleType(value) {
  const labels = {
    CAR: 'Car',
    ELECTRIC_CAR: 'Electric car',
    MOTORBIKE: 'Motorbike',
    BIKE: 'Bike',
  };

  return labels[value] || String(value || 'Vehicle').replace(/_/g, ' ').toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);

  if (!match) {
    return text || '--:--';
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function formatTimeRange(startTime, endTime) {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function normalizeServiceLabel(value) {
  const name = String(value || '').trim();
  const normalized = name.toLowerCase().replace(/\s+/g, ' ');

  if (!name) {
    return '';
  }

  if (normalized.includes('ev') || normalized.includes('electric')) {
    return 'EV Charging';
  }

  if (normalized.includes('camera') || normalized.includes('security') || normalized.includes('cctv')) {
    return 'Camera / Security';
  }

  if (normalized.includes('wash')) {
    return 'Car Wash';
  }

  if (normalized.includes('valet')) {
    return 'Valet';
  }

  if (normalized.includes('24') || normalized.includes('access')) {
    return '24/7 Access';
  }

  return name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isPaidSelectableService(service) {
  const label = normalizeServiceLabel(service?.name).toLowerCase();
  return Object.prototype.hasOwnProperty.call(PAID_SERVICE_PRICES, label);
}

function serviceDisplayPrice(service) {
  const label = normalizeServiceLabel(service?.name).toLowerCase();
  const configuredPrice = PAID_SERVICE_PRICES[label];
  return Number.isFinite(configuredPrice) ? configuredPrice : Number(service?.price || 0);
}

function uniqueServicesByLabel(services = []) {
  const byLabel = new Map();

  services.forEach((service) => {
    const label = normalizeServiceLabel(service.name);
    const key = label.toLowerCase();

    if (!key) {
      return;
    }

    const normalizedService = {
      ...service,
      label,
      displayPrice: serviceDisplayPrice(service),
    };
    const current = byLabel.get(key);

    if (!current || selectedServiceIds.has(String(service.id))) {
      byLabel.set(key, normalizedService);
    }
  });

  return [...byLabel.values()];
}

function getSelectedServiceIds() {
  return [...selectedServiceIds].filter(Boolean);
}

function getRuleMinute(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getDateMinute(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function getActivePricingRules(lot, vehicleType = selectedBookingVehicleType()) {
  const rules = Array.isArray(lot?.pricingRules) ? lot.pricingRules : [];
  const activeRules = rules.filter((rule) => rule.active !== false);
  const vehicleRules = activeRules.filter((rule) => rule.vehicleType === vehicleType);
  const sharedRules = activeRules.filter((rule) => !rule.vehicleType);

  return vehicleRules.length ? vehicleRules : sharedRules.length ? sharedRules : activeRules;
}

function ruleAppliesAt(rule, date) {
  const start = getRuleMinute(rule.startTime);
  const end = getRuleMinute(rule.endTime);
  const current = getDateMinute(date);

  if (start === null || end === null) {
    return false;
  }

  if (start === end) {
    return true;
  }

  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}

function normalizeLot(lot) {
  return {
    ...lot,
    capacities: Array.isArray(lot.capacities) ? lot.capacities : [],
    pricingRules: Array.isArray(lot.pricingRules) ? lot.pricingRules : [],
    reviews: Array.isArray(lot.reviews) ? lot.reviews : [],
    services: Array.isArray(lot.services) ? lot.services : [],
    latitude: parseCoordinate(lot.latitude),
    longitude: parseCoordinate(lot.longitude),
    name: lot.name || 'Unnamed parking lot',
    address: lot.address || 'Address not available',
    status: lot.status || '-',
    hourlyRate: Number(lot.hourlyRate),
    description: lot.description || 'This parking lot is available in the ParkFinder network. Public backend data currently includes identity, address, coordinates, status, version, and update time.',
  };
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setBookButtonState(label, disabled = false) {
  if (!elements.bookButton) {
    return;
  }

  elements.bookButton.disabled = disabled;
  elements.bookButton.classList.toggle('disabled', disabled);
  const textNode = [...elements.bookButton.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.textContent = ` ${label} `;
  } else {
    elements.bookButton.prepend(document.createTextNode(` ${label} `));
  }
}

function getCapacitySummary(capacities = []) {
  const activeCapacities = capacities.filter((capacity) => Number(capacity.totalCapacity) > 0);
  const total = activeCapacities.reduce((sum, capacity) => sum + Number(capacity.totalCapacity || 0), 0);
  const available = activeCapacities.reduce((sum, capacity) => sum + Number(capacity.available || 0), 0);

  return { available, hasCapacity: total > 0, total };
}

function getCapacitySummaryForVehicle(capacities = [], vehicleType = selectedBookingVehicleType()) {
  const capacity = capacities.find((item) => item.vehicleType === vehicleType);

  if (!capacity || Number(capacity.totalCapacity) <= 0) {
    return { available: 0, hasCapacity: false, total: 0 };
  }

  return {
    available: Number(capacity.available || 0),
    hasCapacity: true,
    total: Number(capacity.totalCapacity || 0),
  };
}

function renderPricingRules(pricingRules = [], fallbackRate) {
  if (!elements.pricingRulesBody) {
    return;
  }

  const activeRules = pricingRules.filter((rule) => rule.active !== false);
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
    elements.pricingRulesBody.innerHTML = `
      <div class="empty-state">Base rate: ${escapeHtml(formatHourlyRate(fallbackRate))}</div>
    `;
    return;
  }

  elements.pricingRulesBody.innerHTML = vehicleGroups.map(([vehicleType, vehicleLabel]) => `
    <div class="staff-rate-group-card">
      <div class="staff-rate-group-title">
        <strong>${escapeHtml(vehicleLabel)}</strong>
        <span>${escapeHtml(formatVehicleType(vehicleType))} hourly pricing</span>
      </div>
      <div class="staff-rate-group-list">
        ${rateSlots.map(([slotClass, slotLabel, startTime, endTime]) => {
          const rule = ruleFor(vehicleType, startTime, endTime);

          return `
            <div class="staff-rate-row compact">
              <div>
                <span class="material-symbols-outlined staff-rate-icon ${slotClass}" aria-hidden="true">${slotClass === 'day' ? 'light_mode' : slotClass === 'evening' ? 'wb_twilight' : 'dark_mode'}</span>
                <div>
                  <strong>${escapeHtml(slotLabel)}</strong>
                  <small>${escapeHtml(formatTimeRange(startTime, endTime))}</small>
                </div>
              </div>
              <p>${rule ? escapeHtml(formatCurrencyAmount(rule.hourlyRate)) : '-'}${rule ? '<span>/hr</span>' : ''}</p>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function renderSpotHint(capacities = []) {
  const vehicleType = selectedBookingVehicleType();
  const { available, hasCapacity, total } = getCapacitySummaryForVehicle(capacities, vehicleType);

  setText(
    elements.detailSpotHint,
    hasCapacity
      ? `${available} / ${total} ${formatVehicleType(vehicleType).toLowerCase()} slots available`
      : `${formatVehicleType(vehicleType)} capacity not configured`,
  );
}

function renderSlotStatusPill(capacities = []) {
  if (!elements.galleryBadge) {
    return;
  }

  const { available, hasCapacity } = getCapacitySummary(capacities);
  const isFull = hasCapacity && available <= 0;

  setText(elements.galleryBadge, !hasCapacity ? 'Unknown' : isFull ? 'Full' : 'Available');
  elements.galleryBadge.classList.toggle('full', isFull);
  elements.galleryBadge.classList.toggle('unknown', !hasCapacity);
}

function renderServices(services = []) {
  if (!elements.amenityGrid) {
    return;
  }

  const activeServices = services
    .filter((service) => service.active !== false)
    .map((service) => ({
      ...service,
      label: normalizeServiceLabel(service.name),
    }))
    .filter((service) => service.label);
  const amenityServices = activeServices.filter((service) => !isPaidSelectableService(service));

  if (!amenityServices.length) {
    elements.amenityGrid.innerHTML = '<div class="amenity-item">No amenities configured yet</div>';
    return;
  }

  elements.amenityGrid.innerHTML = amenityServices.map((service) => `
    <div class="amenity-item">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm4.4 7.4-5.1 5.1-2.7-2.7L7.2 13.2l4.1 4.1 6.5-6.5-1.4-1.4Z" />
      </svg>
      <span>${escapeHtml(service.label)}</span>
    </div>
  `).join('');
}

function renderBookingServices(services = []) {
  if (!elements.bookingServiceOptions) {
    return;
  }

  const paidServices = services
    .filter((service) => service.active !== false)
    .filter(isPaidSelectableService);
  const uniquePaidServices = uniqueServicesByLabel(paidServices);
  const visibleServiceIds = new Set(uniquePaidServices.map((service) => String(service.id)));

  paidServices.forEach((service) => {
    if (!visibleServiceIds.has(String(service.id))) {
      selectedServiceIds.delete(String(service.id));
    }
  });

  if (!uniquePaidServices.length) {
    elements.bookingServiceOptions.innerHTML = '<div class="booking-service-empty">No paid services available</div>';
    return;
  }

  elements.bookingServiceOptions.innerHTML = uniquePaidServices.map((service) => `
    <label class="booking-service-option ${selectedServiceIds.has(String(service.id)) ? 'active' : ''}">
      <input type="checkbox" name="bookingServiceIds" value="${escapeHtml(service.id)}" ${selectedServiceIds.has(String(service.id)) ? 'checked' : ''} />
      <span>
        <strong>${escapeHtml(service.label)}</strong>
        <small>Optional service</small>
      </span>
      <b>${escapeHtml(formatMoney(service.displayPrice))}</b>
    </label>
  `).join('');

  elements.bookingServiceOptions.querySelectorAll('input[name="bookingServiceIds"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) {
        selectedServiceIds.add(input.value);
      } else {
        selectedServiceIds.delete(input.value);
      }
      input.closest('.booking-service-option')?.classList.toggle('active', input.checked);
    });
  });
}

function reviewStars(rating) {
  const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return '★'.repeat(value) + '☆'.repeat(5 - value);
}

function renderReviews(reviews = []) {
  if (!elements.reviewList) {
    return;
  }

  const validReviews = reviews.filter((review) => Number(review.rating) > 0);
  const average = validReviews.length
    ? validReviews.reduce((total, review) => total + Number(review.rating), 0) / validReviews.length
    : 0;

  setText(elements.reviewAverage, validReviews.length ? average.toFixed(1) : '-');
  setText(elements.reviewStars, validReviews.length ? reviewStars(average) : '-----');
  setText(elements.reviewCount, validReviews.length ? `${validReviews.length} review${validReviews.length === 1 ? '' : 's'}` : 'No reviews yet');

  if (!validReviews.length) {
    elements.reviewList.innerHTML = `
      <article>
        <div><strong>No customer reviews yet</strong><span>New parking lot</span></div>
        <p>Completed customer reviews will appear here after payment is confirmed.</p>
      </article>
    `;
    return;
  }

  elements.reviewList.innerHTML = validReviews.slice(0, 6).map((review) => `
    <article>
      <div>
        <strong>${escapeHtml(review.customerName || 'Customer')}</strong>
        <span>${escapeHtml(reviewStars(review.rating))}</span>
      </div>
      <p>${escapeHtml(review.content || 'No written comment.')}</p>
    </article>
  `).join('');
}

async function loadCustomerVehicles() {
  if (!elements.bookingVehicleId) {
    return;
  }

  try {
    const vehicles = await apiRequest('/customer/vehicles');
    const activeVehicles = vehicles.filter((vehicle) => vehicle.status !== 'INACTIVE');
    customerVehicles = activeVehicles;

    if (!activeVehicles.length) {
      elements.bookingVehicleId.innerHTML = '<option value="">No active vehicles found</option>';
      setBookButtonState('Add a vehicle first', true);
      renderBaseHourlyRate();
      renderSpotHint(currentLot?.capacities || []);
      return;
    }

    elements.bookingVehicleId.innerHTML = activeVehicles.map((vehicle) => `
      <option value="${escapeHtml(vehicle.id)}" data-vehicle-type="${escapeHtml(vehicle.vehicleType)}" ${vehicle.defaultVehicle ? 'selected' : ''}>
        ${escapeHtml(vehicle.plateNumber || 'No plate')} - ${escapeHtml(formatVehicleType(vehicle.vehicleType))}
      </option>
    `).join('');
    setBookButtonState('Book Now');
    renderBaseHourlyRate();
    renderSpotHint(currentLot?.capacities || []);
  } catch (error) {
    customerVehicles = [];
    elements.bookingVehicleId.innerHTML = '<option value="">Sign in to load vehicles</option>';
    setBookButtonState('Sign in to book');
    renderBaseHourlyRate();
    renderSpotHint(currentLot?.capacities || []);
  }
}

function buildDirectBookingRequest() {
  const hold = bookingHoldWindow();
  return {
    parkingLotId: currentLot?.id,
    vehicleId: elements.bookingVehicleId?.value || '',
    startTime: hold.start.toISOString(),
    endTime: hold.end.toISOString(),
    deliveryMethod: 'SELF_DROP_OFF',
    serviceIds: getSelectedServiceIds(),
    promotionCode: null,
    paymentMethod: 'QR',
  };
}

function renderDetail(lot, mode = 'Online') {
  currentLot = normalizeLot(lot);
  const coordinates = formatCoordinates(currentLot);
  const hourlyRate = formatHourlyRate(currentLot.hourlyRate);

  setText(elements.lotName, currentLot.name);
  setText(elements.lotAddress, currentLot.address);
  setText(elements.lotDescription, currentLot.description);
  setText(elements.lotStatus, currentLot.status);
  setText(elements.lotCoordinates, coordinates);
  setText(elements.bookingLotName, currentLot.name);
  setText(elements.bookingAddress, currentLot.address);
  setText(elements.summaryStatus, currentLot.status);
  setText(elements.summaryCoordinates, coordinates);
  setText(elements.summaryRate, hourlyRate);
  renderBaseHourlyRate(currentLot);
  renderPricingRules(currentLot.pricingRules, currentLot.hourlyRate);
  renderSpotHint(currentLot.capacities);
  renderSlotStatusPill(currentLot.capacities);
  renderServices(currentLot.services);
  renderBookingServices(currentLot.services);
  renderReviews(currentLot.reviews);
  setText(elements.bookingMeta, mode);

}

function refreshBookingTimeLabels() {
  setText(elements.bookingCheckIn, formatBookingDateTime(selectedDate('checkin')));
  setText(elements.bookingCheckOut, formatBookingDateTime(selectedDate('checkout')));
  renderBaseHourlyRate(currentLot);
}

function refreshBookingVehiclePricing() {
  renderBaseHourlyRate(currentLot);
  renderSpotHint(currentLot?.capacities || []);
}

function closeBookingPickers(except) {
  elements.bookingPickerPopovers.forEach((popover) => {
    const key = popover.dataset.bookingPickerPopover;
    popover.classList.toggle('open', Boolean(except && key === except));
  });

  elements.bookingPickerTriggers.forEach((trigger) => {
    const key = trigger.dataset.bookingPickerTrigger;
    trigger.classList.toggle('active', Boolean(except && key === except));
  });
}

function setupBookingDateTimeInputs() {
  const fields = [
    elements.bookingCheckInDate,
    elements.bookingCheckInTime,
    elements.bookingCheckOutDate,
    elements.bookingCheckOutTime,
  ];

  if (fields.some((field) => !field)) {
    return;
  }

  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);

  const later = new Date(now);
  later.setHours(later.getHours() + 4);

  const queryCheckIn = getQueryDate('startTime');
  const queryCheckOut = getQueryDate('endTime');

  setPickerValue('checkin', queryCheckIn || now);
  setPickerValue('checkout', queryCheckOut && (!queryCheckIn || queryCheckOut > queryCheckIn) ? queryCheckOut : later);

  elements.bookingPickerTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const key = trigger.dataset.bookingPickerTrigger;
      const popover = document.querySelector(`[data-booking-picker-popover="${key}"]`);
      const shouldOpen = !popover?.classList.contains('open');
      closeBookingPickers(shouldOpen ? key : null);

      if (shouldOpen) {
        popover?.querySelector('input')?.focus();
      }
    });
  });

  elements.bookingPickerPopovers.forEach((popover) => {
    popover.addEventListener('click', (event) => event.stopPropagation());
  });

  const handleChange = (kind) => {
    const checkIn = selectedDate('checkin');
    const checkOut = selectedDate('checkout');

    if (kind === 'checkin' && checkIn && (!checkOut || checkOut <= checkIn)) {
      const nextCheckOut = new Date(checkIn);
      nextCheckOut.setHours(nextCheckOut.getHours() + 4);
      setPickerValue('checkout', nextCheckOut);
    }

    if (kind === 'checkout' && checkIn && (!checkOut || checkOut <= checkIn)) {
      const nextCheckOut = new Date(checkIn);
      nextCheckOut.setHours(nextCheckOut.getHours() + 1);
      setPickerValue('checkout', nextCheckOut);
    }

    refreshBookingTimeLabels();
  };

  elements.bookingCheckInDate.addEventListener('change', () => handleChange('checkin'));
  elements.bookingCheckInTime.addEventListener('change', () => handleChange('checkin'));
  elements.bookingCheckOutDate.addEventListener('change', () => handleChange('checkout'));
  elements.bookingCheckOutTime.addEventListener('change', () => handleChange('checkout'));
  document.addEventListener('click', () => closeBookingPickers(null));

  refreshBookingTimeLabels();
}

async function loadPublicLotConfig(lot) {
  if (!lot?.id) {
    return lot;
  }

  const [detail, capacities, pricingRules, services, reviewPage] = await Promise.all([
    getParkingLotDetail(lot.id).catch(() => lot),
    getParkingLotCapacities(lot.id).catch(() => []),
    getParkingLotPricingRules(lot.id).catch(() => []),
    getParkingLotServices(lot.id).catch(() => []),
    getParkingLotReviews(lot.id, { size: 20 }).catch(() => ({ items: [] })),
  ]);

  return {
    ...lot,
    ...detail,
    capacities,
    pricingRules,
    reviews: reviewPage.items || [],
    services,
  };
}

async function loadDetail() {
  const id = getLotId();

  if (id && !id.startsWith('sample-')) {
    const lot = await loadPublicLotConfig({ id });
    renderDetail(lot, 'Public detail');
    return;
  }

  if (!id) {
    try {
      const page = await searchParkingLots({ size: 1 });
      if (page.items[0]) {
        const lot = await loadPublicLotConfig(page.items[0]);
        renderDetail(lot, 'Public detail');
        return;
      }
    } catch (error) {
      // Fall through to preview data when the public list endpoint is unavailable.
    }
  }

  renderDetail(previewLot, 'Preview data');
}

function bindActions() {
  setupBookingDateTimeInputs();

  elements.bookingVehicleId?.addEventListener('change', refreshBookingVehiclePricing);

  elements.bookButton?.addEventListener('click', async () => {
    if (!elements.bookingVehicleId?.value) {
      window.location.href = '/auth.html';
      return;
    }

    if (!currentLot?.id || String(currentLot.id).startsWith('sample-')) {
      setBookButtonState('Open a real parking lot', false);
      return;
    }

    setBookButtonState('Creating...', true);

    try {
      const booking = await apiRequest('/customer/bookings', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}` },
        body: jsonBody(buildDirectBookingRequest()),
      });
      setBookButtonState(`Booked ${booking.bookingCode || ''}`, true);
      window.setTimeout(() => {
        window.location.href = '/customer.html';
      }, 900);
    } catch (error) {
      setBookButtonState(error.message || 'Booking failed', false);
    }
  });

  elements.directionsButton?.addEventListener('click', () => {
    if (hasCoordinates(currentLot)) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${currentLot.latitude},${currentLot.longitude}`, '_blank');
      return;
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentLot?.address || 'parking')}`, '_blank');
  });
}

hydrateDetailAuth();
bindActions();
loadDetail()
  .then(loadCustomerVehicles)
  .catch((error) => {
    renderDetail(previewLot, 'Preview data');
    loadCustomerVehicles();
  });
