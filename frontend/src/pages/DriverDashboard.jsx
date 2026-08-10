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

// ─── Custom colored markers ──────────────────────────────────────────────────

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

// ─── Haversine distance helper ───────────────────────────────────────────────

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

// ─── Map re-centering component ──────────────────────────────────────────────

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

    // ── v1.3 Filter State ────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [coveredFilter, setCoveredFilter] = useState('ALL'); // ALL, TRUE, FALSE
    const [availabilityFilter, setAvailabilityFilter] = useState('ALL'); // ALL, AVAILABLE, OCCUPIED
    const [sortBy, setSortBy] = useState('NEAREST'); // NEAREST, PRICE_ASC, PRICE_DESC

    // ── Geolocation & Live Location Tracking State ───────────────────────────
    const [userLocation, setUserLocation] = useState(null); // { lat, lng }
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [nearMeActive, setNearMeActive] = useState(false);
    const [radiusKm, setRadiusKm] = useState(5);
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

    // ── Main Data Fetcher (Handles Search, Nearby, Filters & Sorting) ──────
    const fetchSpacesData = useCallback(async () => {
        try {
            let url = '';
            const isLocationBased = (nearMeActive || liveTrackingActive) && userLocation;

            if (isLocationBased) {
                url = `/parking/public/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radiusKm}`;
            } else {
                url = '/parking/public/search?';
            }

            if (searchQuery.trim()) url += `&q=${encodeURIComponent(searchQuery.trim())}`;
            if (typeFilter) url += `&vehicleType=${typeFilter}`;
            if (minPrice) url += `&minPrice=${minPrice}`;
            if (maxPrice) url += `&maxPrice=${maxPrice}`;
            if (coveredFilter === 'TRUE') url += '&covered=true';
            if (coveredFilter === 'FALSE') url += '&covered=false';
            if (availabilityFilter && availabilityFilter !== 'ALL') url += `&availability=${availabilityFilter}`;
            if (sortBy) url += `&sortBy=${sortBy}`;

            const res = await api.get(url);
            if (res.success) {
                let data = res.data;

                // Client-side distance calculation & strict radius filtering when location mode is active
                if (userLocation) {
                    data = data
                        .map((space) => {
                            const hasCoords = space.latitude != null && space.longitude != null && !isNaN(space.latitude) && !isNaN(space.longitude);
                            const dist = hasCoords
                                ? haversineKm(userLocation.lat, userLocation.lng, space.latitude, space.longitude)
                                : null;
                            return {
                                ...space,
                                distanceKm: dist,
                            };
                        });

                    // In location-based mode, strictly filter out spaces without valid coordinates or beyond radiusKm
                    if (isLocationBased) {
                        data = data.filter((space) => space.distanceKm != null && space.distanceKm <= radiusKm);
                    }
                }

                // Client-side sorting enforcement
                if (sortBy === 'PRICE_ASC') {
                    data.sort((a, b) => (a.pricePerHour ?? 0) - (b.pricePerHour ?? 0));
                } else if (sortBy === 'PRICE_DESC') {
                    data.sort((a, b) => (b.pricePerHour ?? 0) - (a.pricePerHour ?? 0));
                } else if (sortBy === 'NEAREST' || isLocationBased) {
                    data.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
                }

                setSpaces(data);
            }
        } catch (error) {
            console.error("Failed to fetch parking spaces", error);
        }
    }, [
        nearMeActive,
        liveTrackingActive,
        userLocation,
        radiusKm,
        searchQuery,
        typeFilter,
        minPrice,
        maxPrice,
        coveredFilter,
        availabilityFilter,
        sortBy,
    ]);

    // Debounced trigger for input field changes
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            fetchSpacesData();
        }, 350);
        return () => clearTimeout(debounceTimer.current);
    }, [fetchSpacesData]);

    // ── Geolocation Error Handler ────────────────────────────────────────────
    const handleGeolocationError = (err) => {
        setLocationLoading(false);
        switch (err.code) {
            case err.PERMISSION_DENIED:
                setLocationError('Location access denied. Please allow location access in browser settings.');
                break;
            case err.POSITION_UNAVAILABLE:
                setLocationError('Location position unavailable. Please try again.');
                break;
            case err.TIMEOUT:
                setLocationError('Location request timed out. Please try again.');
                break;
            default:
                setLocationError('Could not obtain location.');
        }
    };

    // ── One-shot Geolocation ("Near Me") ─────────────────────────────────────
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
                setUserLocation({ lat: latitude, lng: longitude });
                setNearMeActive(true);
                setLocationLoading(false);
            },
            handleGeolocationError,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    };

    // ── Continuous Geolocation ("Live Location") ─────────────────────────────
    const handleEnableLiveLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }
        setLocationLoading(true);
        setLocationError('');

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        const id = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ lat: latitude, lng: longitude });
                setNearMeActive(true);
                setLiveTrackingActive(true);
                setLocationLoading(false);
            },
            (err) => {
                handleGeolocationError(err);
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

    const handleStopLiveLocation = () => {
        if (watchIdRef.current !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setLiveTrackingActive(false);
        setNearMeActive(false);
        setUserLocation(null);
        setLocationError('');
    };

    // ── Reset All Filters (Preserves Live Location Tracking) ─────────────────
    const handleClearFilters = () => {
        setSearchQuery('');
        setTypeFilter('');
        setMinPrice('');
        setMaxPrice('');
        setCoveredFilter('ALL');
        setAvailabilityFilter('ALL');
        setSortBy('NEAREST');
    };

    // ── Reset Location & Filters Completely ──────────────────────────────────
    const handleResetAll = () => {
        handleStopLiveLocation();
        setNearMeActive(false);
        setUserLocation(null);
        setLocationError('');
        handleClearFilters();
    };

    const hasActiveFilters = Boolean(
        searchQuery ||
        typeFilter ||
        minPrice ||
        maxPrice ||
        coveredFilter !== 'ALL' ||
        availabilityFilter !== 'ALL' ||
        sortBy !== 'NEAREST'
    );

    return (
        <div className="flex h-[calc(100vh-70px)]">
            {/* ── Sidebar: Search, Filters & Space List ── */}
            <div className="w-1/3 bg-white p-6 overflow-y-auto border-r border-gray-200 flex flex-col gap-4">
                
                {/* Title & Filter Counter */}
                <div className="flex justify-between items-baseline">
                    <h1 className="text-3xl font-bold text-gray-800">Find Parking</h1>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {spaces.length} space{spaces.length !== 1 ? 's' : ''} found
                    </span>
                </div>

                {/* ── v1.1 & v1.2 Location Controls ── */}
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
                        <div className="flex flex-col gap-1.5 bg-indigo-50 border border-indigo-200 p-3 rounded-xl shadow-xs">
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
                                    className="text-xs bg-indigo-200 hover:bg-indigo-300 text-indigo-800 font-semibold px-2.5 py-1 rounded transition"
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
                </div>

                {/* Location Error Message */}
                {locationError && (
                    <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg border border-red-200">
                        {locationError}
                    </div>
                )}

                {/* Radius selector (when location active) */}
                {(nearMeActive || liveTrackingActive) && userLocation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800 flex justify-between items-center">
                        <span className="font-semibold">Search Radius:</span>
                        <select
                            value={radiusKm}
                            onChange={(e) => setRadiusKm(Number(e.target.value))}
                            className="border border-blue-300 rounded p-1 text-xs bg-white"
                        >
                            <option value={1}>1 km</option>
                            <option value={2}>2 km</option>
                            <option value={5}>5 km</option>
                            <option value={10}>10 km</option>
                            <option value={20}>20 km</option>
                        </select>
                    </div>
                )}

                {/* ── v1.3 Search & Filter Controls ── */}
                <div className="space-y-3 pt-1 border-t border-gray-100">
                    
                    {/* Search Input (City, Title, Address) */}
                    <div>
                        <label className="block text-gray-700 font-semibold text-xs mb-1">Search Location / Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search city, title, or address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border p-2 pl-8 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
                        </div>
                    </div>

                    {/* Price Range Filter */}
                    <div>
                        <label className="block text-gray-700 font-semibold text-xs mb-1">Price per Hour (₹)</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="number"
                                min="0"
                                placeholder="Min ₹"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="w-1/2 border p-1.5 rounded text-xs"
                            />
                            <span className="text-gray-400 text-xs">–</span>
                            <input
                                type="number"
                                min="0"
                                placeholder="Max ₹"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="w-1/2 border p-1.5 rounded text-xs"
                            />
                        </div>
                    </div>

                    {/* Filter Grid: Vehicle, Covered, Availability, Sort */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <label className="block text-gray-700 font-semibold mb-1">Vehicle Type</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full border p-1.5 rounded bg-white"
                            >
                                <option value="">Any Vehicle</option>
                                <option value="BIKE">Bike / Two-Wheeler</option>
                                <option value="HATCHBACK">Hatchback</option>
                                <option value="SEDAN">Sedan</option>
                                <option value="SUV">SUV</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-semibold mb-1">Covered</label>
                            <select
                                value={coveredFilter}
                                onChange={(e) => setCoveredFilter(e.target.value)}
                                className="w-full border p-1.5 rounded bg-white"
                            >
                                <option value="ALL">All Spaces</option>
                                <option value="TRUE">Covered Only</option>
                                <option value="FALSE">Uncovered Only</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-semibold mb-1">Availability</label>
                            <select
                                value={availabilityFilter}
                                onChange={(e) => setAvailabilityFilter(e.target.value)}
                                className="w-full border p-1.5 rounded bg-white"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="AVAILABLE">🟢 Available Only</option>
                                <option value="OCCUPIED">🔴 Occupied Only</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-semibold mb-1">Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full border p-1.5 rounded bg-white font-medium"
                            >
                                <option value="NEAREST">Nearest</option>
                                <option value="PRICE_ASC">Price: Low → High</option>
                                <option value="PRICE_DESC">Price: High → Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Clear Filters & Reset Actions */}
                    <div className="flex gap-2 pt-1">
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-1.5 rounded border border-gray-300 transition"
                            >
                                ✕ Clear Filters
                            </button>
                        )}
                        {(nearMeActive || liveTrackingActive) && (
                            <button
                                onClick={handleResetAll}
                                className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1.5 rounded border border-red-200 transition shrink-0"
                            >
                                Reset All
                            </button>
                        )}
                    </div>
                </div>

                {/* Map Legend */}
                <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
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

                {/* ── Parking Space Cards List ── */}
                <div className="space-y-4">
                    {spaces.map((space) => {
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

                                {/* Features badges */}
                                <div className="flex gap-2 text-xs text-gray-500 my-1.5 flex-wrap">
                                    <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{space.vehicleType}</span>
                                    <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{space.covered ? '🏠 Covered' : '☀️ Uncovered'}</span>
                                    {space.evCharging && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">⚡ EV Charging</span>}
                                </div>

                                {/* Distance Badge */}
                                {distText && (
                                    <p className="text-blue-600 text-xs font-semibold mb-2">📍 {distText} away</p>
                                )}

                                <div className="flex justify-between items-center mt-2">
                                    <span className="font-bold text-blue-600 text-lg">₹{space.pricePerHour}<span className="text-xs font-normal text-gray-500">/hr</span></span>
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

                    {/* ── v1.3 Empty State UI ── */}
                    {spaces.length === 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center space-y-3">
                            <div className="text-3xl">🔍</div>
                            <h3 className="font-bold text-gray-700">No parking spaces found</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">
                                No parking spaces matched your current search filters. Try adjusting your price range, vehicle type, or search terms.
                            </p>
                            {hasActiveFilters && (
                                <button
                                    onClick={handleClearFilters}
                                    className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition shadow-xs"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
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

                    {/* Fly map to user location when coordinates update */}
                    {userLocation && <MapRecenter center={[userLocation.lat, userLocation.lng]} />}

                    {/* Driver's live location marker */}
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
                    {spaces.map((space) =>
                        space.latitude && space.longitude ? (
                            <Marker
                                key={space.id}
                                position={[space.latitude, space.longitude]}
                                icon={isOccupied(space.currentOccupancyStatus) ? redMarker : greenMarker}
                            >
                                <Popup>
                                    <div className="text-center min-w-[140px]">
                                        <h3 className="font-bold text-sm">{space.title}</h3>
                                        <p className="text-xs text-gray-500 mb-1">₹{space.pricePerHour}/hr</p>
                                        {isOccupied(space.currentOccupancyStatus) ? (
                                            <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold mb-2">
                                                🔴 {occupancyLabel(space.currentOccupancyStatus).text}
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold mb-2">
                                                🟢 Available
                                            </span>
                                        )}
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
