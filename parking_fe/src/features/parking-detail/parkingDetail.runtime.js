import {
  getParkingLotCapacities,
  getParkingLotDetail,
  getParkingLotPricingRules,
  getParkingLotServices,
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

const elements = {
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
  detailSpotHint: document.querySelector('#detailSpotHint'),
  bookingCheckIn: document.querySelector('#bookingCheckIn'),
  bookingCheckOut: document.querySelector('#bookingCheckOut'),
  bookingCheckInDate: document.querySelector('#bookingCheckInDate'),
  bookingCheckInTime: document.querySelector('#bookingCheckInTime'),
  bookingCheckOutDate: document.querySelector('#bookingCheckOutDate'),
  bookingCheckOutTime: document.querySelector('#bookingCheckOutTime'),
  bookingPickerTriggers: document.querySelectorAll('[data-booking-picker-trigger]'),
  bookingPickerPopovers: document.querySelectorAll('[data-booking-picker-popover]'),
  bookingParkingFeeLabel: document.querySelector('#bookingParkingFeeLabel'),
  bookingParkingFee: document.querySelector('#bookingParkingFee'),
  bookingServiceFee: document.querySelector('#bookingServiceFee'),
  bookingDiscount: document.querySelector('#bookingDiscount'),
  bookingTax: document.querySelector('#bookingTax'),
  bookingTotal: document.querySelector('#bookingTotal'),
  bookButton: document.querySelector('#bookButton'),
  directionsButton: document.querySelector('#directionsButton'),
};

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

function selectedDate(kind) {
  return parseLocalDatetime(selectedValue(kind));
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

function formatHourlyRate(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return 'Contact';
  }

  return `${formatMoney(number)} / hour`;
}

function getHourlyRateForDate(lot, date) {
  const fallbackRate = Number(lot?.hourlyRate);
  const rules = getActiveCarPricingRules(lot);
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

  const number = getHourlyRateForDate(lot, selectedDate('checkin'));

  if (!Number.isFinite(number) || number <= 0) {
    elements.baseHourlyRate.textContent = 'Contact';
    return;
  }

  elements.baseHourlyRate.innerHTML = `${escapeHtml(formatMoney(number))}<small>/hour</small>`;
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

function getSelectedDurationHours() {
  const checkIn = selectedDate('checkin');
  const checkOut = selectedDate('checkout');

  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return 4;
  }

  const hours = (checkOut.getTime() - checkIn.getTime()) / 36e5;
  return Math.max(0.5, hours);
}

function formatDuration(hours) {
  return Number.isInteger(hours)
    ? `${hours} hrs`
    : `${hours.toFixed(1)} hrs`;
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

function getActiveCarPricingRules(lot) {
  const rules = Array.isArray(lot?.pricingRules) ? lot.pricingRules : [];
  const carRules = rules.filter((rule) => rule.active !== false && (!rule.vehicleType || rule.vehicleType === 'CAR'));

  return carRules.length ? carRules : rules.filter((rule) => rule.active !== false);
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

function nextPricingBoundary(cursor, rules) {
  const boundaries = rules
    .flatMap((rule) => [getRuleMinute(rule.startTime), getRuleMinute(rule.endTime)])
    .filter((minute) => minute !== null);

  if (!boundaries.length) {
    return null;
  }

  return boundaries.reduce((nearest, minute) => {
    const candidate = new Date(cursor);
    candidate.setHours(Math.floor(minute / 60), minute % 60, 0, 0);

    if (candidate <= cursor) {
      candidate.setDate(candidate.getDate() + 1);
    }

    return !nearest || candidate < nearest ? candidate : nearest;
  }, null);
}

function calculateParkingFeeByRules(lot, checkIn, checkOut) {
  const fallbackRate = Number(lot?.hourlyRate);
  const rules = getActiveCarPricingRules(lot);

  if (!checkIn || !checkOut || checkOut <= checkIn || !Number.isFinite(fallbackRate) || fallbackRate <= 0) {
    return null;
  }

  if (!rules.length) {
    return fallbackRate * getSelectedDurationHours();
  }

  let fee = 0;
  let cursor = new Date(checkIn);

  while (cursor < checkOut) {
    const rule = rules.find((candidate) => ruleAppliesAt(candidate, cursor));
    const rate = Number(rule?.hourlyRate || fallbackRate);
    const boundary = nextPricingBoundary(cursor, rules);
    let segmentEnd = boundary && boundary < checkOut ? boundary : checkOut;

    if (segmentEnd <= cursor) {
      segmentEnd = checkOut;
    }

    const segmentHours = (segmentEnd.getTime() - cursor.getTime()) / 36e5;
    fee += rate * segmentHours;
    cursor = segmentEnd;
  }

  return fee;
}

function renderBookingBreakdown(lot = currentLot) {
  const checkIn = selectedDate('checkin');
  const checkOut = selectedDate('checkout');
  const durationHours = getSelectedDurationHours();
  const parkingFee = calculateParkingFeeByRules(lot, checkIn, checkOut);

  if (!Number.isFinite(parkingFee)) {
    setText(elements.bookingParkingFeeLabel, `Parking Fee (${formatDuration(durationHours)})`);
    setText(elements.bookingParkingFee, 'Contact');
    setText(elements.bookingServiceFee, 'Contact');
    setText(elements.bookingDiscount, 'Contact');
    setText(elements.bookingTax, 'Contact');
    setText(elements.bookingTotal, 'Contact');
    return;
  }

  const serviceFee = 0;
  const discount = 0;
  const tax = 0;
  const total = parkingFee + serviceFee + tax - discount;

  setText(elements.bookingParkingFeeLabel, `Parking Fee (${formatDuration(durationHours)})`);
  setText(elements.bookingParkingFee, formatMoney(parkingFee));
  setText(elements.bookingServiceFee, formatMoney(serviceFee));
  setText(elements.bookingDiscount, `-${formatMoney(discount)}`);
  setText(elements.bookingTax, formatMoney(tax));
  setText(elements.bookingTotal, formatMoney(total));
}

function normalizeLot(lot) {
  return {
    ...lot,
    capacities: Array.isArray(lot.capacities) ? lot.capacities : [],
    pricingRules: Array.isArray(lot.pricingRules) ? lot.pricingRules : [],
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

function getCapacitySummary(capacities = []) {
  const activeCapacities = capacities.filter((capacity) => Number(capacity.totalCapacity) > 0);
  const total = activeCapacities.reduce((sum, capacity) => sum + Number(capacity.totalCapacity || 0), 0);
  const available = activeCapacities.reduce((sum, capacity) => sum + Number(capacity.available || 0), 0);

  return { available, hasCapacity: total > 0, total };
}

function renderPricingRules(pricingRules = [], fallbackRate) {
  if (!elements.pricingRulesBody) {
    return;
  }

  const activeRules = pricingRules
    .filter((rule) => rule.active !== false)
    .slice()
    .sort((first, second) => {
      const vehicleOrder = String(first.vehicleType || '').localeCompare(String(second.vehicleType || ''));
      return vehicleOrder || String(first.startTime || '').localeCompare(String(second.startTime || ''));
    });

  if (!activeRules.length) {
    elements.pricingRulesBody.innerHTML = `
      <tr>
        <td>Base rate</td>
        <td>${escapeHtml(formatHourlyRate(fallbackRate))}</td>
      </tr>
    `;
    return;
  }

  elements.pricingRulesBody.innerHTML = activeRules.map((rule) => `
    <tr>
      <td>
        <strong>${escapeHtml(formatVehicleType(rule.vehicleType))}</strong>
        <span>${escapeHtml(formatTimeRange(rule.startTime, rule.endTime))}</span>
      </td>
      <td>${escapeHtml(formatHourlyRate(rule.hourlyRate))}</td>
    </tr>
  `).join('');
}

function renderSpotHint(capacities = []) {
  const { available, hasCapacity } = getCapacitySummary(capacities);

  setText(elements.detailSpotHint, hasCapacity ? `${available} slots available` : 'Capacity not configured');
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

  if (!activeServices.length) {
    elements.amenityGrid.innerHTML = '<div class="amenity-item">No amenities configured yet</div>';
    return;
  }

  elements.amenityGrid.innerHTML = activeServices.map((service) => `
    <div class="amenity-item">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm4.4 7.4-5.1 5.1-2.7-2.7L7.2 13.2l4.1 4.1 6.5-6.5-1.4-1.4Z" />
      </svg>
      <span>${escapeHtml(service.label)}</span>
      ${Number(service.price) > 0 ? `<small>${escapeHtml(formatMoney(service.price))}</small>` : ''}
    </div>
  `).join('');
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
  renderBookingBreakdown(currentLot);
  setText(elements.bookingMeta, mode);

}

function refreshBookingTimeLabels() {
  setText(elements.bookingCheckIn, formatBookingDateTime(selectedDate('checkin')));
  setText(elements.bookingCheckOut, formatBookingDateTime(selectedDate('checkout')));
  renderBaseHourlyRate(currentLot);
  renderBookingBreakdown(currentLot);
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

  const [detail, capacities, pricingRules, services] = await Promise.all([
    getParkingLotDetail(lot.id).catch(() => lot),
    getParkingLotCapacities(lot.id).catch(() => []),
    getParkingLotPricingRules(lot.id).catch(() => []),
    getParkingLotServices(lot.id).catch(() => []),
  ]);

  return {
    ...lot,
    ...detail,
    capacities,
    pricingRules,
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

  elements.bookButton?.addEventListener('click', () => {
    const target = new URL('/confirm-booking.html', window.location.origin);

    if (currentLot?.id) {
      target.searchParams.set('parkingLotId', currentLot.id);
    }

    const checkIn = selectedDate('checkin');
    const checkOut = selectedDate('checkout');

    if (checkIn) {
      target.searchParams.set('startTime', checkIn.toISOString());
    }

    if (checkOut) {
      target.searchParams.set('endTime', checkOut.toISOString());
    }

    window.location.href = `${target.pathname}${target.search}`;
  });

  elements.directionsButton?.addEventListener('click', () => {
    if (hasCoordinates(currentLot)) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${currentLot.latitude},${currentLot.longitude}`, '_blank');
      return;
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentLot?.address || 'parking')}`, '_blank');
  });
}

bindActions();
loadDetail().catch((error) => {
  renderDetail(previewLot, 'Preview data');
});
