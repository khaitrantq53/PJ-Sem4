const icons = {
  account: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.1-8 5v1h16v-1c0-2.9-3.6-5-8-5Z" /></svg>',
  add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" /></svg>',
  bookings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z" /></svg>',
  capacity: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5V3Zm2 2v4h10V5H7Zm0 6v8h4v-8H7Zm6 0v8h4v-8h-4Z" /></svg>',
  dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z" /></svg>',
  logo: '<svg viewBox="0 0 24 24"><path d="M7 20V4h7.1c3.4 0 5.9 2.3 5.9 5.6s-2.5 5.7-5.9 5.7h-3.7V20H7Zm3.4-7.8h3.4c1.6 0 2.8-1 2.8-2.6S15.4 7 13.8 7h-3.4v5.2Z" /></svg>',
  lots: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.3-3.3 1.4-1.4 1.9 1.9 4.6-4.6 1.4 1.4-6 6Z" /></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z" /></svg>',
  operations: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4V6Zm3 5h10v2H7v-2Zm3 5h4v2h-4v-2Z" /></svg>',
  reports: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16v2H4v-2Zm2-8h3v6H6v-6Zm5-6h3v12h-3V5Zm5 3h3v9h-3V8Z" /></svg>',
};

const navItems = [
  { key: 'dashboard', href: '/staff.html', icon: icons.dashboard, label: 'Dashboard' },
  { key: 'lots', href: '/staff-parking-lots.html', icon: icons.lots, label: 'My Parking Lot' },
  { key: 'bookings', href: '/staff-bookings.html', icon: icons.bookings, label: 'Bookings' },
  { key: 'operations', href: '#operations', icon: icons.operations, label: 'Operations' },
];

function staffNav(activeNav) {
  return navItems.map((item) => `
    <a class="${item.key === activeNav ? 'active' : ''}" href="${item.href}">
      ${item.icon}
      ${item.label}
    </a>
  `).join('');
}

export function staffHeadActions(primaryAction = '') {
  return `
    <div class="staff-head-actions" id="account">
      ${primaryAction}
      <button class="staff-avatar" type="button" data-account-avatar>ST</button>
      <button class="staff-logout" type="button" data-action="logout">Logout</button>
    </div>
  `;
}

export function staffButton(label, icon = '', extraClass = 'staff-export-button') {
  return `
    <button class="${extraClass}" type="button">
      ${icon}
      ${label}
    </button>
  `;
}

export function createStaffPage({
  activeNav,
  content,
  contentClass = '',
  pageClass = '',
  pageKey,
  sideFooterAction = '',
  sideFooterHref = '/staff-parking-lots.html#create-lot',
  sideFooterLabel = 'Add Location',
  title,
}) {
  return {
    title,
    bodyClass: 'staff-dashboard-page',
    pageKey,
    markup: `
      <div class="staff-dashboard ${pageClass}">
        <aside class="staff-side-nav">
          <a class="staff-brand" href="/" aria-label="ParkFinder">
            <span class="staff-brand-mark" aria-hidden="true">${icons.logo}</span>
            <span>
              <strong>ParkFinder</strong>
              <small>Staff Hub</small>
            </span>
          </a>

          <nav class="staff-nav-links" aria-label="Staff navigation">
            ${staffNav(activeNav)}
          </nav>

          <div class="staff-side-footer">
            <a class="staff-location-button" href="${sideFooterHref}">
              ${icons.add}
              ${sideFooterLabel}
            </a>
            ${staffHeadActions(sideFooterAction)}
          </div>
        </aside>

        <main class="staff-main">
          <header class="staff-mobile-bar">
            <a class="staff-mobile-brand" href="/">ParkFinder</a>
            <button type="button" aria-label="Open menu">${icons.menu}</button>
          </header>

          <section class="staff-content ${contentClass}">
            ${content}
          </section>
        </main>
      </div>
    `,
  };
}

export { icons };
