import { useEffect, useMemo, useState } from 'react';
import {
  apiPage,
  apiRequest,
  getParkingLotDetail,
  getParkingLotPricingRules,
  jsonBody,
} from '../../services/api.js';
import { CustomerMobileNav, CustomerSidebar, initialsFor } from './CustomerChrome.jsx';

const emptyProfile = {
  fullName: '',
  email: '',
  phone: '',
};

const activeStatuses = ['PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'];
const finishedStatuses = ['COMPLETED', 'CHECKED_OUT'];
const customerCancelableStatuses = ['PENDING_APPROVAL', 'CONFIRMED'];
const CHECK_IN_WINDOW_MS = 20 * 60 * 1000;
const HOUR_IN_MS = 60 * 60 * 1000;
const VNPAY_MERCHANT_CODE = import.meta.env.VITE_VNPAY_MERCHANT_CODE || 'PARKFINDER';
const VNPAY_ORDER_PREFIX = import.meta.env.VITE_VNPAY_ORDER_PREFIX || 'PF';

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

function isRecentCompletedBooking(booking) {
  if (booking?.status === 'COMPLETED') {
    return true;
  }

  return booking?.status === 'CHECKED_OUT'
    && Boolean(booking.actualCheckOutTime)
    && isPaidBooking(booking);
}

function isSettlementBooking(booking) {
  return ['CHECKED_OUT', 'PENDING_PAYMENT'].includes(booking?.status)
    && Boolean(booking.actualCheckOutTime)
    && !isPaidBooking(booking);
}

function canCustomerCancelBooking(booking) {
  return Boolean(booking)
    && customerCancelableStatuses.includes(booking.status)
    && !booking.actualCheckInTime;
}

function displayBookingPriority(booking) {
  if (isSettlementBooking(booking)) return 0;
  if (booking?.status === 'PENDING_PAYMENT') return 1;
  if (booking?.status === 'CHECKED_IN') return 2;
  if (booking?.status === 'CONFIRMED') return 3;
  if (booking?.status === 'PENDING_APPROVAL') return 4;
  if (isSettlementBooking(booking)) return 6;
  return 9;
}

function statusText(value) {
  return String(value || '-').replaceAll('_', ' ');
}

function isOnlinePaymentMethod(method) {
  return ['QR', 'CARD'].includes(String(method || '').toUpperCase());
}

