const icons = {
  audit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6V3Zm2 2v14h8V5H8Zm2 3h4v2h-4V8Zm0 4h4v2h-4v-2Z" /></svg>',
  bookings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z" /></svg>',
  dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z" /></svg>',
  lots: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.3-3.3 1.4-1.4 1.9 1.9 4.6-4.6 1.4 1.4-6 6Z" /></svg>',
  money: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Zm2 2v8h12V8H6Zm6 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /></svg>',
  requests: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5V3Zm9 2v4h4l-4-4ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Zm0-8h4v2H8V7Z" /></svg>',
  staff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm6 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM9 13c-3.9 0-7 1.9-7 4.2V20h14v-2.8C16 14.9 12.9 13 9 13Zm6.3 1c1.7.8 2.7 1.9 2.7 3.2V20h4v-2.4c0-1.9-2.7-3.4-6.7-3.6Z" /></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.1-8 5v1h16v-1c0-2.9-3.6-5-8-5Z" /></svg>',
};

const navItems = [
  { href: '/admin.html', label: 'Dashboard', icon: icons.dashboard },
  { href: '/admin-users.html', label: 'Customers', icon: icons.users },
  { href: '/admin-staff.html', label: 'Staff', icon: icons.staff },
  { href: '/admin-lots.html', label: 'Parking Lots', icon: icons.lots },
  { href: '/admin-requests.html', label: 'Requests', icon: icons.requests },
  { href: '/admin-bookings.html', label: 'Bookings', icon: icons.bookings },
  { href: '/admin-refunds.html', label: 'Refunds', icon: icons.money },
  { href: '/admin-audit.html', label: 'Audit Logs', icon: icons.audit },
];

export function adminSidebarMarkup() {
  const currentPath = (typeof window !== 'undefined' ? window.location.pathname : '')
    .replace(/\/+$/, '')
    .replace(/index\.html$/, '') || '/';

  const links = navItems
    .map((item) => {
      const isActive = currentPath === item.href;
      return `<a${isActive ? ' class="active"' : ''} href="${item.href}"${isActive ? ' aria-current="page"' : ''}>${item.icon}${item.label}</a>`;
    })
    .join('\n          ');

  return `
      <aside class="admin-side-nav">
        <a class="admin-brand" href="/" aria-label="ParkFinder">
          <span class="admin-brand-mark" aria-hidden="true"></span>
          <span>
            <strong>ParkFinder</strong>
            <small>Admin Hub</small>
          </span>
        </a>

        <nav class="admin-nav-links" aria-label="Admin navigation">
          ${links}
        </nav>

        <div class="admin-side-footer">
          <a class="admin-icon-button" href="/admin-staff.html">
            <span class="material-symbols-outlined" aria-hidden="true">person_add</span>
            Add Staff
          </a>
          <button class="admin-logout-button" type="button" data-action="logout">
            <span class="material-symbols-outlined" aria-hidden="true">logout</span>
            Logout
          </button>
        </div>
      </aside>
  `;
}

export function withUnifiedAdminSidebar(markup) {
  return String(markup)
    .replace('<div class="admin-console">', '<div class="admin-console admin-dashboard-shell">')
    .replace(
      /<aside class="admin-side-nav">[\s\S]*?<\/aside>/,
      () => adminSidebarMarkup(),
    );
}
