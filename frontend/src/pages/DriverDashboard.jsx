import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
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

// ─── v1.1: Custom colored markers ────────────────────────────────────────────

/** Green marker for available spaces */
const greenMarker = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

/** Red marker for occupied spaces (ACTIVE / OVERSTAY / CONFIRMED) */
const redMarker = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

/** Blue marker for driver's own current location */
const blueMarker = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// ─── v1.1: Haversine distance (client-side, used when server doesn't return distanceKm) ──

const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
};

/** Formats a distance (km) as "250 m", "1.2 km", etc. */
const formatDistance = (km) => {
    if (km == null) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
};

// ─── v1.1: Map re-centering component ────────────────────────────────────────

/** Imperatively flies the Leaflet map to a new center when userLocation changes. */
const MapRecenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 14, { duration: 1.2 });
        }
    }, [center, map]);
    return null;
};

// ─── Occupancy helpers ────────────────────────────────────────────────────────

const isOccupied = (status) =>
    status === 'CONFIRMED' || status === 'ACTIVE' || status === 'OVERSTAY';

const occupancyLabel = (status) => {
    if (status === 'OVERSTAY') return { text: 'Overstay', cls: 'bg-red-600 text-white' };
    if (status === 'ACTIVE') return { text: 'Occupied', cls: 'bg-red-500 text-white' };
    if (status === 'CONFIRMED') return { text: 'Reserved', cls: 'bg-yellow-500 text-white' };
    return { text: 'Available', cls: 'bg-green-500 text-white' };
};

// ─── Component ───────────────────────────────────────────────────────────────