function vehicleTypeText(value) {
  if (!value) {
    return '';
  }

  const labels = {
    CAR: 'Car',
    MOTORBIKE: 'Motorbike',
  };

  return labels[value] || statusText(value);
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
    || (booking?.status === 'CHECKED_IN' ? now : parseDate(booking?.endTime));

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

function reviewStars(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  return '★'.repeat(value) + '☆'.repeat(5 - value);
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

function normalizePriceBands(lot, fallbackRate, vehicleType) {
  const sourceBands = lot?.pricingRules || lot?.priceBands || lot?.pricingBands || lot?.pricing?.bands;

  if (!Array.isArray(sourceBands) || !sourceBands.length) {
    return fallbackRate > 0 ? [{ endMinutes: 1440, label: 'All day', rate: fallbackRate, startMinutes: 0 }] : [];
  }

  const matchingBands = sourceBands
    .filter((band) => band.active !== false)
    .filter((band) => !vehicleType || !band.vehicleType || band.vehicleType === vehicleType);

  if (!matchingBands.length) {
    return fallbackRate > 0 ? [{ endMinutes: 1440, label: 'All day', rate: fallbackRate, startMinutes: 0 }] : [];
  }

  return matchingBands
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

function nextBandBoundary(date, bands) {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const candidates = bands
    .flatMap((band) => [band.startMinutes, band.endMinutes])
    .filter((minutes) => minutes !== currentMinutes)
    .map((minutes) => {
      const candidate = new Date(date);
      candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      if (candidate <= date) {
        candidate.setDate(candidate.getDate() + 1);
      }
      return candidate;
    });

  return candidates.sort((left, right) => left - right)[0] || new Date(date.getTime() + 24 * HOUR_IN_MS);
}

function calculateParkingFeeByBands(startTime, endTime, bands, fallbackRate) {
  let cursor = startTime;
  let total = 0;

  while (cursor < endTime) {
    const boundary = nextBandBoundary(cursor, bands);
    const segmentEnd = boundary < endTime ? boundary : endTime;
    const minutes = Math.max(0, (segmentEnd.getTime() - cursor.getTime()) / 60000);
    const segmentHours = Math.round((minutes / 60) * 100) / 100;
    const rate = rateForDate(cursor, bands, fallbackRate);
    total += rate * segmentHours;
    cursor = segmentEnd;
  }

  return total;
}

function activeParkingPricing(booking, lot, now) {
  const actualCheckIn = parseDate(booking?.actualCheckInTime);
  const actualCheckOut = parseDate(booking?.actualCheckOutTime);

  if (!booking || !actualCheckIn || !['CHECKED_IN', 'CHECKED_OUT', 'COMPLETED', 'PENDING_PAYMENT'].includes(booking.status)) {
    return null;
  }

  if (actualCheckOut) {
    return null;
  }

  const endTime = now;
  const elapsed = Math.max(0, endTime.getTime() - actualCheckIn.getTime());
  const billedHours = elapsed > 0 ? Math.ceil(elapsed / HOUR_IN_MS) : 0;
  const currency = moneyCurrency(moneyPart(booking, 'parkingFee'));
  const fallbackRate = bookingHourlyRate(booking, lot);
  const bands = normalizePriceBands(lot, fallbackRate, booking.vehicleType);

  if (!billedHours || !bands.length) {
    return {
      billedHours,
      parkingFee: { amount: 0, currency },
      total: { amount: 0, currency },
      usesBands: bands.length > 1,
    };
  }

  const parkingFeeAmount = calculateParkingFeeByBands(actualCheckIn, endTime, bands, fallbackRate);

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
  const createdAt = parseDate(booking.createdAt);
  const holdDeadline = scheduledEnd || (createdAt ? new Date(createdAt.getTime() + CHECK_IN_WINDOW_MS) : null);

  if (actualCheckIn && actualCheckOut) {
    return {
      className: 'completed',
      label: 'TOTAL PARKING TIME',
      progress: '100%',
      sublabel: `Checked out at ${formatDateTime(actualCheckOut)}`,
      value: formatDuration(actualCheckOut.getTime() - actualCheckIn.getTime()),
    };
  }

  if (booking.status === 'CHECKED_IN' && actualCheckIn) {
    const totalWindow = scheduledEnd ? Math.max(1, scheduledEnd.getTime() - actualCheckIn.getTime()) : 1;
    const elapsed = Math.max(0, now.getTime() - actualCheckIn.getTime());
    return {
      className: 'active',
      label: 'PARKING TIME USED',
      progress: `${Math.min(100, (elapsed / totalWindow) * 100)}%`,
      sublabel: `Started at ${formatDateTime(actualCheckIn)}`,
      value: formatDuration(elapsed),
    };
  }

  if (['PENDING_APPROVAL', 'CONFIRMED'].includes(booking.status) && holdDeadline) {
    const holdStart = parseDate(booking.startTime) || createdAt || new Date(holdDeadline.getTime() - CHECK_IN_WINDOW_MS);
    const totalWindow = Math.max(1, holdDeadline.getTime() - holdStart.getTime());
    const remaining = Math.max(0, holdDeadline.getTime() - now.getTime());
    const remainingProgress = Math.max(0, Math.min(100, (remaining / totalWindow) * 100));
    const expired = remaining <= 0;

    return {
      className: expired ? 'waiting expired' : 'waiting',
      label: 'CHECK-IN DEADLINE',
      progress: `${remainingProgress}%`,
      sublabel: expired
        ? 'Check-in window expired. This booking will be cancelled automatically.'
        : 'Please check in within 20 minutes. It will be cancelled automatically if staff does not verify your entry in time.',
      value: formatDuration(remaining),
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
    if (status === 'CHECKED_IN') return 'current';
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
  const bookingCode = booking?.bookingCode || booking?.id || 'BOOKING';
  const amount = Math.max(0, Math.round(moneyAmount(total)));
  const currency = moneyCurrency(total);

  return [
    'VNPAY_DEMO_PAYMENT',
    `merchant=${VNPAY_MERCHANT_CODE}`,
    `order=${VNPAY_ORDER_PREFIX}-${bookingCode}`,
    `amount=${amount}`,
    `currency=${currency}`,
    `description=ParkFinder checkout ${bookingCode}`,
  ].join('|');
}

function paymentQrImageUrl(payload) {
  return `https://api.qrserver.com/v1/create-qr-code/?${new URLSearchParams({
    data: payload,
    ecc: 'M',
    margin: '12',
    size: '220x220',
  }).toString()}`;
}

export function CustomerDashboard({ view = 'active' } = {}) {
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [lots, setLots] = useState([]);
  const [bookingDetailsById, setBookingDetailsById] = useState({});
  const [checkoutPreviewById, setCheckoutPreviewById] = useState({});
  const [qrCodesById, setQrCodesById] = useState({});
  const [status, setStatus] = useState('Loading');
  const [loading, setLoading] = useState(true);
  const [cancelingBookingId, setCancelingBookingId] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewDialog, setReviewDialog] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [now, setNow] = useState(() => new Date());

  const bookingsWithDetails = useMemo(
    () => bookings.map((booking) => ({
      ...booking,
      ...(bookingDetailsById[String(booking.id)] || {}),
    })),
    [bookingDetailsById, bookings],
  );

  const activeBookings = useMemo(
    () => bookingsWithDetails
      .filter((booking) => isActiveBooking(booking) || isSettlementBooking(booking))
      .slice()
      .sort((left, right) => {
        const priority = displayBookingPriority(left) - displayBookingPriority(right);
        if (priority !== 0) {
          return priority;
        }
        return bookingSortDate(right) - bookingSortDate(left);
      }),
    [bookingsWithDetails],
  );

  const isRecentPage = view === 'recent';

  const recentBookings = useMemo(() => {
    return bookingsWithDetails
      .filter(isRecentCompletedBooking)
      .slice()
      .sort((left, right) => bookingSortDate(right) - bookingSortDate(left))
      .slice(0, isRecentPage ? 50 : 4);
  }, [bookingsWithDetails, isRecentPage]);

  const reviewByBookingId = useMemo(() => {
    return new Map(reviews.map((review) => [String(review.bookingId), review]));
  }, [reviews]);

  const name = profileLabel(profile, account);
  const initials = initialsFor(name);
  const checkoutPreviewBookingKey = useMemo(
    () => activeBookings
      .filter((booking) => booking.status === 'CHECKED_IN' && booking.actualCheckInTime && !booking.actualCheckOutTime)
      .map((booking) => String(booking.id))
      .join('|'),
    [activeBookings],
  );

  async function loadDashboard(options = {}) {
    const silent = Boolean(options.silent);

    if (!silent) {
      setLoading(true);
      setStatus('Loading');
      setBookingDetailsById({});
      setCheckoutPreviewById({});
      setQrCodesById({});
    }

    try {
      const currentAccount = await apiRequest('/auth/me');

      if (currentAccount.role !== 'CUSTOMER') {
        window.location.href = currentAccount.role === 'ADMIN' ? '/admin-users.html' : '/staff.html';
        return;
      }

      const [profileResponse, vehicleResponse, bookingPage, lotPage, reviewPage] = await Promise.all([
        apiRequest('/customers/me'),
        apiRequest('/customer/vehicles'),
        apiPage('/customer/bookings', { size: 20 }),
        apiPage('/public/parking-lots', { size: 12 }),
        apiPage('/customer/reviews', { size: 100 }),
      ]);

      const activeSummaries = bookingPage.items
        .filter((booking) => isActiveBooking(booking) || isSettlementBooking(booking))
        .slice()
        .sort((left, right) => {
          const priority = displayBookingPriority(left) - displayBookingPriority(right);
          if (priority !== 0) {
            return priority;
          }
          return bookingSortDate(right) - bookingSortDate(left);
        });

      const detailResults = await Promise.allSettled(activeSummaries.map(async (booking) => {
        const canPreviewCheckout = booking.status === 'CHECKED_IN';
        const [detailResult, qrResult, lotResult, pricingRulesResult, previewResult] = await Promise.allSettled([
          apiRequest(`/customer/bookings/${booking.id}`),
          apiRequest(`/customer/bookings/${booking.id}/qr-code`),
          booking.parkingLotId ? getParkingLotDetail(booking.parkingLotId) : Promise.resolve(null),
          booking.parkingLotId ? getParkingLotPricingRules(booking.parkingLotId) : Promise.resolve([]),
          canPreviewCheckout
            ? apiRequest(`/customer/bookings/${booking.id}/checkout-preview`, { method: 'POST' })
            : Promise.resolve(null),
        ]);

        const lotDetail = lotResult.status === 'fulfilled' && lotResult.value
          ? {
            ...lotResult.value,
            pricingRules: pricingRulesResult.status === 'fulfilled' ? pricingRulesResult.value : lotResult.value.pricingRules,
          }
          : null;

        return {
          bookingId: booking.id,
          detail: detailResult.status === 'fulfilled' ? detailResult.value : null,
          lotDetail,
          preview: previewResult.status === 'fulfilled' ? previewResult.value : null,
          qrCode: qrResult.status === 'fulfilled' ? qrResult.value?.bookingCode || '' : '',
        };
      }));

      const nextBookingDetails = {};
      const nextCheckoutPreviews = {};
      const nextQrCodes = {};
      const nextLotDetails = new Map();

      detailResults.forEach((result) => {
        if (result.status !== 'fulfilled') {
          return;
        }

        const { bookingId, detail, lotDetail, preview, qrCode: nextQrCode } = result.value;
        const key = String(bookingId);

        if (detail) {
          nextBookingDetails[key] = detail;
        }

        if (preview) {
          nextCheckoutPreviews[key] = preview;
        }

        if (nextQrCode) {
          nextQrCodes[key] = nextQrCode;
        }

        if (lotDetail?.id) {
          nextLotDetails.set(String(lotDetail.id), lotDetail);
        }
      });

      setAccount(currentAccount);
      setProfile(profileResponse);
      setVehicles(vehicleResponse);
      setBookings(bookingPage.items);
      setReviews(reviewPage.items);
      setLots([
        ...nextLotDetails.values(),
        ...lotPage.items.filter((lot) => !nextLotDetails.has(String(lot.id))),
      ]);
      setBookingDetailsById(nextBookingDetails);
      setCheckoutPreviewById(nextCheckoutPreviews);
      setQrCodesById(nextQrCodes);
      setStatus('Online');
    } catch (error) {
      if (!silent) {
        setStatus(error.message);
      }
      if (error.message.toLowerCase().includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        window.location.href = '/auth.html';
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function handleCancelBooking(booking) {
    if (!booking?.id || !canCustomerCancelBooking(booking)) {
      return;
    }

    const confirmed = window.confirm('Cancel this booking?');
    if (!confirmed) {
      return;
    }

    setCancelingBookingId(String(booking.id));
    setStatus('Cancelling');

    try {
      await apiRequest(`/customer/bookings/${booking.id}/cancel`, {
        method: 'POST',
        body: jsonBody({ reason: 'Cancelled by customer before check-in' }),
      });
      await loadDashboard({ silent: true });
      setStatus('Booking cancelled');
    } catch (error) {
      setStatus(error.message || 'Unable to cancel booking');
    } finally {
      setCancelingBookingId('');
    }
  }

  function openReviewDialog(booking) {
    if (!booking || reviewByBookingId.has(String(booking.id))) {
      return;
    }

    setReviewDialog(booking);
    setReviewRating(5);
    setReviewContent('');
    setReviewError('');
  }

  function closeReviewDialog() {
    if (reviewSubmitting) {
      return;
    }

    setReviewDialog(null);
    setReviewContent('');
    setReviewError('');
  }

  async function handleSubmitReview(event) {
    event.preventDefault();

    if (!reviewDialog?.id) {
      return;
    }

    setReviewSubmitting(true);
    setReviewError('');

    try {
      const review = await apiRequest(`/customer/bookings/${reviewDialog.id}/review`, {
        method: 'POST',
        body: jsonBody({
          content: reviewContent.trim() || null,
          rating: reviewRating,
        }),
      });
      setReviews((items) => [review, ...items.filter((item) => String(item.bookingId) !== String(review.bookingId))]);
      setReviewDialog(null);
      setReviewContent('');
      setStatus('Review submitted');
      await loadDashboard({ silent: true });
    } catch (error) {
      setReviewError(error.message || 'Unable to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  }

  useEffect(() => {
    document.title = isRecentPage ? 'ParkFinder | Recent Booking' : 'ParkFinder | Active Booking';
    document.body.className = 'customer-dashboard-page';
    document.body.dataset.page = isRecentPage ? 'customer-recent-booking' : 'customer-active-booking';
    loadDashboard();

    const refreshTimer = window.setInterval(() => {
      loadDashboard({ silent: true });
    }, 5000);

    return () => window.clearInterval(refreshTimer);
  }, [isRecentPage]);

  useEffect(() => {
    const previewBookings = activeBookings.filter((booking) => (
      booking.status === 'CHECKED_IN'
      && booking.actualCheckInTime
      && !booking.actualCheckOutTime
    ));

    if (!previewBookings.length) {
      return undefined;
    }

    let cancelled = false;

    async function refreshCheckoutPreviews() {
      const results = await Promise.allSettled(previewBookings.map(async (booking) => {
        const preview = await apiRequest(`/customer/bookings/${booking.id}/checkout-preview`, {
          method: 'POST',
        });
        return [String(booking.id), preview];
      }));

      if (cancelled) {
        return;
      }

      setCheckoutPreviewById((items) => {
        const nextItems = { ...items };
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const [bookingId, preview] = result.value;
            nextItems[bookingId] = preview;
          }
        });
        return nextItems;
      });
    }

    refreshCheckoutPreviews();
    const timer = window.setInterval(refreshCheckoutPreviews, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [checkoutPreviewBookingKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function renderActiveBookingPanel(booking) {
    const bookingId = String(booking.id);
    const currentVehicle = vehicles.find((vehicle) => String(vehicle.id) === String(booking.vehicleId)) || null;
    const currentLot = lots.find((lot) => String(lot.id) === String(booking.parkingLotId)) || null;
    const bookingCode = qrCodesById[bookingId] || booking.bookingCode || booking.id || 'No active booking';
    const qrSeed = String(bookingCode || 'PF');
    const total = bookingTotal(booking);
    const timerInfo = activeTimerState(booking, now);
    const livePricing = activeParkingPricing(booking, currentLot, now);
    const preview = checkoutPreviewById[bookingId];
    const previewBreakdown = preview && String(preview.bookingId) === bookingId
      ? preview.priceBreakdown
      : null;
    const hasBillableParking = Boolean(booking.actualCheckInTime);
    const isRunningBill = hasBillableParking
      && booking.status === 'CHECKED_IN'
      && !booking.actualCheckOutTime;
    const savedBreakdown = booking.priceBreakdown || null;
    const syncedBreakdown = previewBreakdown || (isRunningBill ? livePricing : savedBreakdown);
    const displayParkingFee = hasBillableParking ? syncedBreakdown?.parkingFee || null : null;
    const displayServiceFee = previewBreakdown?.serviceFee || savedBreakdown?.serviceFee || null;
    const displayTax = previewBreakdown?.tax || savedBreakdown?.tax || null;
    const displayTotal = hasBillableParking ? syncedBreakdown?.total || null : null;
    const requiresPayment = ['CHECKED_OUT', 'PENDING_PAYMENT'].includes(booking.status) && !isPaidBooking(booking);
    const showPaymentQr = requiresPayment && isOnlinePaymentMethod(booking.paymentMethod);
    const showDirectPaymentNote = requiresPayment && !isOnlinePaymentMethod(booking.paymentMethod);
    const showCancelBooking = canCustomerCancelBooking(booking);
    const paymentQr = paymentQrPayload(booking, displayTotal || total);
    const pageHeading = booking.status === 'CHECKED_OUT'
      ? 'Final Bill'
      : booking.status === 'PENDING_PAYMENT'
        ? 'Payment Required'
        : 'Active Booking';
    const bookingVehicleBrand = currentVehicle?.brand || booking.vehicleBrand || booking.vehicleType;
    const bookingVehiclePlate = currentVehicle?.plateNumber || booking.plateNumber;
    const bookingVehicleColor = currentVehicle?.color || booking.vehicleColor;
    const bookingVehicleType = currentVehicle?.vehicleType || booking.vehicleType;
    const vehicleLabel = bookingVehiclePlate
      ? `${bookingVehicleBrand ? vehicleTypeText(bookingVehicleBrand) : vehicleTypeText(bookingVehicleType)} ${bookingVehiclePlate}`
      : 'Vehicle pending';
    const vehicleMeta = [
      bookingVehicleColor,
      vehicleTypeText(bookingVehicleType),
    ].filter(Boolean).join(' - ') || 'Vehicle details';
    const mapsHref = parkingLotMapsHref(currentLot);
    const isCanceling = cancelingBookingId === bookingId;

    return (
      <section className="active-booking-panel" key={bookingId}>
        <div className="active-booking-heading">
          <div>
            <div className="active-booking-reference">
              <span>Booking Reference</span>
              <strong>#{booking.bookingCode || booking.id || 'Pending'}</strong>
            </div>
            <h1>{pageHeading}{bookingVehiclePlate ? ` - ${bookingVehiclePlate}` : ''}</h1>
          </div>
          <span className="active-booking-status confirmed">
            {loading ? 'Loading' : statusText(booking.status || 'No Active Booking')}
          </span>
        </div>

        <div className="active-booking-grid">
          <div className="active-booking-left">
            <section className="active-booking-card">
              <div className="active-booking-primary">
                <div className="active-booking-qr-wrap">
                  <div className="active-booking-qr" aria-label="Booking QR placeholder">
                    <span>{qrSeed.slice(0, 2).toUpperCase()}</span>
                    {Array.from({ length: 36 }).map((_, index) => (
                      <i key={`${bookingId}-${index}`} className={(qrSeed.charCodeAt(index % qrSeed.length) + index) % 3 === 0 ? 'filled' : ''} />
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
                    <h2>{currentLot?.name || booking.parkingLotName || booking.parkingLotId}</h2>
                    <p>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
                      </svg>
                      {currentLot?.address || 'Parking lot details from booking'}
                    </p>
                  </div>

                  <div className="active-booking-info-grid">
                    <div>
                      <span>Vehicle</span>
                      <strong>{vehicleLabel}</strong>
                      <small>{vehicleMeta}</small>
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

              <div className="active-booking-timeline" style={{ '--timeline-progress': timelineProgress(booking) }}>
                {[
                  ['created', 'Created', formatDateTime(booking.createdAt)],
                  ['approved', 'Approved', booking.status === 'PENDING_APPROVAL' ? 'Pending' : 'Ready'],
                  ['checkedIn', 'Checked In', booking.actualCheckInTime ? formatDateTime(booking.actualCheckInTime) : 'Staff verification pending'],
                  ['checkout', 'Check out', 'Payment pending'],
                ].map(([key, label, meta]) => (
                  <div className={`active-booking-step ${timelineState(booking, key)}`} key={key}>
                    <span />
                    <strong>{label}</strong>
                    <small>{meta}</small>
                  </div>
                ))}
              </div>
            </section>
            {showCancelBooking ? (
              <button
                className="active-booking-cancel-button"
                disabled={isCanceling}
                onClick={() => handleCancelBooking(booking)}
                type="button"
              >
                {isCanceling ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            ) : null}
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
                <strong>{hasBillableParking ? formatMoney(displayParkingFee) : '-'}</strong>
              </div>
              {hasBillableParking && livePricing ? (
                <small className="active-booking-summary-note">
                  {livePricing.billedHours} billed hour{livePricing.billedHours === 1 ? '' : 's'}
                  {livePricing.usesBands ? ' by time band' : ` x ${formatMoney(livePricing.hourlyRate)}/hour`}
                </small>
              ) : null}
              <div>
                <span>Service Fee</span>
                <strong>{displayServiceFee ? formatMoney(displayServiceFee) : '-'}</strong>
              </div>
              <div>
                <span>Tax</span>
                <strong>{displayTax ? formatMoney(displayTax) : '-'}</strong>
              </div>
              <div className="active-booking-total">
                <span>Total Amount</span>
                <strong>{hasBillableParking ? formatMoney(displayTotal) : '-'}</strong>
              </div>
              <div>
                <span>Payment</span>
                <strong>{statusText(booking.paymentMethod)}</strong>
              </div>
              {showPaymentQr ? (
                <div className="active-booking-payment-qr">
                  <div className="active-payment-qr-code" aria-label="VNPAY payment QR">
                    <img alt="VNPAY payment QR" src={paymentQrImageUrl(paymentQr)} />
                  </div>
                  <div>
                    <span>VNPAY QR</span>
                    <strong>{formatMoney(displayTotal || total)}</strong>
                    <small>{booking.bookingCode || booking.id}</small>
                  </div>
                </div>
              ) : null}
              {showDirectPaymentNote ? (
                <div className="active-booking-payment-note">
                  <strong>{statusText(booking.paymentMethod)}</strong>
                  <small>Please settle this payment directly with the parking lot staff.</small>
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
      </section>
    );
  }

  function renderRecentBookingSection() {
    return (
      <section className="active-booking-recent customer-recent-booking-page">
        <div className="active-booking-section-head">
          <h2>Recent Booking</h2>
          <span>{recentBookings.length} completed</span>
        </div>

        {recentBookings.length ? (
          <div className="active-booking-recent-list">
            {recentBookings.map((booking) => {
              const vehicle = vehicles.find((item) => String(item.id) === String(booking.vehicleId));
              const lot = lots.find((item) => item.id === booking.parkingLotId);
              const isPaid = String(booking.paymentStatus || '').toUpperCase() === 'PAID';
              const amount = formatMoney(bookingTotal(booking));
              const paidAmount = isPaid ? amount : `${amount} due`;
              const review = reviewByBookingId.get(String(booking.id));

              return (
                <article className="active-booking-recent-card" key={booking.id}>
                  <div>
                    <span>Vehicle</span>
                    <strong>{vehicle?.plateNumber || booking.plateNumber || 'Vehicle pending'}</strong>
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
                  <div className="active-booking-review-cell">
                    {review ? (
                      <strong className="active-booking-reviewed">{reviewStars(review.rating)}</strong>
                    ) : (
                      <button
                        className="active-booking-review-button"
                        onClick={() => openReviewDialog(booking)}
                        type="button"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="active-booking-recent-empty">No completed bookings yet.</div>
        )}
      </section>
    );
  }

  return (
    <div className="customer-dashboard">
      <CustomerSidebar active={isRecentPage ? 'recent' : 'dashboard'} initials={initials} name={name} />

      <main className="customer-main active-booking-main">
        <header className="customer-top-nav">
          <div className="customer-mobile-title">
            <strong>ParkFinder</strong>
            <span>{isRecentPage ? 'Recent Booking' : 'Active Booking'}</span>
          </div>
        </header>

        <section className="customer-content active-booking-content" id="active-booking">
          {!isRecentPage && activeBookings.length ? (
            <section className="active-booking-list">
              <div className="active-booking-section-head">
                <h2>Active Booking</h2>
                <span>{activeBookings.length} vehicle{activeBookings.length === 1 ? '' : 's'}</span>
              </div>
              {activeBookings.map((booking) => renderActiveBookingPanel(booking))}
            </section>
          ) : !isRecentPage ? (
            <section className="active-booking-recent-empty">No active booking right now.</section>
          ) : null}

          {isRecentPage ? renderRecentBookingSection() : null}
        </section>
      </main>

      <CustomerMobileNav active={isRecentPage ? 'recent' : 'dashboard'} />

      {reviewDialog ? (
        <section
          aria-hidden="false"
          className="active-review-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReviewDialog();
            }
          }}
        >
          <form className="active-review-card" onSubmit={handleSubmitReview}>
            <div className="active-review-head">
              <div>
                <span>Parking Review</span>
                <h2>{lots.find((lot) => lot.id === reviewDialog.parkingLotId)?.name || reviewDialog.parkingLotName || 'Your parking session'}</h2>
              </div>
              <button aria-label="Close review dialog" onClick={closeReviewDialog} type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z" />
                </svg>
              </button>
            </div>

            <div className="active-review-session">
              <span>{reviewDialog.bookingCode || reviewDialog.id}</span>
              <strong>{vehicleTypeText(reviewDialog.vehicleType)} {reviewDialog.plateNumber || 'Vehicle'}</strong>
              <small>{formatParkingDuration(reviewDialog, now)} parked time</small>
            </div>

            <div className="active-review-stars" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  aria-checked={reviewRating === value}
                  className={value <= reviewRating ? 'active' : ''}
                  key={value}
                  onClick={() => setReviewRating(value)}
                  role="radio"
                  type="button"
                >
                  ★
                </button>
              ))}
            </div>

            <label className="active-review-field">
              <span>Your review</span>
              <textarea
                maxLength={2000}
                onChange={(event) => setReviewContent(event.target.value)}
                placeholder="Share what worked well, entry experience, safety, staff support..."
                rows={5}
                value={reviewContent}
              />
            </label>

            {reviewError ? <p className="active-review-error">{reviewError}</p> : null}

            <div className="active-review-actions">
              <button disabled={reviewSubmitting} onClick={closeReviewDialog} type="button">Cancel</button>
              <button disabled={reviewSubmitting} type="submit">
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

export function CustomerRecentBookings() {
  return <CustomerDashboard view="recent" />;
}
