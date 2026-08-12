import { clearSession } from '../../services/api.js';

export function initialsFor(label) {
  const clean = String(label || 'Customer').replace(/@.*/, '');
  const pieces = clean.split(/[.\-_\s]+/).filter(Boolean);
  const initials = pieces.length > 1 ? `${pieces[0][0]}${pieces[1][0]}` : clean.slice(0, 2);
  return initials.toUpperCase();
}

function NavIcon({ type }) {
  const paths = {
    dashboard: 'M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z',
    vehicles: 'M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h1a2 2 0 0 1 2 2v5h-2v-2H4v2H2v-5a2 2 0 0 1 2-2h1Zm2.1 0h9.8l-1.1-3.2a.8.8 0 0 0-.8-.6H9a.8.8 0 0 0-.8.6L7.1 11ZM6 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm12 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
    payments: 'M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12H6a3 3 0 0 1-3-3V6Zm3-1a1 1 0 0 0-1 1v2h14V6a1 1 0 0 0-1-1H6Zm-1 5v5a1 1 0 0 0 1 1h13v-6H5Z',
    support: 'M11 18h2v-2h-2v2Zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm0-14a3.2 3.2 0 0 0-3.4 3h2A1.3 1.3 0 0 1 12 8a1.2 1.2 0 0 1 1.3 1.2c0 .8-.5 1.2-1.4 1.8-1.1.8-1.9 1.5-1.9 3h2c0-.7.5-1.1 1.2-1.6 1.1-.8 2.1-1.6 2.1-3.2A3.1 3.1 0 0 0 12 6Z',
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[type]} />
    </svg>
  );
}

const navItems = [
  { key: 'dashboard', label: 'Active Bookings', href: '/customer.html' },
  { key: 'vehicles', label: 'Vehicles', href: '/customer-vehicles.html' },
  { key: 'payments', label: 'Payments', href: '/customer-payments.html' },
  { key: 'support', label: 'Support', href: '/customer-support.html' },
];

export function CustomerSidebar({ active, initials, name }) {
  function logout() {
    clearSession();
    window.location.href = '/auth.html';
  }

  return (
    <aside className="customer-side-nav customer-chrome-nav">
      <a className="customer-brand" href="/">
        <span className="customer-avatar">{initials}</span>
        <span><strong>ParkFinder</strong><small>Premium Parking</small></span>
      </a>

      <nav aria-label="Customer navigation">
        {navItems.map((item) => (
          <a className={active === item.key ? 'active' : ''} href={item.href} key={item.key}>
            <NavIcon type={item.key} />
            {item.label}
          </a>
        ))}
      </nav>

      <div className="customer-nav-profile">
        <div className="customer-nav-profile-main">
          <span className="customer-avatar">{initials}</span>
          <div>
            <strong>{name}</strong>
            <small>Pro Member</small>
          </div>
        </div>
        <button className="customer-nav-logout" type="button" onClick={logout}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 17v-2h4V9h-4V7h6v10h-6Zm-2.5 3A2.5 2.5 0 0 1 5 17.5v-11A2.5 2.5 0 0 1 7.5 4H11v2H7.5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5H11v2H7.5Zm8.8-4.3-1.4-1.4 1.3-1.3H10v-2h6.2l-1.3-1.3 1.4-1.4L20 12l-3.7 3.7Z" />
          </svg>
          Log out
        </button>
      </div>
    </aside>
  );
}

export function CustomerMobileNav({ active }) {
  return (
    <nav className="customer-mobile-nav" aria-label="Customer mobile navigation">
      {navItems.map((item) => (
        <a className={active === item.key ? 'active' : ''} href={item.href} key={item.key}>
          <NavIcon type={item.key} />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
