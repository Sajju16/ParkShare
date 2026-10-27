import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls, useMap } from '@/components/ui/map';
import api from '../services/api';
import {
    Search,
    MapPin,
    SlidersHorizontal,
    Navigation,
    Radio,
    RotateCcw,
    Car,
    ShieldCheck,
    Zap,
    Umbrella,
    ChevronRight,
    X,
    Compass,
    CheckCircle2,
    ArrowUpDown,
    Check,
    Map as MapIcon,
    List as ListIcon
} from 'lucide-react';

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

const formatDistance = (km) => {
    if (km == null) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
};

// ─── Map camera & mobile resize controller (MapCN / MapLibre) ───────────────
const MapController = ({ center, mobileTab }) => {
    const { map } = useMap();

    // Smooth flyTo when center coordinates change ([lat, lng] -> [lng, lat])
    useEffect(() => {
        if (!map || !center || center[0] == null || center[1] == null) return;
        map.flyTo({
            center: [center[1], center[0]],
            zoom: 14,
            duration: 1200,
            essential: true
        });
    }, [center, map]);

    // Recalculate canvas dimensions when mobile tab transitions to map
    useEffect(() => {
        if (!map) return;
        const timer = setTimeout(() => {
            map.resize();
        }, 100);
        return () => clearTimeout(timer);
    }, [mobileTab, map]);

    return null;
};

// ─── Occupancy helpers ───────────────────────────────────────────────────────
const isOccupied = (status) =>
    status === 'CONFIRMED' || status === 'ACTIVE' || status === 'OVERSTAY';

