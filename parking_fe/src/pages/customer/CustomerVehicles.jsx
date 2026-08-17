import { useEffect, useRef, useState } from 'react';
import {
  apiRequest,
  jsonBody,
} from '../../services/api.js';
import { CustomerMobileNav, CustomerSidebar, initialsFor } from './CustomerChrome.jsx';

const emptyVehicleForm = {
  plateNumber: '',
  brand: '',
  color: '',
  vehicleType: 'CAR',
  defaultVehicle: false,
};

const vehicleTypes = [
  ['CAR', 'Standard Sedan'],
  ['ELECTRIC_CAR', 'Electric Vehicle'],
  ['TRUCK', 'SUV / Truck'],
  ['MOTORBIKE', 'Motorbike'],
  ['BICYCLE', 'Bicycle'],
];

function vehicleTypeLabel(type) {
  return vehicleTypes.find(([value]) => value === type)?.[1] || type || 'Vehicle';
}

function vehicleShortType(type) {
  if (type === 'ELECTRIC_CAR') {
    return 'EV';
  }

  if (type === 'CAR') {
    return 'Sedan';
  }

  return vehicleTypeLabel(type);
}

function vehicleName(vehicle) {
  return vehicle.brand || vehicleTypeLabel(vehicle.vehicleType);
}

function isUnauthorized(error) {
  return error.message.toLowerCase().includes('401')
    || error.message.toLowerCase().includes('unauthorized');
}

function profileName(profile, account) {
  return profile?.fullName || account?.email || account?.phone || 'Customer';
}

function VehicleArt({ type }) {
  return (
    <div className={`vehicle-art ${String(type || 'CAR').toLowerCase().replace('_', '-')}`} aria-hidden="true">
      <svg viewBox="0 0 220 120">
        <path className="vehicle-shadow" d="M35 94h150c10 0 18 3 18 8s-8 8-18 8H35c-10 0-18-3-18-8s8-8 18-8Z" />
        <path className="vehicle-body" d="M33 69h22l18-24h72l26 24h19c10 0 18 8 18 18v12H16V87c0-10 7-18 17-18Z" />
        <path className="vehicle-window" d="M77 51h27v18H62l15-18Zm34 0h29l19 18h-48V51Z" />
        <path className="vehicle-line" d="M27 82h170" />
        <circle className="vehicle-wheel" cx="61" cy="99" r="15" />
        <circle className="vehicle-wheel" cx="164" cy="99" r="15" />
      </svg>
    </div>
  );
}

