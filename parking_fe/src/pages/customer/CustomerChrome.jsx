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
    logo: 'M7 20V4h7.1c3.4 0 5.9 2.3 5.9 5.6s-2.5 5.7-5.9 5.7h-3.7V20H7Zm3.4-7.8h3.4c1.6 0 2.8-1 2.8-2.6S15.4 7 13.8 7h-3.4v5.2Z',
    profile: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.1-8 5v1h16v-1c0-2.9-3.6-5-8-5Z',
    recent: 'M13 3a9 9 0 1 0 8.9 10H20a7 7 0 1 1-7-8V3Zm-1 4h2v6h5v2h-7V7Z',
    vehicles: 'M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h1a2 2 0 0 1 2 2v5h-2v-2H4v2H2v-5a2 2 0 0 1 2-2h1Zm2.1 0h9.8l-1.1-3.2a.8.8 0 0 0-.8-.6H9a.8.8 0 0 0-.8.6L7.1 11ZM6 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm12 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[type]} />
    </svg>
  );
}

const navItems = [
  { key: 'dashboard', label: 'Active Bookings', href: '/customer.html' },
  { key: 'recent', label: 'Recent Booking', href: '/customer-recent.html' },
  { key: 'vehicles', label: 'Vehicles', href: '/customer-vehicles.html' },
  { key: 'profile', label: 'My Profile', href: '/customer-profile.html' },
];

export function CustomerSidebar({ active, initials, name }) {
  function logout() {
    clearSession();
    window.location.href = '/auth.html';
  }

  return (
    <aside className="customer-side-nav customer-chrome-nav">
      <a className="customer-brand" href="/">
        <span className="customer-brand-mark"><NavIcon type="logo" /></span>
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
