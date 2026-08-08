const dashboardRuntime = () => import('../features/dashboard/dashboard.runtime.js');
const staffRuntime = () => import('../features/staff/staff.runtime.js');

export const runtimeLoaders = {
  'index.html': () => import('../features/home/home.runtime.js'),
  'parking-detail.html': () => import('../features/parking-detail/parkingDetail.runtime.js'),
  'confirm-booking.html': () => import('../features/confirm-booking/confirmBooking.runtime.js'),
  'auth.html': dashboardRuntime,
  'staff.html': staffRuntime,
  'staff-parking-lots.html': staffRuntime,
  'staff-bookings.html': staffRuntime,
};

export function getCurrentPageName() {
  const path = window.location.pathname;
  if (path === '/' || path === '') {
    return 'index.html';
  }

  return path.split('/').pop() || 'index.html';
}