const DriverDashboard = () => {
    const [spaces, setSpaces] = useState([]);
    const [cityFilter, setCityFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    // v1.1 & v1.2: Geolocation & Live Location Tracking State
    const [userLocation, setUserLocation] = useState(null); // { lat, lng }
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [nearMeActive, setNearMeActive] = useState(false);
    const [radiusKm, setRadiusKm] = useState(5);

    // v1.2: Continuous live tracking state & ref
    const [liveTrackingActive, setLiveTrackingActive] = useState(false);
    const watchIdRef = useRef(null);
    const debounceTimer = useRef(null);

    // Cleanup watchPosition on component unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null && navigator.geolocation) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    // Fetch spaces when city/vehicle filters change (only when nearMe / liveTracking is NOT active)
    useEffect(() => {
        if (nearMeActive || liveTrackingActive) return;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            fetchSpaces();
        }, 400);
        return () => clearTimeout(debounceTimer.current);
    }, [cityFilter, typeFilter, nearMeActive, liveTrackingActive]);

    const fetchSpaces = async () => {
        try {
            let url = '/parking/public/search?';
            if (cityFilter) url += `city=${cityFilter}&`;
            if (typeFilter) url += `vehicleType=${typeFilter}&`;
            const res = await api.get(url);
            if (res.success) setSpaces(res.data);
        } catch (error) {
            console.error("Failed to search spaces", error);
        }
    };

    // v1.1 & v1.2: Fetch nearby spaces using driver's geolocation
    const fetchNearbySpaces = async (lat, lng) => {
        try {
            let url = `/parking/public/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`;
            if (typeFilter) url += `&vehicleType=${typeFilter}`;
            const res = await api.get(url);
            if (res.success) {
                // Attach client-side distance for any spaces without server-computed distanceKm
                const enriched = res.data.map((space) => ({
                    ...space,
                    distanceKm:
                        space.distanceKm != null
                            ? space.distanceKm
                            : space.latitude && space.longitude
                                ? haversineKm(lat, lng, space.latitude, space.longitude)
                                : null,
                }));
                // Sort spaces by distance ascending
                enriched.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
                setSpaces(enriched);
            }
        } catch (error) {
            console.error("Failed to fetch nearby spaces", error);
        }
    };

    // Helper: Handle geolocation errors gracefully
    const handleGeolocationError = (err) => {
        setLocationLoading(false);
        switch (err.code) {
            case err.PERMISSION_DENIED:
                setLocationError('Location access denied. Please allow location access in your browser settings.');
                break;
            case err.POSITION_UNAVAILABLE:
                setLocationError('Location position unavailable. Please try again.');
                break;
            case err.TIMEOUT:
                setLocationError('Location request timed out. Please try again.');
                break;
            default:
                setLocationError('Could not obtain location. Please check your device settings.');
        }
    };

    // v1.1: Handle "Near Me" button click (one-time location fix)
    const handleNearMe = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }
        setLocationLoading(true);
        setLocationError('');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const loc = { lat: latitude, lng: longitude };
                setUserLocation(loc);
                setNearMeActive(true);
                setLocationLoading(false);
                fetchNearbySpaces(latitude, longitude);
            },
            handleGeolocationError,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    };

    // v1.2: Enable Live Location continuous tracking (watchPosition)
    const handleEnableLiveLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }
        setLocationLoading(true);
        setLocationError('');

        // Clear any previous watcher if existing
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        const id = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const newLoc = { lat: latitude, lng: longitude };
                setUserLocation(newLoc);
                setNearMeActive(true);
                setLiveTrackingActive(true);
                setLocationLoading(false);

                // Recalculate distances and re-sort spaces upon location update
                fetchNearbySpaces(latitude, longitude);
            },
            (err) => {
                handleGeolocationError(err);
                // Stop watching if permission denied or unrecoverable error
                if (err.code === err.PERMISSION_DENIED && watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                    watchIdRef.current = null;
                    setLiveTrackingActive(false);
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );

        watchIdRef.current = id;
    };

    // v1.2: Stop Live Location tracking
    const handleStopLiveLocation = () => {
        if (watchIdRef.current !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setLiveTrackingActive(false);
        // Retain last known userLocation and nearMe state so map remains populated
    };

    // v1.1: Clear Near Me and return to city-search mode
    const handleClearNearMe = () => {
        handleStopLiveLocation();
        setNearMeActive(false);
        setUserLocation(null);
        setLocationError('');
        fetchSpaces();
    };

    // Refresh nearby when radius changes while Near Me or Live Location is active
    useEffect(() => {
        if ((nearMeActive || liveTrackingActive) && userLocation) {
            fetchNearbySpaces(userLocation.lat, userLocation.lng);
        }
    }, [radiusKm, nearMeActive, liveTrackingActive]);

    return (
        <div className="flex h-[calc(100vh-70px)]">
            {/* ── Sidebar: Filters & Space List ── */}
            <div className="w-1/3 bg-white p-6 overflow-y-auto border-r border-gray-200 flex flex-col gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Find Parking</h1>

                {/* ── v1.1 & v1.2: Location controls ── */}
                <div className="flex flex-col gap-2">
                    {!liveTrackingActive ? (
                        <div className="flex gap-2">
                            <button
                                onClick={handleEnableLiveLocation}
                                disabled={locationLoading}
                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition text-sm disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                            >
                                {locationLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        Locating…
                                    </>
                                ) : (
                                    <>📍 Enable Live Location</>
                                )}
                            </button>

                            {!nearMeActive && (
                                <button
                                    onClick={handleNearMe}
                                    disabled={locationLoading}
                                    className="flex items-center justify-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-blue-700 transition text-sm disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shrink-0"
                                >
                                    Near Me
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 bg-indigo-50 border border-indigo-200 p-3 rounded-xl shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
                                    </span>
                                    🔵 Live Location Active
                                </span>
                                <button
                                    onClick={handleStopLiveLocation}
                                    className="text-xs bg-indigo-200 hover:bg-indigo-300 text-indigo-800 font-semibold px-2 py-1 rounded transition"
                                >
                                    ⏹ Stop Live Location
                                </button>
                            </div>
                            {userLocation && (
                                <p className="text-xs text-indigo-700 font-mono">
                                    Lat: {userLocation.lat.toFixed(4)}, Lng: {userLocation.lng.toFixed(4)}
                                </p>
                            )}
                        </div>
                    )}

                    {nearMeActive && !liveTrackingActive && (
                        <button
                            onClick={handleClearNearMe}
                            className="flex items-center justify-center gap-1 bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-700 transition w-full"
                        >
                            Reset Search Mode
                        </button>
                    )}
                </div>

                {/* v1.1 & v1.2: Location error */}
                {locationError && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                        {locationError}
                    </div>
                )}

                {/* v1.1 & v1.2: Near Me / Live Location active info + radius selector */}
                {(nearMeActive || liveTrackingActive) && userLocation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                        <p className="font-semibold mb-2">
                            {liveTrackingActive ? '🛰️ Tracking live location' : '📍 Showing spaces near you'}
                        </p>
                        <label className="block text-xs text-blue-700 mb-1">Search Radius</label>
                        <select
                            value={radiusKm}
                            onChange={(e) => setRadiusKm(Number(e.target.value))}
                            className="w-full border border-blue-300 rounded p-1 text-sm bg-white"
                        >
                            <option value={1}>1 km</option>
                            <option value={2}>2 km</option>
                            <option value={5}>5 km</option>
                            <option value={10}>10 km</option>
                            <option value={20}>20 km</option>
                        </select>
                        <p className="text-xs text-blue-600 mt-2">
                            Showing {spaces.length} space{spaces.length !== 1 ? 's' : ''} within {radiusKm} km
                        </p>
                    </div>
                )}

                {/* ── City & Vehicle Type filters (hidden in Near Me / Live mode) ── */}
                {!nearMeActive && !liveTrackingActive && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">City</label>
                            <input
                                type="text"
                                placeholder="Enter city..."
                                value={cityFilter}
                                onChange={(e) => setCityFilter(e.target.value)}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">Vehicle Type</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full border p-2 rounded"
                            >
                                <option value="">Any</option>
                                <option value="HATCHBACK">Hatchback</option>
                                <option value="SEDAN">Sedan</option>
                                <option value="SUV">SUV</option>
                                <option value="BIKE">Bike / Two Wheeler</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* v1.1: Vehicle type filter in Near Me / Live mode */}
                {(nearMeActive || liveTrackingActive) && (
                    <div>
                        <label className="block text-gray-700 font-medium mb-1 text-sm">Vehicle Type</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                if (userLocation) fetchNearbySpaces(userLocation.lat, userLocation.lng);
                            }}
                            className="w-full border p-2 rounded text-sm"
                        >
                            <option value="">Any</option>
                            <option value="HATCHBACK">Hatchback</option>
                            <option value="SEDAN">Sedan</option>
                            <option value="SUV">SUV</option>
                            <option value="BIKE">Bike / Two Wheeler</option>
                        </select>
                    </div>
                )}

                {/* ── Map legend ── */}
                <div className="flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span> Available
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span> Occupied
                    </span>
                    {(nearMeActive || liveTrackingActive) && (
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span> You
                        </span>
                    )}
                </div>

                {/* ── Space cards list ── */}
                <div className="space-y-4">
                    {spaces.map(space => {
                        const occupied = isOccupied(space.currentOccupancyStatus);
                        const badge = occupancyLabel(space.currentOccupancyStatus);
                        const distText = formatDistance(space.distanceKm);
                        return (
                            <div
                                key={space.id}
                                className={`p-4 rounded-lg shadow-sm border transition hover:shadow-md ${
                                    occupied ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'
                                }`}
                            >
                                {space.images?.length > 0 && (
                                    <img src={space.images[0]} alt="Parking" className="w-full h-32 object-cover rounded mb-3" />
                                )}

                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h3 className="font-bold text-lg leading-tight">{space.title}</h3>
                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                                        {badge.text}
                                    </span>
                                </div>

                                <p className="text-gray-600 text-sm mb-1">{space.address}, {space.city}</p>

                                {/* v1.1 & v1.2: Distance badge */}
                                {distText && (
                                    <p className="text-blue-600 text-xs font-semibold mb-2">📍 {distText} away</p>
                                )}

                                <div className="flex justify-between items-center mt-2">
                                    <span className="font-bold text-blue-600">${space.pricePerHour}/hr</span>
                                    <Link
                                        to={`/parking/${space.id}`}
                                        className={`px-4 py-1.5 rounded text-sm text-white transition ${
                                            occupied
                                                ? 'bg-gray-500 hover:bg-gray-600'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    >
                                        {occupied ? 'View (Occupied)' : 'View Details'}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                    {spaces.length === 0 && (
                        <p className="text-gray-500 text-center py-8">
                            {(nearMeActive || liveTrackingActive)
                                ? `No parking spaces found within ${radiusKm} km of your location.`
                                : 'No spaces found. Try a different city or vehicle type.'}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Map View ── */}
            <div className="w-2/3 h-full z-0">
                <MapContainer
                    center={userLocation ? [userLocation.lat, userLocation.lng] : [12.9716, 77.5946]}
                    zoom={12}
                    className="w-full h-full"
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* v1.1 & v1.2: Fly map to user location when location updates */}
                    {userLocation && <MapRecenter center={[userLocation.lat, userLocation.lng]} />}

                    {/* v1.1 & v1.2: Driver's live location marker */}
                    {userLocation && (
                        <Marker position={[userLocation.lat, userLocation.lng]} icon={blueMarker}>
                            <Popup>
                                <div className="text-center">
                                    <p className="font-bold">
                                        {liveTrackingActive ? '🔵 Live Location (Active)' : '📍 You are here'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Space markers — green = available, red = occupied */}
                    {spaces.map(space =>
                        space.latitude && space.longitude ? (
                            <Marker
                                key={space.id}
                                position={[space.latitude, space.longitude]}
                                icon={isOccupied(space.currentOccupancyStatus) ? redMarker : greenMarker}
                            >
                                <Popup>
                                    <div className="text-center min-w-[140px]">
                                        <h3 className="font-bold text-sm">{space.title}</h3>
                                        <p className="text-xs text-gray-500 mb-1">${space.pricePerHour}/hr</p>
                                        {/* v1.1: Occupancy badge in popup */}
                                        {isOccupied(space.currentOccupancyStatus) ? (
                                            <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold mb-2">
                                                🔴 {occupancyLabel(space.currentOccupancyStatus).text}
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold mb-2">
                                                🟢 Available
                                            </span>
                                        )}
                                        {/* v1.1: Distance in popup */}
                                        {space.distanceKm != null && (
                                            <p className="text-xs text-blue-600 mb-1">
                                                📍 {formatDistance(space.distanceKm)} away
                                            </p>
                                        )}
                                        <Link to={`/parking/${space.id}`} className="text-blue-600 underline text-xs mt-1 inline-block">
                                            {isOccupied(space.currentOccupancyStatus) ? 'View (Occupied)' : 'Book'}
                                        </Link>
                                    </div>
                                </Popup>
                            </Marker>
                        ) : null
                    )}
                </MapContainer>
            </div>
        </div>
    );
};

export default DriverDashboard;
