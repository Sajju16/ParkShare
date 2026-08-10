import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../services/api';

// ─── Leaflet icon fix ────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Red marker for owner's space pin
const redMarkerIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Map recenter helper
const MapRecenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.flyTo(center, 14, { duration: 1.0 });
        }
    }, [center, map]);
    return null;
};

// Map click event listener for picking location
const MapClickListener = ({ onSelect }) => {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

const OwnerDashboard = () => {
    const [spaces, setSpaces] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [spaceForm, setSpaceForm] = useState({
        title: '', description: '', address: '', city: '', zipCode: '',
        pricePerHour: '', pricePerDay: '',
        latitude: '', longitude: '',
        vehicleType: 'SEDAN',
        propertyType: 'HOUSE',
        isCovered: false, hasEvCharging: false
    });
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [locLoading, setLocLoading] = useState(false);
    const [locError, setLocError] = useState('');

    useEffect(() => {
        fetchSpaces();
    }, []);

    const fetchSpaces = async () => {
        try {
            const res = await api.get('/parking/owner');
            if (res.success) setSpaces(res.data);
        } catch (err) {
            console.error('Failed to fetch parking spaces', err);
        }
    };

    const handleFileChange = (e) => setFile(e.target.files[0]);

    // Option A: Use My Current Location via browser Geolocation API
    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocError('Geolocation is not supported by your browser.');
            return;
        }
        setLocLoading(true);
        setLocError('');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setSpaceForm(prev => ({
                    ...prev,
                    latitude: pos.coords.latitude.toFixed(6),
                    longitude: pos.coords.longitude.toFixed(6)
                }));
                setLocLoading(false);
            },
            (err) => {
                setLocLoading(false);
                setLocError('Could not retrieve location. Please grant location permission or click on the map.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Option B: Map click handler
    const handleMapSelect = (lat, lng) => {
        setSpaceForm(prev => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        // Location Validation (-90 to +90 lat, -180 to +180 lng)
        const latNum = parseFloat(spaceForm.latitude);
        const lngNum = parseFloat(spaceForm.longitude);
        if (isNaN(latNum) || latNum < -90 || latNum > 90) {
            setSubmitError('Please select a valid location on the map or enter a latitude between -90 and 90.');
            return;
        }
        if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
            setSubmitError('Please select a valid location on the map or enter a longitude between -180 and 180.');
            return;
        }

        let images = [];

        if (file) {
            setUploading(true);
            const uploadForm = new FormData();
            uploadForm.append('file', file);
            try {
                const uploadRes = await api.post('/parking/upload-image', uploadForm, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.success) images.push(uploadRes.data);
            } catch (err) {
                console.error('Upload failed', err);
                setSubmitError('Image upload failed. Saving without image.');
            }
            setUploading(false);
        }

        const payload = {
            ...spaceForm,
            pricePerHour: parseFloat(spaceForm.pricePerHour) || 0,
            pricePerDay: spaceForm.pricePerDay ? parseFloat(spaceForm.pricePerDay) : null,
            latitude: latNum,
            longitude: lngNum,
            images
        };

        try {
            const res = await api.post('/parking', payload);
            if (res.success) {
                setShowForm(false);
                setSpaceForm({
                    title: '', description: '', address: '', city: '', zipCode: '',
                    pricePerHour: '', pricePerDay: '', latitude: '', longitude: '',
                    vehicleType: 'SEDAN', propertyType: 'HOUSE',
                    isCovered: false, hasEvCharging: false
                });
                setFile(null);
                fetchSpaces();
            }
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Failed to save parking space.');
        }
    };

    const hasValidCoords = !isNaN(parseFloat(spaceForm.latitude)) && !isNaN(parseFloat(spaceForm.longitude));
    const currentMapCenter = hasValidCoords
        ? [parseFloat(spaceForm.latitude), parseFloat(spaceForm.longitude)]
        : [12.9716, 77.5946];

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Owner Dashboard</h1>
                <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">
                    {showForm ? 'Cancel' : 'Add Parking Space'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-8 space-y-4 max-w-2xl border border-gray-200">
                    {submitError && <div className="text-red-600 bg-red-50 p-3 rounded text-sm font-semibold border border-red-200">{submitError}</div>}

                    <input className="border p-2 w-full rounded" placeholder="Title *" required
                        value={spaceForm.title} onChange={e => setSpaceForm({...spaceForm, title: e.target.value})} />

                    <textarea className="border p-2 w-full rounded" placeholder="Description"
                        value={spaceForm.description} onChange={e => setSpaceForm({...spaceForm, description: e.target.value})} />

                    <input className="border p-2 w-full rounded" placeholder="Address *" required
                        value={spaceForm.address} onChange={e => setSpaceForm({...spaceForm, address: e.target.value})} />

                    <div className="flex gap-4">
                        <input className="border p-2 w-full rounded" placeholder="City"
                            value={spaceForm.city} onChange={e => setSpaceForm({...spaceForm, city: e.target.value})} />
                        <input className="border p-2 w-full rounded" placeholder="Zip Code"
                            value={spaceForm.zipCode} onChange={e => setSpaceForm({...spaceForm, zipCode: e.target.value})} />
                    </div>

                    {/* Property Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Property Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="border p-2 w-full rounded"
                            required
                            value={spaceForm.propertyType}
                            onChange={e => setSpaceForm({...spaceForm, propertyType: e.target.value})}>
                            <option value="HOUSE">🏠 House</option>
                            <option value="APARTMENT">🏢 Apartment</option>
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <input className="border p-2 w-full rounded" type="number" step="0.01" placeholder="Price per Hour *" required
                            value={spaceForm.pricePerHour} onChange={e => setSpaceForm({...spaceForm, pricePerHour: e.target.value})} />
                        <input className="border p-2 w-full rounded" type="number" step="0.01" placeholder="Price per Day"
                            value={spaceForm.pricePerDay} onChange={e => setSpaceForm({...spaceForm, pricePerDay: e.target.value})} />
                    </div>

                    {/* ── LOCATION PICKER SECTION (Option A & Option B) ── */}
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="block text-sm font-bold text-gray-800">
                                Parking Space Location <span className="text-red-500">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={handleUseCurrentLocation}
                                disabled={locLoading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-1 transition shadow-sm disabled:opacity-50"
                            >
                                {locLoading ? 'Locating...' : '📍 Use My Current Location'}
                            </button>
                        </div>

                        {locError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">{locError}</p>}

                        <p className="text-xs text-gray-500">
                            Click or tap anywhere on the map below to place/adjust your parking space pin (🗺️ Map Picker):
                        </p>

                        {/* Interactive Leaflet Map Picker */}
                        <div className="h-56 w-full rounded-lg overflow-hidden border border-gray-300 relative z-0">
                            <MapContainer center={currentMapCenter} zoom={13} className="w-full h-full">
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />
                                <MapClickListener onSelect={handleMapSelect} />
                                {hasValidCoords && (
                                    <>
                                        <MapRecenter center={currentMapCenter} />
                                        <Marker position={currentMapCenter} icon={redMarkerIcon} />
                                    </>
                                )}
                            </MapContainer>
                        </div>

                        {/* Display Coordinates & Editable Fallback */}
                        <div className="flex gap-4 pt-1">
                            <div className="w-1/2">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Latitude (-90 to 90) *
                                </label>
                                <input
                                    className="border p-2 w-full rounded text-xs font-mono bg-white"
                                    type="number"
                                    step="any"
                                    placeholder="e.g. 12.9716"
                                    required
                                    value={spaceForm.latitude}
                                    onChange={e => setSpaceForm({...spaceForm, latitude: e.target.value})}
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Longitude (-180 to 180) *
                                </label>
                                <input
                                    className="border p-2 w-full rounded text-xs font-mono bg-white"
                                    type="number"
                                    step="any"
                                    placeholder="e.g. 77.5946"
                                    required
                                    value={spaceForm.longitude}
                                    onChange={e => setSpaceForm({...spaceForm, longitude: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <select className="border p-2 w-full rounded"
                        value={spaceForm.vehicleType} onChange={e => setSpaceForm({...spaceForm, vehicleType: e.target.value})}>
                        <option value="BIKE">Bike / Two Wheeler</option>
                        <option value="HATCHBACK">Hatchback</option>
                        <option value="SEDAN">Sedan</option>
                        <option value="SUV">SUV</option>
                    </select>

                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={spaceForm.isCovered}
                                onChange={e => setSpaceForm({...spaceForm, isCovered: e.target.checked})} /> Covered Parking
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={spaceForm.hasEvCharging}
                                onChange={e => setSpaceForm({...spaceForm, hasEvCharging: e.target.checked})} /> EV Charging
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="border p-2 w-full rounded" />
                    </div>

                    <button type="submit" disabled={uploading}
                        className="bg-green-600 text-white px-5 py-2.5 rounded font-bold disabled:opacity-50 hover:bg-green-700 transition shadow">
                        {uploading ? 'Uploading...' : 'Save Parking Space'}
                    </button>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {spaces.map(space => (
                    <div key={space.id} className="bg-white p-4 rounded shadow border border-gray-100">
                        {space.images?.length > 0 ? (
                            <img src={space.images[0]} alt="Parking" className="w-full h-48 object-cover rounded mb-4" />
                        ) : (
                            <div className="w-full h-48 bg-gray-200 rounded mb-4 flex items-center justify-center text-gray-500">No Image</div>
                        )}
                        <h3 className="font-bold text-xl">{space.title}</h3>
                        <p className="text-gray-600 text-sm">{space.address}, {space.city}</p>
                        <p className="font-bold mt-2 text-blue-600">₹{space.pricePerHour}/hr</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {space.vehicleType} &bull; {space.propertyType === 'HOUSE' ? '🏠 House' : '🏢 Apartment'}
                        </p>
                        {space.latitude && space.longitude && (
                            <p className="text-xs text-green-600 mt-1">📍 {space.latitude}, {space.longitude}</p>
                        )}
                    </div>
                ))}
                {spaces.length === 0 && <p className="text-gray-500 col-span-3 text-center py-8">No parking spaces yet. Click "Add Parking Space" to add one.</p>}
            </div>
        </div>
    );
};

export default OwnerDashboard;
