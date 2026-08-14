import { useEffect, useMemo, useState } from 'react';
import {
  apiPage,
  apiRequest,
  getParkingLotDetail,
} from '../../services/api.js';
import { CustomerMobileNav, CustomerSidebar, initialsFor } from './CustomerChrome.jsx';

const emptyProfile = {
  fullName: '',
  email: '',
  phone: '',
};

const activeStatuses = ['PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'OVERDUE'];
const finishedStatuses = ['COMPLETED', 'CHECKED_OUT'];
const HOUR_IN_MS = 60 * 60 * 1000;

function formatMoney(value, currency = 'VND') {
  const amount = Number(value?.amount ?? value ?? 0);
  return new Intl.NumberFormat('en-US', {
    currency: value?.currency || currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function profileLabel(profile, account) {
  return profile.fullName || account?.email || account?.phone || 'Customer';
}

function isActiveBooking(booking) {
  return activeStatuses.includes(booking.status);
}

function isPaidBooking(booking) {
  return String(booking?.paymentStatus || '').toUpperCase() === 'PAID';
}

function isSettlementBooking(booking) {
  return ['CHECKED_OUT', 'PENDING_PAYMENT'].includes(booking?.status)
    && Boolean(booking.actualCheckOutTime)
    && !isPaidBooking(booking);
}

function displayBookingPriority(booking) {
  if (isSettlementBooking(booking)) return 0;
  if (booking?.status === 'PENDING_PAYMENT') return 1;
  if (booking?.status === 'OVERDUE') return 2;
  if (booking?.status === 'CHECKED_IN') return 3;
  if (booking?.status === 'CONFIRMED') return 4;
  if (booking?.status === 'PENDING_APPROVAL') return 5;
  if (isSettlementBooking(booking)) return 6;
  return 9;
}

function selectHighlightedBooking(items) {
  return items
    .filter((booking) => isActiveBooking(booking) || isSettlementBooking(booking))
    .sort((left, right) => {
      const priority = displayBookingPriority(left) - displayBookingPriority(right);
      if (priority !== 0) {
        return priority;
      }
      return bookingSortDate(right) - bookingSortDate(left);
    })[0] || null;
}

function statusText(value) {
  return String(value || '-').replaceAll('_', ' ');
}

function bookingTotal(booking) {
  return booking?.priceBreakdown?.total || booking?.total || 0;
}

function moneyPart(booking, key) {
  return booking?.priceBreakdown?.[key] || 0;
}

function moneyAmount(value) {
  const amount = Number(value?.amount ?? value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function moneyCurrency(value, fallback = 'VND') {
  return value?.currency || fallback;
}

function parkingLotMapsHref(lot) {
  const latitude = Number(lot?.latitude);
  const longitude = Number(lot?.longitude);
  const query = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `${latitude},${longitude}`
    : lot?.address || lot?.name || 'Ha Noi parking';

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function bookingSortDate(booking) {
  return parseDate(booking?.updatedAt)
    || parseDate(booking?.actualCheckOutTime)
    || parseDate(booking?.createdAt)
    || parseDate(booking?.startTime)
    || new Date(0);
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function formatParkingDuration(booking, now) {
  const start = parseDate(booking?.actualCheckInTime) || parseDate(booking?.startTime);
  const end = parseDate(booking?.actualCheckOutTime)
    || (['CHECKED_IN', 'OVERDUE'].includes(booking?.status) ? now : parseDate(booking?.endTime));

  if (!start || !end || end <= start) {
    return '-';
  }

  const totalMinutes = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${minutes}m`;
  }

  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function scheduledBookingHours(booking) {
  const start = parseDate(booking?.startTime);
  const end = parseDate(booking?.endTime);

  if (!start || !end || end <= start) {
    return 0;
  }

  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / HOUR_IN_MS));
}

function bookingHourlyRate(booking, lot) {
  const lotRate = Number(lot?.hourlyRate ?? lot?.price ?? lot?.rate);

  if (Number.isFinite(lotRate) && lotRate > 0) {
    return lotRate;
  }

  const snapshotParkingFee = moneyAmount(moneyPart(booking, 'parkingFee'));
  const scheduledHours = scheduledBookingHours(booking);
  return scheduledHours > 0 ? snapshotParkingFee / scheduledHours : 0;
}

function parseBandMinutes(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(1440, value));
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return fallback;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return fallback;
  }

  return Math.max(0, Math.min(1440, hours * 60 + minutes));
}

function normalizePriceBands(lot, fallbackRate) {
  const sourceBands = lot?.priceBands || lot?.pricingBands || lot?.pricing?.bands;

  if (!Array.isArray(sourceBands) || !sourceBands.length) {
    return fallbackRate > 0 ? [{ endMinutes: 1440, label: 'All day', rate: fallbackRate, startMinutes: 0 }] : [];
  }

  return sourceBands
    .map((band) => {
      const rate = Number(band.hourlyRate ?? band.rate ?? band.price?.amount ?? band.price);

      if (!Number.isFinite(rate) || rate <= 0) {
        return null;
      }

      const startMinutes = parseBandMinutes(
        band.startTime ?? band.start ?? band.from ?? band.openTime,
        0,
      );
      const endMinutes = parseBandMinutes(
        band.endTime ?? band.end ?? band.to ?? band.closeTime,
        1440,
      );

      return {
        endMinutes,
        label: band.label || band.timeRange || `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')} - ${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`,
        rate,
        startMinutes,
      };
    })
    .filter(Boolean);
}

function rateForDate(date, bands, fallbackRate) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const matchedBand = bands.find((band) => {
    if (band.startMinutes <= band.endMinutes) {
      return minutes >= band.startMinutes && minutes < band.endMinutes;
    }

    return minutes >= band.startMinutes || minutes < band.endMinutes;
  });

  return matchedBand?.rate || fallbackRate;
}

function activeParkingPricing(booking, lot, now) {
  const actualCheckIn = parseDate(booking?.actualCheckInTime);
  const actualCheckOut = parseDate(booking?.actualCheckOutTime);

  if (!booking || !actualCheckIn || !['CHECKED_IN', 'OVERDUE', 'CHECKED_OUT', 'COMPLETED', 'PENDING_PAYMENT'].includes(booking.status)) {
    return null;
  }

  const endTime = actualCheckOut || now;
  const elapsed = Math.max(0, endTime.getTime() - actualCheckIn.getTime());
  const billedHours = elapsed > 0 ? Math.ceil(elapsed / HOUR_IN_MS) : 0;
  const currency = moneyCurrency(moneyPart(booking, 'parkingFee'));
  const fallbackRate = bookingHourlyRate(booking, lot);
  const bands = normalizePriceBands(lot, fallbackRate);

  if (!billedHours || !bands.length) {
    return {
      billedHours,
      parkingFee: { amount: 0, currency },
      total: { amount: 0, currency },
      usesBands: bands.length > 1,
    };
  }

  const parkingFeeAmount = Array.from({ length: billedHours }).reduce((sum, _, index) => {
    const hourStart = new Date(actualCheckIn.getTime() + index * HOUR_IN_MS);
    return sum + rateForDate(hourStart, bands, fallbackRate);
  }, 0);

  const serviceFee = moneyAmount(moneyPart(booking, 'serviceFee'));
  const pickupFee = moneyAmount(moneyPart(booking, 'pickupFee'));
  const platformFee = moneyAmount(moneyPart(booking, 'platformFee'));
  const tax = moneyAmount(moneyPart(booking, 'tax'));
  const overtimeFee = moneyAmount(moneyPart(booking, 'overtimeFee'));
  const discount = moneyAmount(moneyPart(booking, 'discount'));

  return {
    billedHours,
    hourlyRate: fallbackRate,
    parkingFee: { amount: parkingFeeAmount, currency },
    total: {
      amount: Math.max(0, parkingFeeAmount + serviceFee + pickupFee + platformFee + tax + overtimeFee - discount),
      currency,
    },
    usesBands: bands.length > 1,
  };
}

function activeTimerState(booking, now) {
  if (!booking) {
    return {
      className: 'waiting',
      label: 'PARKING TIME USED',
      progress: '0%',
      sublabel: 'No active booking',
      value: '00:00:00',
    };
  }

  const actualCheckIn = parseDate(booking.actualCheckInTime);
  const actualCheckOut = parseDate(booking.actualCheckOutTime);
  const scheduledEnd = parseDate(booking.endTime);

  if (actualCheckIn && actualCheckOut) {
    return {
      className: 'completed',
      label: 'TOTAL PARKING TIME',
      progress: '100%',
      sublabel: `Checked out at ${formatDateTime(actualCheckOut)}`,
      value: formatDuration(actualCheckOut.getTime() - actualCheckIn.getTime()),
    };
  }

  if ((booking.status === 'CHECKED_IN' || booking.status === 'OVERDUE') && actualCheckIn) {
    const totalWindow = scheduledEnd ? Math.max(1, scheduledEnd.getTime() - actualCheckIn.getTime()) : 1;
    const elapsed = Math.max(0, now.getTime() - actualCheckIn.getTime());
    return {
      className: booking.status === 'OVERDUE' ? 'overdue' : 'active',
      label: 'PARKING TIME USED',
      progress: `${Math.min(100, (elapsed / totalWindow) * 100)}%`,
      sublabel: `Started at ${formatDateTime(actualCheckIn)}`,
      value: formatDuration(elapsed),
    };
  }

  return {
    className: 'waiting',
    label: 'WAITING FOR STAFF CHECK-IN',
    progress: '0%',
    sublabel: 'Timer starts after staff verifies entry',
    value: '00:00:00',
  };
}

function timelineState(booking, key) {
  if (!booking) {
    return 'pending';
  }

  const status = booking.status;
  const paymentStatus = booking.paymentStatus;

  if (key === 'created') {
    return 'done';
  }

  if (key === 'approved') {
    if (status === 'PENDING_APPROVAL') return 'current';
    return activeStatuses.includes(status) || finishedStatuses.includes(status) ? 'done' : 'pending';
  }

  if (key === 'checkedIn') {
    if (status === 'CHECKED_IN' || status === 'OVERDUE') return 'current';
    if (status === 'PENDING_PAYMENT' || booking.actualCheckOutTime || finishedStatuses.includes(status)) return 'done';
    return 'pending';
  }

  if (key === 'checkout') {
    if (status === 'PENDING_PAYMENT' || booking.actualCheckOutTime) return paymentStatus === 'PAID' ? 'done' : 'current';
    return finishedStatuses.includes(status) ? 'done' : 'pending';
  }

  return 'pending';
}

function timelineProgress(booking) {
  if (!booking) {
    return '0%';
  }

  const steps = ['created', 'approved', 'checkedIn', 'checkout'];
  const states = steps.map((key) => timelineState(booking, key));
  const lastDoneIndex = states.reduce((index, state, currentIndex) => (state === 'done' ? currentIndex : index), 0);
  const currentIndex = states.findIndex((state) => state === 'current');
  const index = currentIndex >= 0 ? currentIndex : lastDoneIndex;
  return `${Math.max(0, Math.min(80, (index / (steps.length - 1)) * 80))}%`;
}

function paymentQrPayload(booking, total) {
  return [
    'PARKFINDER_PAYMENT',
    booking?.bookingCode || booking?.id || 'BOOKING',
    moneyAmount(total),
    moneyCurrency(total),
  ].join('|');
}

function qrCellFilled(payload, index) {
  const value = payload.charCodeAt(index % payload.length) + index * 17;
  return value % 5 === 0 || value % 7 === 0 || value % 11 === 0;
}

export function CustomerDashboard() {
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [lots, setLots] = useState([]);
  const [activeBookingDetail, setActiveBookingDetail] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [status, setStatus] = useState('Loading');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  const activeBookings = useMemo(
    () => bookings.filter(isActiveBooking),
    [bookings],
  );

  const currentBooking = useMemo(() => {
    return selectHighlightedBooking(bookings);
  }, [bookings]);

  const settlementBooking = useMemo(() => {
    return bookings
      .filter(isSettlementBooking)
      .sort((left, right) => bookingSortDate(right) - bookingSortDate(left))[0] || null;
  }, [bookings]);

  const displayBooking = activeBookingDetail || currentBooking || settlementBooking;

  const currentVehicle = useMemo(() => {
    return vehicles.find((vehicle) => vehicle.id === displayBooking?.vehicleId) || null;
  }, [displayBooking, vehicles]);

  const currentLot = useMemo(() => {
    return lots.find((lot) => lot.id === displayBooking?.parkingLotId) || null;
  }, [displayBooking, lots]);

  const recentBookings = useMemo(() => {
    const mergedBookings = activeBookingDetail
      ? bookings.map((booking) => (booking.id === activeBookingDetail.id ? { ...booking, ...activeBookingDetail } : booking))
      : bookings;

    return mergedBookings
      .slice()
      .sort((left, right) => bookingSortDate(right) - bookingSortDate(left))
      .slice(0, 4);
  }, [activeBookingDetail, bookings]);

  const name = profileLabel(profile, account);
  const initials = initialsFor(name);
  const bookingCode = qrCode || displayBooking?.bookingCode || displayBooking?.id || 'No active booking';
  const total = bookingTotal(displayBooking);
  const timerInfo = activeTimerState(displayBooking, now);
  const livePricing = activeParkingPricing(displayBooking, currentLot, now);
  const displayParkingFee = livePricing?.parkingFee || moneyPart(displayBooking, 'parkingFee');
  const displayTotal = livePricing?.total || total;
  const showPaymentQr = ['CHECKED_OUT', 'PENDING_PAYMENT'].includes(displayBooking?.status) && !isPaidBooking(displayBooking);
  const paymentQr = paymentQrPayload(displayBooking, displayTotal);
  const pageHeading = displayBooking?.status === 'CHECKED_OUT'
    ? 'Final Bill'
    : displayBooking?.status === 'PENDING_PAYMENT'
      ? 'Payment Required'
      : 'Active Booking';
  const vehicleLabel = currentVehicle
    ? `${currentVehicle.brand || currentVehicle.vehicleType} ${currentVehicle.plateNumber}`
    : 'Vehicle pending';
  const mapsHref = parkingLotMapsHref(currentLot);

  async function loadDashboard() {
    setLoading(true);
    setStatus('Loading');
    setActiveBookingDetail(null);
    setQrCode('');

    try {
      const currentAccount = await apiRequest('/auth/me');

      if (currentAccount.role !== 'CUSTOMER') {
        window.location.href = currentAccount.role === 'ADMIN' ? '/admin-users.html' : '/staff.html';
        return;
      }

      const [profileResponse, vehicleResponse, bookingPage, lotPage] = await Promise.all([
        apiRequest('/customers/me'),
        apiRequest('/customer/vehicles'),
        apiPage('/customer/bookings', { size: 20 }),
        apiPage('/public/parking-lots', { size: 12 }),
      ]);

      const highlightedBooking = selectHighlightedBooking(bookingPage.items);

      let detail = null;
      let qr = '';
      let lotDetail = null;

      if (highlightedBooking) {
        const [detailResult, qrResult, lotResult] = await Promise.allSettled([
          apiRequest(`/customer/bookings/${highlightedBooking.id}`),
          apiRequest(`/customer/bookings/${highlightedBooking.id}/qr-code`),
          getParkingLotDetail(highlightedBooking.parkingLotId),
        ]);

        if (detailResult.status === 'fulfilled') {
          detail = detailResult.value;
        }

        if (qrResult.status === 'fulfilled') {
          qr = qrResult.value?.bookingCode || '';
        }

        if (lotResult.status === 'fulfilled') {
          lotDetail = lotResult.value;
        }
      }

      setAccount(currentAccount);
      setProfile(profileResponse);
      setVehicles(vehicleResponse);
      setBookings(bookingPage.items);
      setLots(lotDetail ? [lotDetail, ...lotPage.items.filter((lot) => lot.id !== lotDetail.id)] : lotPage.items);
      setActiveBookingDetail(detail);
      setQrCode(qr);
      setStatus('Online');
    } catch (error) {
      setStatus(error.message);
      if (error.message.toLowerCase().includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        window.location.href = '/auth.html';
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'ParkFinder | Active Booking';
    document.body.className = 'customer-dashboard-page';
    document.body.dataset.page = 'customer-active-booking';
    loadDashboard();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="customer-dashboard">
      <CustomerSidebar active="dashboard" initials={initials} name={name} />

      <main className="customer-main active-booking-main">
        <header className="customer-top-nav">
          <div className="customer-mobile-title">
            <strong>ParkFinder</strong>
            <span>Active Booking</span>
          </div>
        </header>

        <section className="customer-content active-booking-content" id="active-booking">
          {displayBooking ? (
            <>
              <div className="active-booking-heading">
                <div>
                  <div className="active-booking-reference">
                    <span>Booking Reference</span>
                    <strong>#{displayBooking.bookingCode || displayBooking.id || 'Pending'}</strong>
                  </div>
                  <h1>{pageHeading}{currentVehicle ? ` - ${currentVehicle.plateNumber}` : ''}</h1>
                </div>
                <span className="active-booking-status confirmed">
                  {loading ? 'Loading' : statusText(displayBooking.status || 'No Active Booking')}
                </span>
              </div>

              <div className="active-booking-grid">
                <div className="active-booking-left">
                  <section className="active-booking-card">
                    <div className="active-booking-primary">
                      <div className="active-booking-qr-wrap">
                        <div className="active-booking-qr" aria-label="Booking QR placeholder">
                          <span>{String(bookingCode).slice(0, 2).toUpperCase()}</span>
                          {Array.from({ length: 36 }).map((_, index) => (
                            <i key={`${bookingCode}-${index}`} className={(String(bookingCode).charCodeAt(index % String(bookingCode).length) + index) % 3 === 0 ? 'filled' : ''} />
                          ))}
                        </div>
                        <button
                          className="active-booking-copy"
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(String(bookingCode))}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M8 7h11v14H8V7Zm2 2v10h7V9h-7ZM5 3h10v2H7v10H5V3Z" />
                          </svg>
                          Copy Booking Code
                        </button>
                      </div>

                      <div className="active-booking-details">
                        <div>
                          <h2>{currentLot?.name || displayBooking.parkingLotId}</h2>
                          <p>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
                            </svg>
                            {currentLot?.address || 'Parking lot details from booking'}
                          </p>
                        </div>

                        <div className="active-booking-info-grid">
                          <div>
                            <span>Scheduled Check-In</span>
                            <strong>{formatDateTime(displayBooking.startTime)}</strong>
                            <small>{displayBooking.actualCheckInTime ? `Actual: ${formatDateTime(displayBooking.actualCheckInTime)}` : 'Staff verification pending'}</small>
                          </div>
                          <div>
                            <span>Scheduled Check-Out</span>
                            <strong>{formatDateTime(displayBooking.endTime)}</strong>
                            <small>{displayBooking.actualCheckOutTime ? `Actual: ${formatDateTime(displayBooking.actualCheckOutTime)}` : 'Not checked out yet'}</small>
                          </div>
                          <div>
                            <span>Vehicle</span>
                            <strong>{vehicleLabel}</strong>
                            <small>{currentVehicle?.color || currentVehicle?.vehicleType || 'Vehicle details'}</small>
                          </div>
                          <div className="active-booking-map-cell">
                            <a
                              aria-label={`Open ${currentLot?.name || 'parking lot'} in Google Maps`}
                              className="active-booking-map-link"
                              href={mapsHref}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <i aria-hidden="true">
                                <svg viewBox="0 0 24 24">
                                  <path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
                                </svg>
                              </i>
                            </a>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="active-booking-timeline" style={{ '--timeline-progress': timelineProgress(displayBooking) }}>
                      {[
                        ['created', 'Created', formatDateTime(displayBooking.createdAt)],
                        ['approved', 'Approved', displayBooking.status === 'PENDING_APPROVAL' ? 'Pending' : 'Ready'],
                        ['checkedIn', 'Checked In', displayBooking.actualCheckInTime ? formatDateTime(displayBooking.actualCheckInTime) : 'Staff verification pending'],
                        ['checkout', 'Check out', 'Payment pending'],
                      ].map(([key, label, meta]) => (
                        <div className={`active-booking-step ${timelineState(displayBooking, key)}`} key={key}>
                          <span />
                          <strong>{label}</strong>
                          <small>{meta}</small>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="active-booking-right">
                  <section className={`active-booking-countdown ${timerInfo.className}`}>
                    <span>{timerInfo.label}</span>
                    <strong>{timerInfo.value}</strong>
                    <small>{timerInfo.sublabel}</small>
                    <div><i style={{ width: timerInfo.progress }} /></div>
                  </section>

                  <section className="active-booking-summary">
                    <h3>Price Summary</h3>
                    <div>
                      <span>Parking Fee</span>
                      <strong>{formatMoney(displayParkingFee)}</strong>
                    </div>
                    {livePricing ? (
                      <small className="active-booking-summary-note">
                        {livePricing.billedHours} billed hour{livePricing.billedHours === 1 ? '' : 's'}
                        {livePricing.usesBands ? ' by time band' : ` x ${formatMoney(livePricing.hourlyRate)}/hour`}
                      </small>
                    ) : null}
                    <div>
                      <span>Service Fee</span>
                      <strong>{formatMoney(moneyPart(displayBooking, 'serviceFee'))}</strong>
                    </div>
                    <div>
                      <span>Tax</span>
                      <strong>{formatMoney(moneyPart(displayBooking, 'tax'))}</strong>
                    </div>
                    <div className="active-booking-total">
                      <span>Total Amount</span>
                      <strong>{formatMoney(displayTotal)}</strong>
                    </div>
                    <div>
                      <span>Payment</span>
                      <strong>{statusText(displayBooking.paymentMethod)}</strong>
                    </div>
                    {showPaymentQr ? (
                      <div className="active-booking-payment-qr">
                        <div className="active-payment-qr-code" aria-label="Payment QR">
                          {Array.from({ length: 49 }).map((_, index) => (
                            <i key={`${paymentQr}-${index}`} className={qrCellFilled(paymentQr, index) ? 'filled' : ''} />
                          ))}
                          <span>PAY</span>
                        </div>
                        <div>
                          <span>Payment QR</span>
                          <strong>{formatMoney(displayTotal)}</strong>
                          <small>{displayBooking.bookingCode || displayBooking.id}</small>
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className="active-booking-info-card">
                    <span>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11.8 11.8 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.4a1 1 0 0 1 1 1 11.8 11.8 0 0 0 .6 3.6 1 1 0 0 1-.2 1l-2.2 2.2Z" />
                      </svg>
                    </span>
                    <div>
                      <strong>Garage Hotline</strong>
                      <small>Contact support for parking lot phone</small>
                    </div>
                  </section>

                </aside>
              </div>
            </>
          ) : null}

          <section className="active-booking-recent">
            <div className="active-booking-section-head">
              <h2>Recent Booking</h2>
              <span>{recentBookings.length} latest</span>
            </div>

            {recentBookings.length ? (
              <div className="active-booking-recent-list">
                {recentBookings.map((booking) => {
                  const vehicle = vehicles.find((item) => item.id === booking.vehicleId);
                  const lot = lots.find((item) => item.id === booking.parkingLotId);
                  const isPaid = String(booking.paymentStatus || '').toUpperCase() === 'PAID';
                  const amount = formatMoney(bookingTotal(booking));
                  const paidAmount = isPaid ? amount : `${amount} due`;

                  return (
                    <article className="active-booking-recent-card" key={booking.id}>
                      <div>
                        <span>Vehicle</span>
                        <strong>{vehicle?.plateNumber || booking.vehiclePlateNumber || booking.plateNumber || 'Vehicle pending'}</strong>
                      </div>
                      <div>
                        <span>Parking Lot</span>
                        <strong>{lot?.name || booking.parkingLotName || booking.parkingLot?.name || booking.parkingLotId || 'Parking lot pending'}</strong>
                      </div>
                      <div>
                        <span>Amount</span>
                        <strong>{paidAmount}</strong>
                      </div>
                      <div>
                        <span>Parked Time</span>
                        <strong>{formatParkingDuration(booking, now)}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="active-booking-recent-empty">No recent bookings yet.</div>
            )}
          </section>
        </section>
      </main>

      <CustomerMobileNav active="dashboard" />
    </div>
  );
}
