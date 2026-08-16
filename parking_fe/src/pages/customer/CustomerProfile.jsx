import { useEffect, useMemo, useRef, useState } from 'react';
import {
  apiPage,
  apiRequest,
  jsonBody,
} from '../../services/api.js';
import { CustomerMobileNav, CustomerSidebar, initialsFor } from './CustomerChrome.jsx';

const activeBookingStatuses = ['PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'OVERDUE'];
const finishedBookingStatuses = ['COMPLETED', 'CHECKED_OUT'];

function isUnauthorized(error) {
  return error.message.toLowerCase().includes('401')
    || error.message.toLowerCase().includes('unauthorized');
}

function profileName(profile, account) {
  return profile?.fullName || account?.email || account?.phone || 'Customer';
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function statusText(value) {
  return String(value || '-').replaceAll('_', ' ');
}

function Icon({ type }) {
  const paths = {
    active: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.1 13.9-3.8-3.8 1.4-1.4 2.4 2.4 4.9-4.9 1.4 1.4-6.3 6.3Z',
    booking: 'M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z',
    car: 'M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h1a2 2 0 0 1 2 2v5h-2v-2H4v2H2v-5a2 2 0 0 1 2-2h1Zm2.1 0h9.8l-1.1-3.2a.8.8 0 0 0-.8-.6H9a.8.8 0 0 0-.8.6L7.1 11Z',
    close: 'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z',
    edit: 'm4 17.3-.8 3.5 3.5-.8 10.7-10.7-2.7-2.7L4 17.3ZM19.6 7.1a1.9 1.9 0 0 0 0-2.7 1.9 1.9 0 0 0-2.7 0l-1 1 2.7 2.7 1-1Z',
    image: 'M9 3 7.2 5H4a2 2 0 0 0-2 2v12h20V7a2 2 0 0 0-2-2h-3.2L15 3H9Zm3 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
    key: 'M7.5 14A5.5 5.5 0 1 1 13 8.5c0 .7-.1 1.3-.3 1.9L22 19.7V22h-3v-2h-2v-2h-2.3l-3.2-3.2c-.8.7-2.2 1.2-4 1.2Zm0-8A2.5 2.5 0 1 0 10 8.5 2.5 2.5 0 0 0 7.5 6Z',
    mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 4.2V18h16V8.2l-8 5.3-8-5.3ZM5.2 6l6.8 4.5L18.8 6H5.2Z',
    phone: 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11.8 11.8 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.4a1 1 0 0 1 1 1 11.8 11.8 0 0 0 .6 3.6 1 1 0 0 1-.2 1l-2.2 2.2Z',
    shield: 'M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.3-3.3 1.4-1.4 1.9 1.9 4.6-4.6 1.4 1.4-6 6Z',
    user: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.1-8 5v1h16v-1c0-2.9-3.6-5-8-5Z',
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[type]} />
    </svg>
  );
}

function AvatarPreview({ className, initials, previewUrl }) {
  return (
    <div className={className}>
      {previewUrl ? <img alt="Selected profile avatar" src={previewUrl} /> : initials}
    </div>
  );
}

export function CustomerProfile() {
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({ email: '', fullName: '', phone: '' });
  const [profileDraft, setProfileDraft] = useState({ email: '', fullName: '', phone: '' });
  const [passwordDraft, setPasswordDraft] = useState({
    confirmPassword: '',
    currentPassword: '',
    newPassword: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [status, setStatus] = useState('Loading');
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef(null);
  const avatarPreviewUrlRef = useRef('');
  const profileNameInputRef = useRef(null);
  const currentPasswordInputRef = useRef(null);

  const name = profileName(profile, account);
  const initials = initialsFor(name);
  const displayEmail = form.email || profile?.email || account?.email || '';
  const displayPhone = form.phone || profile?.phone || account?.phone || '';
  const defaultVehicle = vehicles.find((vehicle) => vehicle.defaultVehicle) || vehicles[0] || null;
  const activeBookings = bookings.filter((booking) => activeBookingStatuses.includes(booking.status));
  const completedBookings = bookings.filter((booking) => finishedBookingStatuses.includes(booking.status));
  const accountStatus = statusText(account?.status || 'ACTIVE');

  const overviewCards = useMemo(() => [
    ['Vehicles', vehicles.length, 'Registered vehicles', 'car'],
    ['Active', activeBookings.length, 'Bookings in progress', 'active'],
    ['Completed', completedBookings.length, 'Finished sessions', 'booking'],
  ], [activeBookings.length, completedBookings.length, vehicles.length]);

  async function loadProfile() {
    setStatus('Loading');

    try {
      const currentAccount = await apiRequest('/auth/me');

      if (currentAccount.role !== 'CUSTOMER') {
        window.location.href = currentAccount.role === 'ADMIN' ? '/admin-users.html' : '/staff.html';
        return;
      }

      const profileResponse = await apiRequest('/customers/me');

      setAccount(currentAccount);
      setProfile(profileResponse);
      setForm({
        email: profileResponse.email || currentAccount.email || '',
        fullName: profileResponse.fullName || '',
        phone: profileResponse.phone || currentAccount.phone || '',
      });
      setProfileDraft({
        email: profileResponse.email || currentAccount.email || '',
        fullName: profileResponse.fullName || '',
        phone: profileResponse.phone || currentAccount.phone || '',
      });
      setStatus('Online');

      const [vehicleResult, bookingResult] = await Promise.allSettled([
        apiRequest('/customer/vehicles'),
        apiPage('/customer/bookings', { size: 50 }),
      ]);

      if (vehicleResult.status === 'fulfilled') {
        setVehicles(vehicleResult.value);
      }

      if (bookingResult.status === 'fulfilled') {
        setBookings(bookingResult.value.items);
      }
    } catch (error) {
      setStatus(error.message);
      if (isUnauthorized(error)) {
        window.location.href = '/auth.html';
      }
    }
  }

  useEffect(() => {
    document.title = 'ParkFinder | My Profile';
    document.body.className = 'customer-dashboard-page';
    document.body.dataset.page = 'customer-profile';
    loadProfile();
  }, []);

  useEffect(() => () => {
    if (avatarPreviewUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewUrlRef.current);
    }
  }, []);

  useEffect(() => {
    if (!profileModalOpen) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      profileNameInputRef.current?.focus();
      profileNameInputRef.current?.setSelectionRange(
        profileNameInputRef.current.value.length,
        profileNameInputRef.current.value.length,
      );
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [profileModalOpen]);

  useEffect(() => {
    if (!passwordModalOpen) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      currentPasswordInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [passwordModalOpen]);

  async function submitProfile(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('Saving profile');

    try {
      let updated = await apiRequest('/customers/me', {
        body: jsonBody({
          email: profileDraft.email.trim(),
          fullName: profileDraft.fullName.trim(),
          phone: profileDraft.phone.trim(),
          version: profile?.version,
        }),
        method: 'PATCH',
      });

      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.append('file', avatarFile);
        updated = await apiRequest('/customers/me/avatar', {
          body: avatarData,
          method: 'POST',
        });
        setAvatarFile(null);
      }

      setProfile(updated);
      setAccount((current) => ({
        ...current,
        email: updated.email,
        phone: updated.phone,
      }));
      setForm({
        email: updated.email || '',
        fullName: updated.fullName || '',
        phone: updated.phone || '',
      });
      setProfileDraft({
        email: updated.email || '',
        fullName: updated.fullName || '',
        phone: updated.phone || '',
      });
      setProfileModalOpen(false);
      setStatus('Profile updated');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitPassword(event) {
    event.preventDefault();

    if (passwordDraft.newPassword.length < 8) {
      setStatus('New password must be at least 8 characters');
      return;
    }

    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setStatus('New password confirmation does not match');
      return;
    }

    setSaving(true);
    setStatus('Changing password');

    try {
      await apiRequest('/auth/change-password', {
        body: jsonBody({
          currentPassword: passwordDraft.currentPassword,
          newPassword: passwordDraft.newPassword,
        }),
        method: 'POST',
      });

      setPasswordDraft({
        confirmPassword: '',
        currentPassword: '',
        newPassword: '',
      });
      setPasswordModalOpen(false);
      setStatus('Password updated');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  function openProfileModal() {
    setProfileDraft({
      email: displayEmail,
      fullName: profile?.fullName || form.fullName || '',
      phone: displayPhone,
    });
    setProfileModalOpen(true);
  }

  function openPasswordModal() {
    setPasswordDraft({
      confirmPassword: '',
      currentPassword: '',
      newPassword: '',
    });
    setPasswordModalOpen(true);
  }

  function openAvatarPicker() {
    avatarInputRef.current?.click();
  }

  function handleAvatarFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (avatarPreviewUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    avatarPreviewUrlRef.current = previewUrl;
    setAvatarPreviewUrl(previewUrl);
    setAvatarFile(file);
    event.target.value = '';
  }

  return (
    <div className="customer-dashboard customer-profile-page">
      <CustomerSidebar active="profile" initials={initials} name={name} />

      <main className="customer-main">
        <header className="customer-top-nav">
          <div className="customer-mobile-title">
            <strong>ParkFinder</strong>
            <span>My Profile</span>
          </div>
        </header>

        <section className="customer-content customer-profile-content">
          <div className="profile-page-heading">
            <div>
              <h1>My Profile</h1>
              <p>Manage your personal information, security settings, and booking preferences.</p>
            </div>
            <span className={`customer-status ${['Online', 'Profile updated', 'Password updated'].includes(status) ? 'online' : ''}`}>{status}</span>
          </div>

          <section className="profile-hero-card">
            <div className="profile-avatar-block">
              <AvatarPreview className="profile-avatar-large" initials={initials} previewUrl={avatarPreviewUrl} />
              <button type="button" aria-label="Edit avatar" onClick={openProfileModal}>
                <Icon type="edit" />
              </button>
            </div>

            <div className="profile-hero-details">
              <div className="profile-name-row">
                <h2>{name}</h2>
                <span><i aria-hidden="true" /> {accountStatus}</span>
              </div>
              <div className="profile-contact-lines">
                <span><Icon type="mail" />{displayEmail || 'Email not set'}</span>
                <span><Icon type="phone" />{displayPhone || 'Phone not set'}</span>
              </div>
              <p>Member since: {formatDate(profile?.createdAt || account?.createdAt)}</p>
            </div>
          </section>

          <section className="profile-overview-grid">
            {overviewCards.map(([label, value, helper, icon]) => (
              <article className="profile-overview-card" key={label}>
                <span><Icon type={icon} /></span>
                <div>
                  <strong>{value}</strong>
                  <p>{label}</p>
                  <small>{helper}</small>
                </div>
              </article>
            ))}
          </section>

          <div className="profile-bento-grid">
            <section className="profile-panel profile-personal-panel">
              <div className="profile-panel-head">
                <h3><Icon type="user" /> Personal Information</h3>
              </div>

              <div className="profile-detail-list">
                <article>
                  <span>Full Name</span>
                  <strong>{form.fullName || name}</strong>
                </article>
                <article>
                  <span>Email Address</span>
                  <strong>{displayEmail || 'Email not set'}</strong>
                </article>
                <article>
                  <span>Phone Number</span>
                  <strong>{displayPhone || 'Phone not set'}</strong>
                </article>
                <button className="profile-primary-button" disabled={saving} type="button" onClick={openProfileModal}>
                  Update Details
                </button>
              </div>
            </section>

            <section className="profile-panel profile-security-panel">
              <div className="profile-panel-head">
                <h3><Icon type="shield" /> Account Security</h3>
              </div>

              <div className="profile-verification-list">
                <article>
                  <span><Icon type="mail" /></span>
                  <div>
                    <strong>Email Verification</strong>
                    <small>{displayEmail ? 'Verified' : 'Not connected'}</small>
                  </div>
                </article>
                <article>
                  <span><Icon type="phone" /></span>
                  <div>
                    <strong>Phone Verification</strong>
                    <small>{displayPhone ? 'Verified' : 'Not connected'}</small>
                  </div>
                </article>
              </div>

              <button
                className="profile-secondary-button"
                type="button"
                onClick={openPasswordModal}
              >
                <Icon type="key" />
                Change Password
              </button>

              <p className="profile-security-note">Last login details can be shown here when the session audit API is available.</p>
            </section>

            <section className="profile-panel profile-preferences-panel">
              <div className="profile-panel-head">
                <h3><Icon type="booking" /> Booking Preferences</h3>
              </div>

              <div className="profile-preference-list">
                <div>
                  <span>Default Vehicle</span>
                  <strong>{defaultVehicle?.plateNumber || 'No default vehicle'}</strong>
                  <small>{defaultVehicle ? `${defaultVehicle.brand || defaultVehicle.vehicleType || 'Vehicle'}${defaultVehicle.color ? ` - ${defaultVehicle.color}` : ''}` : 'Add a vehicle to speed up booking.'}</small>
                </div>
                <div>
                  <span>Preferred Drop-off</span>
                  <strong>Self drop-off</strong>
                  <small>Uses the booking flow default.</small>
                </div>
              </div>

              <a className="profile-secondary-link" href="/customer-vehicles.html">Manage vehicles</a>
            </section>
          </div>
        </section>
      </main>

      <CustomerMobileNav active="profile" />

      {profileModalOpen && (
        <div
          className="profile-dialog-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setProfileModalOpen(false);
            }
          }}
        >
          <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profileDialogTitle">
            <div className="profile-dialog-titlebar">
              <h2 id="profileDialogTitle">Edit profile</h2>
              <button
                type="button"
                aria-label="Close profile editor"
                disabled={saving}
                onClick={() => setProfileModalOpen(false)}
              >
                <Icon type="close" />
              </button>
            </div>

            <form className="profile-dialog-form" onSubmit={submitProfile}>
              <div className="profile-dialog-avatar-section">
                <button
                  className="profile-dialog-avatar-picker"
                  disabled={saving}
                  type="button"
                  onClick={openAvatarPicker}
                >
                  <AvatarPreview className="profile-dialog-avatar" initials={initials} previewUrl={avatarPreviewUrl} />
                  <span>
                    <Icon type="image" />
                    Choose avatar
                  </span>
                </button>
                <input
                  accept="image/*"
                  aria-label="Choose profile avatar"
                  disabled={saving}
                  onChange={handleAvatarFileChange}
                  ref={avatarInputRef}
                  type="file"
                />
                {avatarFile && <small>{avatarFile.name}</small>}
              </div>

              <div className="profile-dialog-body">
                <label>
                  <span>Full Name</span>
                  <input
                    autoFocus
                    data-no-smooth-input="true"
                    onChange={(event) => setProfileDraft((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Enter your full name"
                    ref={profileNameInputRef}
                    required
                    type="text"
                    value={profileDraft.fullName}
                  />
                </label>

                <label>
                  <span>Email Address</span>
                  <div className="profile-input-with-icon">
                    <Icon type="mail" />
                    <input
                      data-no-smooth-input="true"
                      onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))}
                      placeholder="customer@example.com"
                      type="email"
                      value={profileDraft.email}
                    />
                  </div>
                </label>

                <label>
                  <span>Phone Number</span>
                  <div className="profile-input-with-icon">
                    <Icon type="phone" />
                    <input
                      data-no-smooth-input="true"
                      onChange={(event) => setProfileDraft((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="Enter your phone number"
                      type="tel"
                      value={profileDraft.phone}
                    />
                  </div>
                </label>
              </div>

              <div className="profile-dialog-footer">
                <button
                  className="profile-dialog-cancel"
                  disabled={saving}
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                >
                  Cancel
                </button>
                <button className="profile-dialog-save" disabled={saving} type="submit">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {passwordModalOpen && (
        <div
          className="profile-dialog-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setPasswordModalOpen(false);
            }
          }}
        >
          <section className="profile-dialog profile-password-dialog" role="dialog" aria-modal="true" aria-labelledby="passwordDialogTitle">
            <div className="profile-dialog-titlebar">
              <h2 id="passwordDialogTitle">Change password</h2>
              <button
                type="button"
                aria-label="Close password editor"
                disabled={saving}
                onClick={() => setPasswordModalOpen(false)}
              >
                <Icon type="close" />
              </button>
            </div>

            <form className="profile-dialog-form" onSubmit={submitPassword}>
              <div className="profile-password-intro">
                <span><Icon type="key" /></span>
                <div>
                  <strong>Update your password</strong>
                  <p>Use at least 8 characters for your new password.</p>
                </div>
              </div>

              <div className="profile-dialog-body">
                <label>
                  <span>Current Password</span>
                  <div className="profile-input-with-icon">
                    <Icon type="key" />
                    <input
                      autoComplete="current-password"
                      data-no-smooth-input="true"
                      onChange={(event) => setPasswordDraft((current) => ({ ...current, currentPassword: event.target.value }))}
                      placeholder="Enter current password"
                      ref={currentPasswordInputRef}
                      required
                      type="password"
                      value={passwordDraft.currentPassword}
                    />
                  </div>
                </label>

                <label>
                  <span>New Password</span>
                  <div className="profile-input-with-icon">
                    <Icon type="shield" />
                    <input
                      autoComplete="new-password"
                      data-no-smooth-input="true"
                      minLength={8}
                      onChange={(event) => setPasswordDraft((current) => ({ ...current, newPassword: event.target.value }))}
                      placeholder="Enter new password"
                      required
                      type="password"
                      value={passwordDraft.newPassword}
                    />
                  </div>
                </label>

                <label>
                  <span>Confirm New Password</span>
                  <div className="profile-input-with-icon">
                    <Icon type="shield" />
                    <input
                      autoComplete="new-password"
                      data-no-smooth-input="true"
                      minLength={8}
                      onChange={(event) => setPasswordDraft((current) => ({ ...current, confirmPassword: event.target.value }))}
                      placeholder="Confirm new password"
                      required
                      type="password"
                      value={passwordDraft.confirmPassword}
                    />
                  </div>
                </label>
              </div>

              <div className="profile-dialog-footer">
                <button
                  className="profile-dialog-cancel"
                  disabled={saving}
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                >
                  Cancel
                </button>
                <button className="profile-dialog-save" disabled={saving} type="submit">
                  {saving ? 'Saving...' : 'Update password'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
