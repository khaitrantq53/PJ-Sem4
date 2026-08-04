import { homePage } from "./legacy/homePage.js";
import { authPage } from "./legacy/authPage.js";
import { customerPage } from "./legacy/customerPage.js";
import { staffPage } from "./legacy/staffPage.js";
import { parkingDetailPage } from "./legacy/parkingDetailPage.js";
import { confirmBookingPage } from "./legacy/confirmBookingPage.js";
import { adminPage } from "./legacy/adminPage.js";
import { adminUsersPage } from "./legacy/adminUsersPage.js";
import { adminStaffPage } from "./legacy/adminStaffPage.js";
import { adminLotsPage } from "./legacy/adminLotsPage.js";
import { adminRefundsPage } from "./legacy/adminRefundsPage.js";
import { adminAuditPage } from "./legacy/adminAuditPage.js";
import { adminBookingsPage } from "./legacy/adminBookingsPage.js";

export const legacyPages = {
  "index.html": homePage,
  "auth.html": authPage,
  "customer.html": customerPage,
  "staff.html": staffPage,
  "parking-detail.html": parkingDetailPage,
  "confirm-booking.html": confirmBookingPage,
  "admin.html": adminPage,
  "admin-users.html": adminUsersPage,
  "admin-staff.html": adminStaffPage,
  "admin-lots.html": adminLotsPage,
  "admin-refunds.html": adminRefundsPage,
  "admin-audit.html": adminAuditPage,
  "admin-bookings.html": adminBookingsPage,
};
