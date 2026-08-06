const dashboardRuntime = () => import('../features/dashboard/dashboard.runtime.js');

export const runtimeLoaders = {
  'index.html': () => import('../features/home/home.runtime.js'),
  'parking-detail.html': () => import('../features/parking-detail/parkingDetail.runtime.js'),
  'confirm-booking.html': () => import('../features/confirm-booking/confirmBooking.runtime.js'),
  'auth.html': dashboardRuntime,
  'staff.html': dashboardRuntime,
};

export function getCurrentPageName() {
  const path = window.location.pathname;
  if (path === '/' || path === '') {
    return 'index.html';
  }

  return path.split('/').pop() || 'index.html';
}
