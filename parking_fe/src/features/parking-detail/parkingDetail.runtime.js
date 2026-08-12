import { getParkingLotDetail, searchParkingLots } from '../../services/api.js';

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
  status: document.querySelector('#detailStatus'),
  galleryBadge: document.querySelector('#galleryBadge'),
  lotName: document.querySelector('#lotName'),
  lotAddress: document.querySelector('#lotAddress'),
  lotDescription: document.querySelector('#lotDescription'),
  lotId: document.querySelector('#lotId'),
  lotStatus: document.querySelector('#lotStatus'),
  lotVersion: document.querySelector('#lotVersion'),
  lotUpdated: document.querySelector('#lotUpdated'),
  lotCoordinates: document.querySelector('#lotCoordinates'),
  bookingLotName: document.querySelector('#bookingLotName'),
  bookingAddress: document.querySelector('#bookingAddress'),
  bookingMeta: document.querySelector('#bookingMeta'),
  summaryStatus: document.querySelector('#summaryStatus'),
  summaryCoordinates: document.querySelector('#summaryCoordinates'),
  summaryRate: document.querySelector('#summaryRate'),
  baseHourlyRate: document.querySelector('#baseHourlyRate'),
  pricingCarRate: document.querySelector('#pricingCarRate'),
  pricingElectricRate: document.querySelector('#pricingElectricRate'),
  pricingMotorbikeRate: document.querySelector('#pricingMotorbikeRate'),
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

function renderBookingBreakdown(hourlyRate) {
  const rate = Number(hourlyRate);
  const durationHours = getSelectedDurationHours();

  if (!Number.isFinite(rate) || rate <= 0) {
    setText(elements.bookingParkingFeeLabel, `Parking Fee (${formatDuration(durationHours)})`);
    setText(elements.bookingParkingFee, 'Contact');
    setText(elements.bookingServiceFee, 'Contact');
    setText(elements.bookingDiscount, 'Contact');
    setText(elements.bookingTax, 'Contact');
    setText(elements.bookingTotal, 'Contact');
    return;
  }

  const parkingFee = rate * durationHours;
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

function renderDetail(lot, mode = 'Online') {
  currentLot = normalizeLot(lot);
  const coordinates = formatCoordinates(currentLot);
  const hourlyRate = formatHourlyRate(currentLot.hourlyRate);

  setText(elements.lotName, currentLot.name);
  setText(elements.lotAddress, currentLot.address);
  setText(elements.lotDescription, currentLot.description);
  setText(elements.lotId, currentLot.id || '-');
  setText(elements.lotStatus, currentLot.status);
  setText(elements.lotVersion, currentLot.version ?? '-');
  setText(elements.lotUpdated, formatDate(currentLot.updatedAt));
  setText(elements.lotCoordinates, coordinates);
  setText(elements.bookingLotName, currentLot.name);
  setText(elements.bookingAddress, currentLot.address);
  setText(elements.summaryStatus, currentLot.status);
  setText(elements.summaryCoordinates, coordinates);
  setText(elements.summaryRate, hourlyRate);
  setText(elements.baseHourlyRate, hourlyRate);
  setText(elements.pricingCarRate, hourlyRate);
  setText(elements.pricingElectricRate, hourlyRate);
  setText(elements.pricingMotorbikeRate, hourlyRate);
  renderBookingBreakdown(currentLot.hourlyRate);
  setText(elements.status, currentLot.status === 'ACTIVE' ? 'Available Now' : currentLot.status);
  setText(elements.galleryBadge, currentLot.status === 'ACTIVE' ? 'Active' : currentLot.status);
  setText(elements.bookingMeta, mode);

  elements.status?.classList.toggle('offline', mode !== 'Online');
}

function refreshBookingTimeLabels() {
  setText(elements.bookingCheckIn, formatBookingDateTime(selectedDate('checkin')));
  setText(elements.bookingCheckOut, formatBookingDateTime(selectedDate('checkout')));
  renderBookingBreakdown(currentLot?.hourlyRate);
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

  setPickerValue('checkin', now);
  setPickerValue('checkout', later);

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

async function loadDetail() {
  const id = getLotId();

  if (id && !id.startsWith('sample-')) {
    const lot = await getParkingLotDetail(id);
    renderDetail(lot, 'Public detail');
    return;
  }

  if (!id) {
    try {
      const page = await searchParkingLots({ size: 1 });
      if (page.items[0]) {
        renderDetail(page.items[0], 'Public detail');
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
    const target = currentLot?.id ? `/confirm-booking.html?parkingLotId=${encodeURIComponent(currentLot.id)}` : '/confirm-booking.html';
    window.location.href = target;
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
  setText(elements.status, error.message);
  elements.status?.classList.add('offline');
  renderDetail(previewLot, 'Preview data');
});
