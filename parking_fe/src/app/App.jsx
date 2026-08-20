import { AdminAudit } from '../pages/admin/AdminAudit.jsx';
import { AdminBookings } from '../pages/admin/AdminBookings.jsx';
import { AdminDashboard } from '../pages/admin/AdminDashboard.jsx';
import { AdminFinance } from '../pages/admin/AdminFinance.jsx';
import { AdminLots } from '../pages/admin/AdminLots.jsx';
import { AdminRequests } from '../pages/admin/AdminRequests.jsx';
import { AdminStaff } from '../pages/admin/AdminStaff.jsx';
import { AdminUsers } from '../pages/admin/AdminUsers.jsx';
import { AuthPage } from '../pages/auth/AuthPage.jsx';
import { ConfirmRegistrationPage } from '../pages/auth/ConfirmRegistrationPage.jsx';
import { ConfirmBookingPage } from '../pages/booking/ConfirmBookingPage.jsx';
import { CustomerDashboard } from '../pages/customer/CustomerDashboard.jsx';
import { CustomerPayments } from '../pages/customer/CustomerPayments.jsx';
import { CustomerProfile } from '../pages/customer/CustomerProfile.jsx';
import { CustomerSupport } from '../pages/customer/CustomerSupport.jsx';
import { CustomerVehicles } from '../pages/customer/CustomerVehicles.jsx';
import { HomePage } from '../pages/home/HomePage.jsx';
import { ParkingDetailPage } from '../pages/parking/ParkingDetailPage.jsx';
import { StaffBookingsPage } from '../pages/staff/StaffBookingsPage.jsx';
import { StaffCommissionsPage } from '../pages/staff/StaffCommissionsPage.jsx';
import { StaffPage } from '../pages/staff/StaffPage.jsx';
import { StaffParkingLotsPage } from '../pages/staff/StaffParkingLotsPage.jsx';
import { getCurrentPageName, runtimeLoaders } from './routes.js';

const adminComponents = {
  'admin.html': AdminDashboard,
  'admin-users.html': AdminUsers,
  'admin-staff.html': AdminStaff,
  'admin-lots.html': AdminLots,
  'admin-requests.html': AdminRequests,
  'admin-finance.html': AdminFinance,
  'admin-refunds.html': AdminFinance,
  'admin-audit.html': AdminAudit,
  'admin-bookings.html': AdminBookings,
};

const pageComponents = {
  'index.html': HomePage,
  'auth.html': AuthPage,
  'confirm.html': ConfirmRegistrationPage,
  'staff.html': StaffPage,
  'staff-parking-lots.html': StaffParkingLotsPage,
  'staff-bookings.html': StaffBookingsPage,
  'staff-commissions.html': StaffCommissionsPage,
  'parking-detail.html': ParkingDetailPage,
  'confirm-booking.html': ConfirmBookingPage,
};

function ensureDefaultParkingConfig() {
  window.PARKING_CONFIG = window.PARKING_CONFIG || {
    defaultMapCenter: { lat: 21.0278, lng: 105.8342 },
    defaultMapZoom: 13,
  };
}

function loadRuntimeConfig() {
  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-parking-config]');
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = '/config.js';
    script.async = true;
    script.dataset.parkingConfig = 'true';
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });
}

async function beforeRuntimeLoad(pageName) {
  ensureDefaultParkingConfig();

  if (pageName === 'index.html') {
    await loadRuntimeConfig();
    ensureDefaultParkingConfig();
  }
}

export default function App() {
  const pageName = getCurrentPageName();

  if (pageName === 'customer.html') {
    return <CustomerDashboard />;
  }

  if (pageName === 'customer-support.html') {
    return <CustomerSupport />;
  }

  if (pageName === 'customer-payments.html') {
    return <CustomerPayments />;
  }

  if (pageName === 'customer-vehicles.html') {
    return <CustomerVehicles />;
  }

  if (pageName === 'customer-profile.html') {
    return <CustomerProfile />;
  }

  const AdminComponent = adminComponents[pageName];
  if (AdminComponent) {
    return <AdminComponent />;
  }

  const PageComponent = pageComponents[pageName] || HomePage;
  const runtimePageName = pageComponents[pageName] ? pageName : 'index.html';

  return (
    <PageComponent
      beforeRuntimeLoad={() => beforeRuntimeLoad(runtimePageName)}
      runtimeLoader={runtimeLoaders[runtimePageName]}
    />
  );
}