const occupancyLabel = (status) => {
    if (status === 'OVERSTAY') return { text: 'Overstay', badgeCls: 'bg-red-50 text-red-700 border border-red-200' };
    if (status === 'ACTIVE') return { text: 'Occupied', badgeCls: 'bg-red-50 text-red-700 border border-red-200' };
    if (status === 'CONFIRMED') return { text: 'Reserved', badgeCls: 'bg-amber-50 text-amber-700 border border-amber-200' };
    return { text: 'Available', badgeCls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
};

// ─── Component ─────────────────────────────────────────────────────────
const DriverDashboard = () => {
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [brokenImages, setBrokenImages] = useState({});
    const [selectedSpaceId, setSelectedSpaceId] = useState(null);
    const [flyCenter, setFlyCenter] = useState(null);

    const mapRef = useRef(null);

    // Responsive mobile view tab: 'list' | 'map'
    const [mobileTab, setMobileTab] = useState('list');

    // Watch mobileTab changes to resize MapLibre canvas on mobile tab switch
    useEffect(() => {
        if (mobileTab === 'map' && mapRef.current) {
            const timer = setTimeout(() => {
                mapRef.current?.resize();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [mobileTab]);

    // Advanced filters toggle
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Route search params & state synchronization
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    const initialQuery = searchParams.get('q') || location.state?.q || location.state?.searchLocation || '';
    const initialType = searchParams.get('vehicleType') || searchParams.get('type') || location.state?.vehicleType || '';

    // Filter states
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [typeFilter, setTypeFilter] = useState(initialType);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [coveredFilter, setCoveredFilter] = useState('ALL'); // ALL, TRUE, FALSE
    const [availabilityFilter, setAvailabilityFilter] = useState('ALL'); // ALL, AVAILABLE, OCCUPIED
    const [sortBy, setSortBy] = useState('NEAREST'); // NEAREST, PRICE_ASC, PRICE_DESC

    // Geolocation states
    const [userLocation, setUserLocation] = useState(null); // { lat, lng }
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [nearMeActive, setNearMeActive] = useState(false);
    const [radiusKm, setRadiusKm] = useState(5);
    const [liveTrackingActive, setLiveTrackingActive] = useState(false);

    const watchIdRef = useRef(null);
    const debounceTimer = useRef(null);

    // Synchronize incoming search params if changed
    useEffect(() => {
        const q = searchParams.get('q') || location.state?.q || location.state?.searchLocation;
        const type = searchParams.get('vehicleType') || searchParams.get('type') || location.state?.vehicleType;
        if (q !== undefined && q !== null && q !== searchQuery) {
            setSearchQuery(q);
        }
        if (type !== undefined && type !== null && type !== typeFilter) {
            setTypeFilter(type);
        }
    }, [searchParams, location.state]);

    // Cleanup watchPosition on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null && navigator.geolocation) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    // ── Main Data Fetcher ───────────────────────────────────────────────────
    const fetchSpacesData = useCallback(async () => {
        setLoading(true);
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
            const dataList = Array.isArray(res) ? res : res?.data;

            if (Array.isArray(dataList)) {
                let data = [...dataList];

                if (userLocation) {
                    data = data.map((space) => {
                        const hasCoords =
                            space.latitude != null &&
                            space.longitude != null &&
                            !isNaN(space.latitude) &&
                            !isNaN(space.longitude);
                        const dist = hasCoords
                            ? haversineKm(userLocation.lat, userLocation.lng, space.latitude, space.longitude)
                            : null;
                        return { ...space, distanceKm: dist };
                    });

                    if (isLocationBased) {
                        data = data.filter((space) => space.distanceKm != null && space.distanceKm <= radiusKm);
                    }
                }

                // Sorting
                if (sortBy === 'PRICE_ASC') {
                    data.sort((a, b) => (a.pricePerHour ?? 0) - (b.pricePerHour ?? 0));
                } else if (sortBy === 'PRICE_DESC') {
                    data.sort((a, b) => (b.pricePerHour ?? 0) - (a.pricePerHour ?? 0));
                } else if (sortBy === 'NEAREST' || isLocationBased) {
                    data.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
                }

                setSpaces(data);
            } else {
                setSpaces([]);
            }
        } catch (error) {
            console.error('Failed to fetch parking spaces', error);
            setSpaces([]);
        } finally {
            setLoading(false);
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

    // Debounced fetch trigger
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            fetchSpacesData();
        }, 300);
        return () => clearTimeout(debounceTimer.current);
    }, [fetchSpacesData]);

    // Geolocation error handler
    const handleGeolocationError = (err) => {
        setLocationLoading(false);
        switch (err.code) {
            case err.PERMISSION_DENIED:
                setLocationError('Location access denied. Please allow location access in your browser.');
                break;
            case err.POSITION_UNAVAILABLE:
                setLocationError('Position unavailable. Please try again.');
                break;
            case err.TIMEOUT:
                setLocationError('Location request timed out.');
                break;
            default:
                setLocationError('Could not obtain current location.');
        }
    };

    // One-shot Geolocation ("Near Me")
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
                setFlyCenter([latitude, longitude]);
            },
            handleGeolocationError,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    };

    // Continuous Live Tracking
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
                setFlyCenter([latitude, longitude]);
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

    // Reset filters
    const handleClearFilters = () => {
        setSearchQuery('');
        setTypeFilter('');
        setMinPrice('');
        setMaxPrice('');
        setCoveredFilter('ALL');
        setAvailabilityFilter('ALL');
        setSortBy('NEAREST');
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

    const activeFilterCount = [
        Boolean(typeFilter),
        Boolean(minPrice || maxPrice),
        coveredFilter !== 'ALL',
        availabilityFilter !== 'ALL',
        sortBy !== 'NEAREST',
    ].filter(Boolean).length;

    // Handle space card selection
    const handleSelectSpace = (space) => {
        setSelectedSpaceId(space.id);
        if (space.latitude && space.longitude) {
            setFlyCenter([space.latitude, space.longitude]);
        }
        // On mobile, switch to map view to show selection
        if (window.innerWidth < 768) {
            setMobileTab('map');
        }
    };

    const vehicleTypeOptions = [
        { label: 'All', value: '' },
        { label: 'Sedan', value: 'SEDAN' },
        { label: 'Hatchback', value: 'HATCHBACK' },
        { label: 'SUV', value: 'SUV' },
        { label: 'Bike', value: 'BIKE' },
    ];

    return (
        <div className="flex flex-col md:flex-row h-full w-full bg-[#F8F8F6] text-[#1E2024] overflow-hidden relative">
            {/* ── MOBILE VIEW TOGGLE TABS ─────────────────────────────────── */}
            <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-[#EAEAE7] shrink-0 z-20">
                <div className="text-xs font-bold text-[#1E2024] flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#2554D7]" />
                    <span>{spaces.length} spots available</span>
                </div>
                <div className="inline-flex p-0.5 bg-[#F8F8F6] border border-[#EAEAE7] rounded-lg">
                    <button
                        type="button"
                        onClick={() => setMobileTab('list')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                            mobileTab === 'list'
                                ? 'bg-white text-[#2554D7] shadow-xs'
                                : 'text-[#666970] hover:text-[#1E2024]'
                        }`}
                    >
                        <ListIcon className="w-3.5 h-3.5" />
                        List ({spaces.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab('map')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                            mobileTab === 'map'
                                ? 'bg-white text-[#2554D7] shadow-xs'
                                : 'text-[#666970] hover:text-[#1E2024]'
                        }`}
                    >
                        <MapIcon className="w-3.5 h-3.5" />
                        Map
                    </button>
                </div>
            </div>

            {/* ── LEFT PANEL: SEARCH & RESULTS ───────────────────────────── */}
            <div
                className={`w-full md:w-[440px] lg:w-[480px] xl:w-[520px] shrink-0 h-full flex flex-col bg-[#F8F8F6] border-r border-[#EAEAE7] z-10 overflow-hidden ${
                    mobileTab === 'list' ? 'flex' : 'hidden md:flex'
                }`}
            >
                {/* Search & Filter Header (Sticky within left panel) */}
                <div className="p-4 bg-white border-b border-[#EAEAE7] space-y-3 shrink-0 shadow-2xs">
                    {/* Title + Results Counter */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-[#1E2024] tracking-tight">Explore Parking</h1>
                            <p className="text-xs text-[#666970]">Find & reserve verified private spots</p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EEF2FD] text-[#2554D7] border border-[#2554D7]/15">
                            {spaces.length} {spaces.length === 1 ? 'spot' : 'spots'}
                        </span>
                    </div>

                    {/* Search Input Bar */}
                    <div className="relative">
                        <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by city, neighborhood, or area..."
                            className="w-full pl-9 pr-8 py-2 text-sm bg-[#F8F8F6] border border-[#EAEAE7] rounded-xl text-[#1E2024] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2554D7]/20 focus:border-[#2554D7]"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                aria-label="Clear search"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Quick Vehicle Type Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                        {vehicleTypeOptions.map((opt) => {
                            const isSelected = typeFilter === opt.value;
                            return (
                                <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => setTypeFilter(opt.value)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                                        isSelected
                                            ? 'bg-[#2554D7] text-white shadow-xs'
                                            : 'bg-[#F8F8F6] text-[#666970] hover:text-[#1E2024] border border-[#EAEAE7]'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Geolocation & Filter Toggle Action Bar */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#EAEAE7]/80">
                        {/* Geolocation Button */}
                        <div className="flex items-center gap-2">
                            {!liveTrackingActive ? (
                                <button
                                    type="button"
                                    onClick={handleNearMe}
                                    disabled={locationLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#EAEAE7] hover:border-[#2554D7] text-[#1E2024] transition shadow-2xs disabled:opacity-50 cursor-pointer"
                                >
                                    <Navigation className={`w-3.5 h-3.5 text-[#2554D7] ${locationLoading ? 'animate-spin' : ''}`} />
                                    <span>{locationLoading ? 'Locating...' : 'Near Me'}</span>
                                </button>
                            ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#2554D7] border border-blue-200">
                                    <span className="w-2 h-2 rounded-full bg-[#2554D7] animate-pulse" />
                                    <span>Live GPS</span>
                                    <button
                                        type="button"
                                        onClick={handleStopLiveLocation}
                                        className="ml-1 text-gray-500 hover:text-red-600 font-bold"
                                        title="Stop live GPS tracking"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {!liveTrackingActive && (
                                <button
                                    type="button"
                                    onClick={handleEnableLiveLocation}
                                    disabled={locationLoading}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#666970] hover:text-[#1E2024] hover:bg-black/5 transition cursor-pointer"
                                    title="Track live coordinates as you move"
                                >
                                    <Radio className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Live Mode</span>
                                </button>
                            )}
                        </div>

                        {/* Filters Drawer Toggle */}
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setShowFilterPanel(!showFilterPanel)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    showFilterPanel || activeFilterCount > 0
                                        ? 'bg-[#EEF2FD] text-[#2554D7] border border-[#2554D7]/20'
                                        : 'bg-white border border-[#EAEAE7] text-[#666970] hover:text-[#1E2024]'
                                }`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Filters</span>
                                {activeFilterCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-[#2554D7] text-white text-[10px] flex items-center justify-center font-bold">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="text-xs font-semibold text-gray-500 hover:text-red-600 p-1 cursor-pointer"
                                    title="Reset all search filters"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Location Error Notice */}
                    {locationError && (
                        <div className="bg-red-50 text-red-700 text-xs p-2 rounded-lg border border-red-200 flex items-center justify-between">
                            <span>{locationError}</span>
                            <button onClick={() => setLocationError('')} className="p-0.5 text-red-400 hover:text-red-700">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Expandable Secondary Filter Drawer */}
                    {showFilterPanel && (
                        <div className="pt-3 border-t border-[#EAEAE7] space-y-3 text-xs animate-in fade-in duration-150">
                            {/* Price Range Filter */}
                            <div>
                                <label className="block font-semibold text-[#1E2024] mb-1">Price per Hour ({'\u20B9'})</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Min ₹"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        className="w-1/2 p-1.5 bg-[#F8F8F6] border border-[#EAEAE7] rounded-lg text-[#1E2024] focus:outline-none focus:border-[#2554D7]"
                                    />
                                    <span className="text-gray-400 font-bold">-</span>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Max ₹"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        className="w-1/2 p-1.5 bg-[#F8F8F6] border border-[#EAEAE7] rounded-lg text-[#1E2024] focus:outline-none focus:border-[#2554D7]"
                                    />
                                </div>
                            </div>

                            {/* Covered & Availability Selectors */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-[#1E2024] mb-1">Covered</label>
                                    <select
                                        value={coveredFilter}
                                        onChange={(e) => setCoveredFilter(e.target.value)}
                                        className="w-full p-1.5 bg-[#F8F8F6] border border-[#EAEAE7] rounded-lg text-[#1E2024] focus:outline-none focus:border-[#2554D7]"
                                    >
                                        <option value="ALL">All Spaces</option>
                                        <option value="TRUE">Covered Only</option>
                                        <option value="FALSE">Uncovered Only</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-[#1E2024] mb-1">Availability</label>
                                    <select
                                        value={availabilityFilter}
                                        onChange={(e) => setAvailabilityFilter(e.target.value)}
                                        className="w-full p-1.5 bg-[#F8F8F6] border border-[#EAEAE7] rounded-lg text-[#1E2024] focus:outline-none focus:border-[#2554D7]"
                                    >
                                        <option value="ALL">All Statuses</option>
                                        <option value="AVAILABLE">Available Only</option>
                                        <option value="OCCUPIED">Occupied Only</option>
                                    </select>
                                </div>
                            </div>

                            {/* Sort By Selector */}
                            <div>
                                <label className="block font-semibold text-[#1E2024] mb-1">Sort Results</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full p-1.5 bg-[#F8F8F6] border border-[#EAEAE7] rounded-lg text-[#1E2024] font-medium focus:outline-none focus:border-[#2554D7]"
                                >
                                    <option value="NEAREST">Nearest distance</option>
                                    <option value="PRICE_ASC">Price: Low to High</option>
                                    <option value="PRICE_DESC">Price: High to Low</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Scrollable Results List ─────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                    {loading ? (
                        /* Skeleton Loading Cards */
                        <div className="space-y-3">
                            {[1, 2, 3].map((n) => (
                                <div
                                    key={n}
                                    className="bg-white border border-[#EAEAE7] rounded-2xl p-4 animate-pulse space-y-3"
                                >
                                    <div className="h-28 bg-gray-200 rounded-xl" />
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                                    <div className="flex justify-between pt-2">
                                        <div className="h-5 bg-gray-200 rounded w-20" />
                                        <div className="h-8 bg-gray-200 rounded-lg w-28" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : spaces.length === 0 ? (
                        /* Clean Minimal Empty State */
                        <div className="bg-white border border-[#EAEAE7] rounded-2xl p-8 text-center space-y-3 my-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#EEF2FD] text-[#2554D7] flex items-center justify-center mx-auto shadow-2xs">
                                <Car className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-bold text-[#1E2024]">No parking spots found</h3>
                            <p className="text-xs text-[#666970] max-w-xs mx-auto leading-relaxed">
                                No parking spots matched your current search filters. Try widening your price range, clearing vehicle filters, or searching another city.
                            </p>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2554D7] hover:bg-[#1D44B8] text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Real Space Cards */
                        spaces.map((space) => {
                            const occupied = isOccupied(space.currentOccupancyStatus);
                            const badge = occupancyLabel(space.currentOccupancyStatus);
                            const distText = formatDistance(space.distanceKm);
                            const isSelected = selectedSpaceId === space.id;

                            return (
                                <div
                                    key={space.id}
                                    onClick={() => handleSelectSpace(space)}
                                    className={`bg-white border rounded-2xl overflow-hidden transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                                        isSelected
                                            ? 'border-[#2554D7] ring-2 ring-[#2554D7]/20 shadow-sm'
                                            : 'border-[#EAEAE7] hover:border-[#2554D7]/40 hover:shadow-sm'
                                    }`}
                                >
                                    <div>
                                        {/* Thumbnail (if available) or Compact Visual Header */}
                                        {space.images && space.images.length > 0 && !brokenImages[space.id] ? (
                                            <div className="relative h-36 bg-gray-100 overflow-hidden">
                                                <img
                                                    src={space.images[0]}
                                                    alt={space.title || 'Parking spot'}
                                                    onError={() => setBrokenImages(prev => ({ ...prev, [space.id]: true }))}
                                                    className="w-full h-full object-cover"
                                                />
                                                <span
                                                    className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${badge.badgeCls} backdrop-blur-xs`}
                                                >
                                                    {badge.text}
                                                </span>
                                                <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1E2024]/80 text-white backdrop-blur-xs uppercase">
                                                    {space.vehicleType || 'Car'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="p-3 pb-0 flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                                    {space.vehicleType || 'Car'}
                                                </span>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badge.badgeCls}`}
                                                >
                                                    {badge.text}
                                                </span>
                                            </div>
                                        )}

                                        {/* Card Info */}
                                        <div className="p-3.5 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-sm font-bold text-[#1E2024] leading-snug line-clamp-1">
                                                    {space.title}
                                                </h3>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-xs text-[#666970]">
                                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="truncate">
                                                    {space.address ? `${space.address}, ${space.city}` : space.city}
                                                </span>
                                            </div>

                                            {/* Distance & Feature Chips */}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {distText && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2554D7] bg-[#EEF2FD] px-2 py-0.5 rounded-md border border-[#2554D7]/15">
                                                        <Compass className="w-3 h-3" />
                                                        {distText} away
                                                    </span>
                                                )}
                                                {space.covered && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#F8F8F6] border border-[#EAEAE7] text-[#1E2024] px-1.5 py-0.5 rounded-md">
                                                        <Umbrella className="w-3 h-3 text-[#2554D7]" />
                                                        Covered
                                                    </span>
                                                )}
                                                {space.evCharging && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-md">
                                                        <Zap className="w-3 h-3 text-emerald-600" />
                                                        EV
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price & CTA Action Bar */}
                                    <div className="p-3.5 pt-2 border-t border-[#EAEAE7] flex items-center justify-between bg-gray-50/40">
                                        <div>
                                            <span className="text-base font-extrabold text-[#1E2024]">
                                                {'\u20B9'}{space.pricePerHour}
                                            </span>
                                            <span className="text-xs text-[#666970]"> / hr</span>
                                        </div>

                                        <Link
                                            to={`/parking/${space.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition ${
                                                occupied
                                                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                                                    : 'bg-[#2554D7] hover:bg-[#1D44B8] text-white hover:shadow-sm'
                                            }`}
                                        >
                                            {occupied ? 'View Details' : 'Book Spot'}
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL: INTERACTIVE MAPCN MAP ──────────────────────── */}
            <div
                className={`flex-1 h-full relative z-0 ${
                    mobileTab === 'map' ? 'flex' : 'hidden md:flex'
                }`}
            >
                <Map
                    ref={mapRef}
                    theme="light"
                    styles={{
                        light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
                        dark: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                    }}
                    center={userLocation ? [userLocation.lng, userLocation.lat] : [77.5946, 12.9716]}
                    zoom={12}
                    className="w-full h-full"
                >
                    <MapControls position="bottom-right" showZoom={true} />
                    <MapController center={flyCenter} mobileTab={mobileTab} />

                    {/* Driver's current location marker */}
                    {userLocation && (
                        <MapMarker
                            longitude={userLocation.lng}
                            latitude={userLocation.lat}
                            anchor="center"
                        >
                            <MarkerContent>
                                <div className="relative flex items-center justify-center">
                                    <span className="absolute w-8 h-8 rounded-full bg-[#2554D7]/25 animate-ping" />
                                    <div className="relative w-6 h-6 rounded-full bg-[#2554D7] border-2 border-white shadow-lg flex items-center justify-center text-white ring-4 ring-[#2554D7]/20">
                                        <Navigation className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </MarkerContent>
                            <MarkerPopup closeButton className="p-2.5 text-center space-y-1 w-48">
                                <div className="font-bold text-xs text-[#1E2024] flex items-center justify-center gap-1.5">
                                    <Navigation className="w-3.5 h-3.5 text-[#2554D7]" />
                                    <span>{liveTrackingActive ? 'Live Location Active' : 'You are here'}</span>
                                </div>
                                <p className="text-[11px] text-[#666970] font-mono">
                                    {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                                </p>
                            </MarkerPopup>
                        </MapMarker>
                    )}

                    {/* Space markers */}
                    {spaces.map((space) => {
                        const hasCoords =
                            space.latitude != null &&
                            space.longitude != null &&
                            !isNaN(parseFloat(space.latitude)) &&
                            !isNaN(parseFloat(space.longitude));
                        if (!hasCoords) return null;

                        const lat = parseFloat(space.latitude);
                        const lng = parseFloat(space.longitude);
                        const occupied = isOccupied(space.currentOccupancyStatus);
                        const badge = occupancyLabel(space.currentOccupancyStatus);
                        const isSelected = selectedSpaceId === space.id;

                        return (
                            <MapMarker
                                key={space.id}
                                longitude={lng}
                                latitude={lat}
                                anchor="bottom"
                                onClick={() => setSelectedSpaceId(space.id)}
                            >
                                <MarkerContent>
                                    <div
                                        className={`relative flex flex-col items-center cursor-pointer select-none transition-transform duration-150 ${
                                            isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'
                                        }`}
                                    >
                                        <div
                                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-xs whitespace-nowrap mb-0.5 border ${
                                                occupied
                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                    : 'bg-white text-emerald-700 border-emerald-200'
                                            }`}
                                        >
                                            {`₹${space.pricePerHour}`}
                                        </div>
                                        <div className="relative flex items-center justify-center">
                                            <span className="absolute -bottom-1 w-3 h-1 bg-black/25 rounded-full blur-[1px]" />
                                            <div
                                                className={`w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white ${
                                                    occupied ? 'bg-red-600' : 'bg-emerald-600'
                                                } ${isSelected ? 'ring-4 ring-[#2554D7]/50' : ''}`}
                                            >
                                                <MapPin className="w-4 h-4 fill-white" />
                                            </div>
                                        </div>
                                    </div>
                                </MarkerContent>
                                <MarkerPopup closeButton className="p-3 w-56 space-y-2.5">
                                    <div>
                                        <h4 className="font-bold text-xs text-[#1E2024] line-clamp-1">{space.title}</h4>
                                        <p className="text-[11px] text-[#666970] truncate">{space.city}</p>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-extrabold text-[#1E2024]">{`₹${space.pricePerHour}/hr`}</span>
                                        <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                badge.badgeCls
                                            }`}
                                        >
                                            {badge.text}
                                        </span>
                                    </div>

                                    {space.distanceKm != null && (
                                        <p className="text-[11px] font-semibold text-[#2554D7] flex items-center gap-1">
                                            <Compass className="w-3 h-3" />
                                            <span>{formatDistance(space.distanceKm)} away</span>
                                        </p>
                                    )}

                                    <Link
                                        to={`/parking/${space.id}`}
                                        className="block w-full text-center py-1.5 bg-[#2554D7] text-white rounded-xl text-xs font-semibold hover:bg-[#1D44B8] transition shadow-xs"
                                    >
                                        {occupied ? 'View Details' : 'Book Spot'}
                                    </Link>
                                </MarkerPopup>
                            </MapMarker>
                        );
                    })}
                </Map>

                {/* Floating Map Legend */}
                <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md border border-[#EAEAE7] rounded-xl px-3 py-2 shadow-sm text-xs space-y-1.5 hidden sm:block">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Map Legend</div>
                    <div className="flex items-center gap-3 text-[11px] text-[#1E2024] font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            Available
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            Occupied
                        </span>
                        {(nearMeActive || liveTrackingActive) && (
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#2554D7]" />
                                You
                            </span>
                        )}
                    </div>
                </div>

                {/* Floating Radius Selector (When Geolocation Active) */}
                {(nearMeActive || liveTrackingActive) && userLocation && (
                    <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md border border-[#EAEAE7] rounded-xl px-3 py-1.5 shadow-sm text-xs flex items-center gap-2">
                        <span className="font-semibold text-[#1E2024]">Radius:</span>
                        <select
                            value={radiusKm}
                            onChange={(e) => setRadiusKm(Number(e.target.value))}
                            className="bg-transparent font-bold text-[#2554D7] focus:outline-none cursor-pointer"
                        >
                            <option value={1}>1 km</option>
                            <option value={2}>2 km</option>
                            <option value={5}>5 km</option>
                            <option value={10}>10 km</option>
                            <option value={20}>20 km</option>
                        </select>
                    </div>
                )}

                {/* Floating Re-center on My Location button */}
                {userLocation && (
                    <button
                        type="button"
                        onClick={() => setFlyCenter([userLocation.lat, userLocation.lng])}
                        className="absolute bottom-6 right-14 z-10 w-10 h-10 rounded-xl bg-white border border-[#EAEAE7] text-[#2554D7] shadow-md hover:bg-[#EEF2FD] transition flex items-center justify-center cursor-pointer"
                        title="Re-center map on your location"
                        aria-label="Re-center map on your location"
                    >
                        <Navigation className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default DriverDashboard;