export function CustomerVehicles() {
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyVehicleForm);
  const [editingId, setEditingId] = useState('');
  const [status, setStatus] = useState('Loading');
  const [saving, setSaving] = useState(false);
  const [vehicleImageFile, setVehicleImageFile] = useState(null);
  const vehicleImageInputRef = useRef(null);

  const name = profileName(profile, account);
  const initials = initialsFor(name);

  async function loadVehicles() {
    setStatus('Loading');

    try {
      const currentAccount = await apiRequest('/auth/me');

      if (currentAccount.role !== 'CUSTOMER') {
        window.location.href = currentAccount.role === 'ADMIN' ? '/admin-users.html' : '/staff.html';
        return;
      }

      const [profileResponse, vehicleResponse] = await Promise.all([
        apiRequest('/customers/me'),
        apiRequest('/customer/vehicles'),
      ]);

      setAccount(currentAccount);
      setProfile(profileResponse);
      setVehicles(vehicleResponse);
      setStatus('Online');
    } catch (error) {
      setStatus(error.message);
      if (isUnauthorized(error)) {
        window.location.href = '/auth.html';
      }
    }
  }

  useEffect(() => {
    document.title = 'ParkFinder | Vehicles';
    document.body.className = 'customer-dashboard-page';
    document.body.dataset.page = 'customer-vehicles';
    loadVehicles();
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyVehicleForm);
    setEditingId('');
    setVehicleImageFile(null);
    if (vehicleImageInputRef.current) {
      vehicleImageInputRef.current.value = '';
    }
  }

  function editVehicle(vehicle) {
    setEditingId(vehicle.id);
    setForm({
      plateNumber: vehicle.plateNumber || '',
      brand: vehicle.brand || '',
      color: vehicle.color || '',
      vehicleType: vehicle.vehicleType || 'CAR',
      defaultVehicle: Boolean(vehicle.defaultVehicle),
    });
    setVehicleImageFile(null);
    if (vehicleImageInputRef.current) {
      vehicleImageInputRef.current.value = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadVehicleImage(vehicleId) {
    if (!vehicleImageFile) {
      return;
    }

    const imageData = new FormData();
    imageData.append('file', vehicleImageFile);
    await apiRequest(`/customer/vehicles/${vehicleId}/image`, {
      method: 'POST',
      body: imageData,
    });
  }

  async function submitVehicle(event) {
    event.preventDefault();
    setSaving(true);
    setStatus(editingId ? 'Updating vehicle...' : 'Saving vehicle...');

    const payload = {
      plateNumber: form.plateNumber.trim().toUpperCase(),
      vehicleType: form.vehicleType,
      brand: form.brand.trim() || null,
      color: form.color.trim() || null,
      defaultVehicle: form.defaultVehicle,
    };

    try {
      const savedVehicle = await apiRequest(editingId ? `/customer/vehicles/${editingId}` : '/customer/vehicles', {
        method: editingId ? 'PUT' : 'POST',
        body: jsonBody(payload),
      });
      await uploadVehicleImage(savedVehicle.id);
      resetForm();
      await loadVehicles();
      setStatus(editingId ? 'Vehicle updated.' : 'Vehicle saved.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(vehicleId) {
    setStatus('Updating default vehicle...');
    try {
      await apiRequest(`/customer/vehicles/${vehicleId}/default`, { method: 'PATCH' });
      await loadVehicles();
      setStatus('Default vehicle updated.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function deactivateVehicle(vehicleId) {
    setStatus('Deactivating vehicle...');
    try {
      await apiRequest(`/customer/vehicles/${vehicleId}/deactivate`, { method: 'PATCH' });
      await loadVehicles();
      setStatus('Vehicle deactivated.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <div className="customer-dashboard customer-vehicles-page">
      <CustomerSidebar active="vehicles" initials={initials} name={name} />

      <main className="customer-main">
        <header className="customer-top-nav">
          <div className="customer-mobile-title">
            <strong>ParkFinder</strong>
            <span>Vehicles</span>
          </div>

        </header>

        <section className="customer-content customer-vehicle-content">
          <div className="vehicle-page-heading">
            <div>
              <h1>My Registered Vehicles</h1>
              <p>Manage your fleet for seamless parking access.</p>
            </div>
            <span className={`customer-status ${status === 'Online' ? 'online' : ''}`}>{status}</span>
          </div>

          <div className="vehicle-management-grid">
            <section className="vehicle-form-panel">
              <div className="vehicle-form-accent" aria-hidden="true" />
              <div className="vehicle-form-title">
                <span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" /></svg>
                </span>
                <h2>{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
              </div>

              <form className="vehicle-register-form" onSubmit={submitVehicle}>
                <label>
                  <span>Plate Number</span>
                  <input
                    className="vehicle-plate-input"
                    onChange={(event) => updateForm('plateNumber', event.target.value)}
                    placeholder="e.g. ABC-1234"
                    required
                    type="text"
                    value={form.plateNumber}
                  />
                </label>

                <div className="vehicle-two-fields">
                  <label>
                    <span>Make / Model</span>
                    <input
                      onChange={(event) => updateForm('brand', event.target.value)}
                      placeholder="e.g. Toyota Camry"
                      type="text"
                      value={form.brand}
                    />
                  </label>
                  <label>
                    <span>Color</span>
                    <input
                      onChange={(event) => updateForm('color', event.target.value)}
                      placeholder="e.g. Silver"
                      type="text"
                      value={form.color}
                    />
                  </label>
                </div>

                <label>
                  <span>Vehicle Type</span>
                  <select
                    onChange={(event) => updateForm('vehicleType', event.target.value)}
                    required
                    value={form.vehicleType}
                  >
                    {vehicleTypes.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <button className="vehicle-upload-drop" type="button" onClick={() => vehicleImageInputRef.current?.click()}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3 7.2 5H4a2 2 0 0 0-2 2v12h20V7a2 2 0 0 0-2-2h-3.2L15 3H9Zm3 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /></svg>
                  <span>{vehicleImageFile ? vehicleImageFile.name : 'Upload Vehicle Photo (Optional)'}</span>
                </button>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="vehicle-photo-input"
                  onChange={(event) => setVehicleImageFile(event.target.files?.[0] || null)}
                  ref={vehicleImageInputRef}
                  type="file"
                />

                <label className="vehicle-default-toggle">
                  <span>
                    <strong>Set as Default</strong>
                    <small>Use this vehicle automatically.</small>
                  </span>
                  <input
                    checked={form.defaultVehicle}
                    onChange={(event) => updateForm('defaultVehicle', event.target.checked)}
                    type="checkbox"
                  />
                </label>

                <div className="vehicle-form-actions">
                  {editingId && (
                    <button className="vehicle-secondary-button" type="button" onClick={resetForm}>
                      Cancel
                    </button>
                  )}
                  <button className="vehicle-save-button" disabled={saving} type="submit">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3H5a2 2 0 0 0-2 2v14h18V7l-4-4ZM7 5h8v5H7V5Zm10 14H7v-6h10v6Z" /></svg>
                    {saving ? 'Saving...' : 'Save Vehicle'}
                  </button>
                </div>
              </form>
            </section>

            <section className="vehicle-card-column" aria-label="Registered vehicles">
              {vehicles.map((vehicle) => (
                <article className={`vehicle-manage-card ${vehicle.defaultVehicle ? 'default' : ''}`} key={vehicle.id}>
                  {vehicle.defaultVehicle && (
                    <div className="vehicle-default-badge">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.8 6 6.5.8-4.8 4.4 1.3 6.4L12 16.3l-5.8 3.3 1.3-6.4-4.8-4.4 6.5-.8L12 2Z" /></svg>
                      Default
                    </div>
                  )}

                  {vehicle.imageUrl ? (
                    <div className="vehicle-photo-preview">
                      <img src={vehicle.imageUrl} alt={`${vehicle.plateNumber} vehicle`} />
                    </div>
                  ) : (
                    <VehicleArt type={vehicle.vehicleType} />
                  )}

                  <div className="vehicle-card-body">
                    <div>
                      <div className="vehicle-card-badges">
                        <span className="vehicle-type-badge">{vehicleShortType(vehicle.vehicleType)}</span>
                        <span className={`vehicle-status-badge ${vehicle.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                          <i aria-hidden="true" />
                          {vehicle.status || 'ACTIVE'}
                        </span>
                      </div>

                      <h3>{vehicleName(vehicle)}</h3>
                      <p>{vehicle.color || 'Color not set'}</p>
                    </div>

                    <div className="vehicle-card-footer">
                      <strong>{vehicle.plateNumber}</strong>
                      <div>
                        {!vehicle.defaultVehicle && vehicle.status !== 'INACTIVE' && (
                          <button type="button" onClick={() => makeDefault(vehicle.id)}>
                            Make Default
                          </button>
                        )}
                        <button type="button" aria-label={`Edit ${vehicle.plateNumber}`} onClick={() => editVehicle(vehicle)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 17.3-.8 3.5 3.5-.8 10.7-10.7-2.7-2.7L4 17.3ZM19.6 7.1a1.9 1.9 0 0 0 0-2.7 1.9 1.9 0 0 0-2.7 0l-1 1 2.7 2.7 1-1Z" /></svg>
                        </button>
                        {vehicle.status !== 'INACTIVE' && (
                          <button type="button" aria-label={`Deactivate ${vehicle.plateNumber}`} onClick={() => deactivateVehicle(vehicle.id)}>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 11H7v-2h10v2Z" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {!vehicles.length && (
                <div className="vehicle-empty-state">
                  <VehicleArt type="CAR" />
                  <h3>No vehicles found</h3>
                  <p>Add your first vehicle to make bookings faster.</p>
                </div>
              )}
            </section>
          </div>
        </section>
      </main>

      <CustomerMobileNav active="vehicles" />
    </div>
  );
}
