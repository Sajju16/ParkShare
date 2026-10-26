import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Map, MapMarker, MarkerContent, MapControls } from '@/components/ui/map';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
    ArrowLeft,
    MapPin,
    Car,
    ShieldCheck,
    Zap,
    Building2,
    Warehouse,
    UserCheck,
    Clock,
    AlertCircle,
    CheckCircle2,
    Calendar,
    ArrowRight,
    Loader2,
    AlertTriangle,
    Info,
    Sparkles
} from 'lucide-react';

// PRD v1.0 date-window helpers: today now through tomorrow 23:59
const getTodayMin = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(now.getMinutes() + 1);
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
};

const getTomorrowMax = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    const offset = tomorrow.getTimezoneOffset();
    const local = new Date(tomorrow.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
};

// Occupancy helpers
const isSpaceOccupied = (currentOccupancyStatus) =>
    currentOccupancyStatus === 'CONFIRMED' ||
    currentOccupancyStatus === 'ACTIVE' ||
    currentOccupancyStatus === 'OVERSTAY';

const getOccupancyInfo = (currentOccupancyStatus) => {
    switch (currentOccupancyStatus) {
        case 'OVERSTAY':
            return {
                title: 'Overstay in Progress',
                detail: 'The current driver has exceeded their booking duration. The space will be released once closing checkout completes.',
                type: 'error'
            };
        case 'ACTIVE':
            return {
                title: 'Driver Currently Parked',
                detail: 'A driver is currently parked in this spot. It will be released when checkout is completed.',
                type: 'error'
            };
        case 'CONFIRMED':
            return {
                title: 'Reserved â€” Awaiting Driver Arrival',
                detail: 'This space has an upcoming confirmed reservation. You may select an alternative time slot.',
                type: 'warning'
            };
        default:
            return null;
    }
};

const ParkingSpaceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useContext(AuthContext);

    const [space, setSpace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [bookingError, setBookingError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const mapRef = useRef(null);

    // Allowed booking window: now through tomorrow 23:59
    const minDateTime = getTodayMin();
    const maxDateTime = getTomorrowMax();

    // Ensure MapLibre recalculates canvas dimensions after component mount and space load
    useEffect(() => {
        if (mapRef.current) {
            const timer = setTimeout(() => {
                mapRef.current?.resize();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [space?.id]);

    useEffect(() => {
        const fetchSpace = async () => {
            setLoading(true);
            setFetchError('');
            try {
                const res = await api.get(`/parking/public/${id}`);
                if (res.success) {
                    setSpace(res.data);
                } else {
                    setFetchError('Failed to load parking space details.');
                }
            } catch (err) {
                setFetchError(err.response?.data?.message || 'Failed to load parking space details. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchSpace();
    }, [id]);

    // Calculate duration in hours and total price
    const getBookingCalculation = () => {
        if (!startTime || !endTime || !space) return { hours: 0, totalPrice: 0, isValidRange: false };
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diffMs = end - start;
        if (diffMs <= 0) return { hours: 0, totalPrice: 0, isValidRange: false };
        const diffHours = diffMs / (1000 * 60 * 60);
        const billedHours = Math.max(1, Math.ceil(diffHours));
        const totalPrice = billedHours * space.pricePerHour;
        return { hours: billedHours, totalPrice, isValidRange: true };
    };

    const handleBooking = async (e) => {
        e.preventDefault();
        setBookingError('');

        // Unauthenticated visitor -> send to login preserving destination
        if (!user) {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, {
                state: { redirect: location.pathname }
            });
            return;
        }

        if (user.role === 'OWNER') {
            setBookingError('Space owners cannot book parking spots. Please switch to a driver account.');
            return;
        }

        if (isSpaceOccupied(space?.currentOccupancyStatus)) {
            setBookingError('This parking space is currently occupied. Please choose another time or spot.');
            return;
        }

        const now = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);
        const tomorrowEnd = new Date();
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
        tomorrowEnd.setHours(23, 59, 59, 999);

        if (start <= now) {
            setBookingError('Start time must be in the future.');
            return;
        }
        if (end <= start) {
            setBookingError('End time must be after start time.');
            return;
        }
        if (start > tomorrowEnd || end > tomorrowEnd) {
            setBookingError('Bookings are only allowed for today or tomorrow.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/bookings', {
                parkingSpaceId: space.id,
                startTime: startTime,
                endTime: endTime
            });
            if (res.success) {
                setBookingSuccess(true);
                setTimeout(() => navigate('/driver/bookings'), 1500);
            } else {
                setBookingError(res.message || 'Failed to create booking.');
            }
        } catch (err) {
            setBookingError(err.response?.data?.message || 'Failed to create booking. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-[#F8F8F6] flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#2554D7] animate-spin" />
                    <p className="text-sm font-medium text-[#666970]">Loading parking details...</p>
                </div>
            </div>
        );
    }

    if (fetchError || !space) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-[#F8F8F6] flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl border border-[#EAEAE7] p-8 max-w-md text-center shadow-xs space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-[#1E2024]">Unable to Load Spot</h2>
                    <p className="text-xs text-[#666970]">{fetchError || 'This parking spot could not be found or has been removed.'}</p>
                    <Link
                        to="/driver-dashboard"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2554D7] text-white text-xs font-semibold hover:bg-[#1D44B8] transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Return to Explore Parking</span>
                    </Link>
                </div>
            </div>
        );
    }

    const { hours, totalPrice, isValidRange } = getBookingCalculation();
    const occupied = isSpaceOccupied(space.currentOccupancyStatus);
    const occupancyInfo = getOccupancyInfo(space.currentOccupancyStatus);
    const isCovered = space.covered ?? space.isCovered;
    const hasEv = space.evCharging ?? space.hasEvCharging;
    const hasCoordinates = space.latitude != null && space.longitude != null && !isNaN(space.latitude) && !isNaN(space.longitude);
    const lat = hasCoordinates ? parseFloat(space.latitude) : 12.9716;
    const lng = hasCoordinates ? parseFloat(space.longitude) : 77.5946;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#F8F8F6] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 selection:bg-[#2554D7] selection:text-white">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Back Navigation Bar */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#666970] hover:text-[#2554D7] transition-colors group cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        <span>Back to Search Results</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {occupied ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                Occupied
                            </span>
                        ) : space.available !== false ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Available Now
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                Paused
                            </span>
                        )}
                    </div>
                </div>

                {/* Main Two-Column Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Photos, Details, Features, Location Map */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                        {/* Hero Image Section */}
                        <div className="relative h-64 sm:h-80 md:h-96 w-full rounded-2xl overflow-hidden border border-[#EAEAE7] bg-[#F8F8F6] shadow-xs">
                            {space.images && space.images.length > 0 ? (
                                <img
                                    src={space.images[0]}
                                    alt={space.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2 bg-gradient-to-b from-[#F8F8F6] to-gray-100">
                                    <Car className="w-12 h-12 opacity-30 text-gray-400" />
                                    <p className="text-xs font-medium text-gray-500">Verified Parking Space (No Photo Provided)</p>
                                </div>
                            )}

                            {/* Badges on Hero */}
                            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-white/95 backdrop-blur-xs text-[#2554D7] shadow-xs">
                                    {space.vehicleType || 'VEHICLE'}
                                </span>
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/60 backdrop-blur-xs text-white">
                                    {space.propertyType === 'APARTMENT' ? 'Apartment Complex' : 'Independent House'}
                                </span>
                            </div>
                        </div>

                        {/* Occupancy Notice Alert if Occupied */}
                        {occupancyInfo && (
                            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                                occupancyInfo.type === 'error'
                                    ? 'bg-red-50 border-red-200 text-red-900'
                                    : 'bg-amber-50 border-amber-200 text-amber-900'
                            }`}>
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                                <div>
                                    <h2 className="text-sm font-bold">{occupancyInfo.title}</h2>
                                    <p className="text-xs mt-0.5 text-gray-700 leading-relaxed">{occupancyInfo.detail}</p>
                                </div>
                            </div>
                        )}

                        {/* Space Header Info Card */}
                        <div className="bg-white rounded-2xl border border-[#EAEAE7] p-6 shadow-xs space-y-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E2024]">
                                    {space.title}
                                </h1>
                                <p className="text-sm text-[#666970] flex items-center gap-1.5 mt-2">
                                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                    <span>{space.address}{space.city ? `, ${space.city}` : ''} {space.zipCode || ''}</span>
                                </p>
                            </div>

                            {/* Host & Facility Quick Pills */}
                            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#EAEAE7]">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7] text-xs text-[#1E2024]">
                                    <UserCheck className="w-3.5 h-3.5 text-[#2554D7]" />
                                    <span>Host: <strong>{space.ownerName || 'Verified Host'}</strong></span>
                                </div>

                                {isCovered && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Covered Space</span>
                                    </div>
                                )}

                                {hasEv && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-100 text-xs font-semibold text-[#2554D7]">
                                        <Zap className="w-3.5 h-3.5 text-[#2554D7]" />
                                        <span>EV Charging</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description Section */}
                        <div className="bg-white rounded-2xl border border-[#EAEAE7] p-6 shadow-xs space-y-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1E2024]">
                                About this space
                            </h2>
                            <p className="text-sm text-[#666970] leading-relaxed whitespace-pre-line">
                                {space.description || 'No additional description provided by the host. Contact host upon booking confirmation for gate code or entry instructions.'}
                            </p>
                        </div>

                        {/* Features & Amenities Table */}
                        <div className="bg-white rounded-2xl border border-[#EAEAE7] p-6 shadow-xs space-y-4">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1E2024]">
                                Space Amenities & Compatibility
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7] flex items-center justify-between">
                                    <span className="text-[#666970]">Supported Vehicle</span>
                                    <span className="font-bold text-[#1E2024]">{space.vehicleType || 'Any standard vehicle'}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7] flex items-center justify-between">
                                    <span className="text-[#666970]">Property Category</span>
                                    <span className="font-bold text-[#1E2024]">{space.propertyType === 'APARTMENT' ? 'Apartment' : 'Residential House'}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7] flex items-center justify-between">
                                    <span className="text-[#666970]">Covered Parking</span>
                                    <span className={`font-bold ${isCovered ? 'text-emerald-700' : 'text-gray-500'}`}>
                                        {isCovered ? 'Yes (Weather Protected)' : 'Open / Uncovered'}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7] flex items-center justify-between">
                                    <span className="text-[#666970]">EV Charging Point</span>
                                    <span className={`font-bold ${hasEv ? 'text-[#2554D7]' : 'text-gray-500'}`}>
                                        {hasEv ? 'Available On-site' : 'None'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Location Map Preview with MapCN */}
                        {hasCoordinates && (
                            <div className="bg-white rounded-2xl border border-[#EAEAE7] p-6 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-sm font-bold uppercase tracking-wider text-[#1E2024]">
                                            Location Preview
                                        </h2>
                                        <p className="text-xs text-[#666970] mt-0.5">
                                            {space.address}, {space.city} ({lat.toFixed(4)}, {lng.toFixed(4)})
                                        </p>
                                    </div>
                                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                        GPS PIN
                                    </span>
                                </div>

                                <div className="h-64 w-full rounded-xl overflow-hidden border border-[#EAEAE7] relative z-0">
                                    <Map
                                        ref={mapRef}
                                        key={space.id}
                                        theme="light"
                                        styles={{
                                            light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
                                            dark: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                                        }}
                                        center={[lng, lat]}
                                        zoom={15}
                                        scrollZoom={false}
                                        className="w-full h-full"
                                    >
                                        <MapControls position="bottom-right" showZoom={true} />
                                        <MapMarker
                                            longitude={lng}
                                            latitude={lat}
                                            anchor="center"
                                            draggable={false}
                                        >
                                            <MarkerContent>
                                                <div className="relative flex items-center justify-center">
                                                    <span className="absolute w-5 h-5 rounded-full bg-red-500/25 animate-ping" />
                                                    <div className="relative w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
                                                        <MapPin className="w-4 h-4 fill-white" />
                                                    </div>
                                                </div>
                                            </MarkerContent>
                                        </MapMarker>
                                    </Map>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Sticky Booking Panel */}
                    <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
                        <div className="bg-white rounded-2xl border border-[#EAEAE7] p-6 shadow-sm space-y-5">
                            {/* Pricing Header */}
                            <div className="pb-4 border-b border-[#EAEAE7] flex items-baseline justify-between">
                                <div>
                                    <span className="text-3xl font-extrabold text-[#1E2024]">
                                        {'\u20B9'}{space.pricePerHour}
                                    </span>
                                    <span className="text-xs text-[#666970] font-medium"> / hour</span>
                                </div>
                                {space.pricePerDay && (
                                    <div className="text-right">
                                        <span className="text-sm font-semibold text-[#666970]">
                                            {'\u20B9'}{space.pricePerDay}
                                        </span>
                                        <span className="text-[10px] text-gray-600 block">per day rate</span>
                                    </div>
                                )}
                            </div>

                            {/* Booking Window Rule Pill */}
                            <div className="p-3 rounded-xl bg-[#EEF2FD] border border-[#D5E0FA] text-[#2554D7] text-xs flex items-start gap-2">
                                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Bookings available for <strong>today</strong> and <strong>tomorrow</strong> only.</span>
                            </div>

                            {/* Success Alert */}
                            {bookingSuccess ? (
                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <span>Reservation requested successfully! Redirecting to your bookings...</span>
                                </div>
                            ) : (
                                <form onSubmit={handleBooking} className="space-y-4">
                                    {bookingError && (
                                        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                                            <span>{bookingError}</span>
                                        </div>
                                    )}

                                    {/* Start Time Field */}
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1E2024] mb-1.5">
                                            Start Time <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="datetime-local"
                                                required
                                                min={minDateTime}
                                                max={maxDateTime}
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-xs sm:text-sm text-[#1E2024] focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition"
                                            />
                                        </div>
                                    </div>

                                    {/* End Time Field */}
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1E2024] mb-1.5">
                                            End Time <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="datetime-local"
                                                required
                                                min={startTime || minDateTime}
                                                max={maxDateTime}
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-xs sm:text-sm text-[#1E2024] focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition"
                                            />
                                        </div>
                                    </div>

                                    {/* Transparent Pricing Breakdown */}
                                    {isValidRange && totalPrice > 0 && (
                                        <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7] space-y-2 text-xs">
                                            <div className="flex justify-between text-[#666970]">
                                                <span>Duration</span>
                                                <span className="font-semibold text-[#1E2024]">{hours} hour{hours > 1 ? 's' : ''}</span>
                                            </div>
                                            <div className="flex justify-between text-[#666970]">
                                                <span>Hourly Rate</span>
                                                <span className="font-semibold text-[#1E2024]">{'\u20B9'}{space.pricePerHour}</span>
                                            </div>
                                            <div className="pt-2 border-t border-[#EAEAE7] flex justify-between items-center text-sm font-bold text-[#1E2024]">
                                                <span>Total Price</span>
                                                <span className="text-lg text-[#2554D7]">{'\u20B9'}{totalPrice.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Primary CTA Button */}
                                    {!user ? (
                                        <button
                                            type="submit"
                                            className="w-full inline-flex items-center justify-center gap-2 bg-[#2554D7] hover:bg-[#1D44B8] text-white py-3 px-4 rounded-xl text-sm font-semibold shadow-xs hover:shadow transition-all cursor-pointer active:scale-[0.99]"
                                        >
                                            <span>Sign in to Reserve</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    ) : user.role === 'OWNER' ? (
                                        <div className="p-3 rounded-xl bg-gray-100 border border-gray-200 text-center">
                                            <p className="text-xs font-bold text-gray-700">Space Owners Cannot Book</p>
                                            <p className="text-[11px] text-[#666970] mt-0.5">Please sign in as a driver to reserve spots.</p>
                                        </div>
                                    ) : occupied ? (
                                        <button
                                            type="submit"
                                            disabled={true}
                                            className="w-full inline-flex items-center justify-center gap-2 bg-gray-200 text-gray-500 py-3 px-4 rounded-xl text-sm font-bold cursor-not-allowed"
                                        >
                                            <span>Space Occupied</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={submitting || !isValidRange || totalPrice <= 0}
                                            className="w-full inline-flex items-center justify-center gap-2 bg-[#2554D7] hover:bg-[#1D44B8] text-white py-3 px-4 rounded-xl text-sm font-semibold shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Submitting Reservation...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Confirm & Reserve Spot</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    )}
                                </form>
                            )}

                            {/* Trust & Policy Guarantees */}
                            <div className="pt-3 border-t border-[#EAEAE7] space-y-1.5 text-[11px] text-[#666970]">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Check-in OTP generated upon payment</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Free cancellation before check-in</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParkingSpaceDetails;