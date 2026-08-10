import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

// ─── PRD v1.0 date-window helpers ───────────────────────────────────────────

/** Returns the current time + 1 minute as a datetime-local string (browser local).
 *  Used as the `min` attribute so drivers cannot pick a start time in the past. */
const getTodayMin = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(now.getMinutes() + 1);
    // toISOString returns UTC — convert to local ISO-like string
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
};

/** Returns tomorrow at 23:59 local time as a datetime-local string.
 *  Used as the `max` attribute to prevent bookings beyond tomorrow. */
const getTomorrowMax = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    const offset = tomorrow.getTimezoneOffset();
    const local = new Date(tomorrow.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
};

// ─── v1.1: Occupancy helpers ─────────────────────────────────────────────────

/**
 * Returns true if the space is currently occupied (CONFIRMED / ACTIVE / OVERSTAY).
 */
const isSpaceOccupied = (currentOccupancyStatus) =>
    currentOccupancyStatus === 'CONFIRMED' ||
    currentOccupancyStatus === 'ACTIVE' ||
    currentOccupancyStatus === 'OVERSTAY';

/**
 * Returns a human-readable occupancy message and severity level.
 */
const getOccupancyInfo = (currentOccupancyStatus) => {
    switch (currentOccupancyStatus) {
        case 'OVERSTAY':
            return {
                label: '🔴 Currently Occupied — Overstay in Progress',
                detail: 'The current driver has exceeded their booking time and has not yet completed checkout. This space will be released only after the driver completes the Closing OTP process.',
                color: 'red',
            };
        case 'ACTIVE':
            return {
                label: '🔴 Currently Occupied — Driver is Parked',
                detail: 'A driver is currently using this space. It will become available after they complete their checkout.',
                color: 'red',
            };
        case 'CONFIRMED':
            return {
                label: '🟡 Reserved — Awaiting Driver Arrival',
                detail: 'This space has an upcoming confirmed booking. Please choose a different time slot or check back later.',
                color: 'yellow',
            };
        default:
            return null;
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

const ParkingSpaceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [space, setSpace] = useState(null);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [error, setError] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);

    // Allowed booking window — today now → tomorrow 23:59
    const minDateTime = getTodayMin();
    const maxDateTime = getTomorrowMax();

    useEffect(() => {
        const fetchSpace = async () => {
            try {
                const res = await api.get(`/parking/public/${id}`);
                if (res.success) setSpace(res.data);
            } catch (err) {
                setError("Failed to load parking space details");
            }
        };
        fetchSpace();
    }, [id]);

    const calculatePrice = () => {
        if (!startTime || !endTime || !space) return 0;
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours <= 0) return 0;
        const billedHours = Math.max(1, Math.ceil(diffHours));
        return billedHours * space.pricePerHour;
    };

    const handleBooking = async (e) => {
        e.preventDefault();
        setError('');

        if (!user) {
            navigate('/login');
            return;
        }

        // ── v1.1: Block booking if space is currently occupied ──────────────
        if (isSpaceOccupied(space?.currentOccupancyStatus)) {
            setError('This parking space is currently occupied. Please try again later.');
            return;
        }

        // ── PRD v1.0 client-side pre-validation ────────────────────────────
        const now = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);
        const tomorrowEnd = new Date();
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
        tomorrowEnd.setHours(23, 59, 59, 999);

        if (start <= now) {
            setError('Start time must be in the future.');
            return;
        }
        if (end <= start) {
            setError('End time must be after start time.');
            return;
        }
        if (start > tomorrowEnd) {
            setError('Bookings are only allowed for today or tomorrow.');
            return;
        }
        if (end > tomorrowEnd) {
            setError('End time must fall within today or tomorrow.');
            return;
        }
        // ───────────────────────────────────────────────────────────────────

        try {
            const res = await api.post('/bookings', {
                parkingSpaceId: space.id,
                startTime: startTime,
                endTime: endTime
            });
            if (res.success) {
                setBookingSuccess(true);
                setTimeout(() => navigate('/driver/bookings'), 2000);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create booking");
        }
    };

    if (!space) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    const totalPrice = calculatePrice();
    const occupied = isSpaceOccupied(space.currentOccupancyStatus);
    const occupancyInfo = getOccupancyInfo(space.currentOccupancyStatus);

    return (
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
            <div className="md:col-span-2 space-y-6">
                <div className="flex items-start gap-4">
                    <h1 className="text-4xl font-extrabold text-gray-800 flex-1">{space.title}</h1>
                    {/* v1.1: Live occupancy badge next to title */}
                    {occupied ? (
                        <span className="mt-1 shrink-0 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
                            🔴 Occupied
                        </span>
                    ) : (
                        <span className="mt-1 shrink-0 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-200">
                            🟢 Available
                        </span>
                    )}
                </div>
                <p className="text-gray-500 text-lg">{space.address}, {space.city} {space.zipCode}</p>

                {/* v1.1: Live occupancy banner */}
                {occupancyInfo && (
                    <div className={`rounded-xl p-4 border ${
                        occupancyInfo.color === 'red'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    }`}>
                        <p className="font-bold text-base mb-1">{occupancyInfo.label}</p>
                        <p className="text-sm">{occupancyInfo.detail}</p>
                    </div>
                )}

                {space.images?.length > 0 ? (
                    <img src={space.images[0]} alt="Parking Space" className="w-full h-96 object-cover rounded-xl shadow-lg" />
                ) : (
                    <div className="w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 shadow-inner">No Image Available</div>
                )}

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-bold mb-4">Description</h2>
                    <p className="text-gray-700 leading-relaxed">{space.description || "No description provided."}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-bold mb-4">Features</h2>
                    <ul className="grid grid-cols-2 gap-4 text-gray-700">
                        <li><span className="font-semibold">Vehicle Type:</span> {space.vehicleType}</li>
                        <li><span className="font-semibold">Property:</span> {space.propertyType === 'HOUSE' ? '🏠 House' : '🏢 Apartment'}</li>
                        <li><span className="font-semibold">Covered:</span> {space.covered ? "Yes" : "No"}</li>
                        <li><span className="font-semibold">EV Charging:</span> {space.evCharging ? "Yes" : "No"}</li>
                        <li><span className="font-semibold">Owner:</span> {space.ownerName}</li>
                    </ul>
                </div>
            </div>

            <div className="md:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-xl sticky top-6 border border-gray-100">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">₹{space.pricePerHour} <span className="text-gray-500 text-lg font-normal">/ hour</span></h3>
                    {space.pricePerDay && <p className="text-gray-500 mb-4">₹{space.pricePerDay} / day</p>}

                    {/* v1.1: Occupancy-aware booking panel */}
                    {occupied ? (
                        <div className="space-y-4">
                            <div className={`rounded-lg p-4 text-center ${
                                space.currentOccupancyStatus === 'OVERSTAY'
                                    ? 'bg-red-50 border border-red-200'
                                    : 'bg-orange-50 border border-orange-200'
                            }`}>
                                <p className="font-bold text-gray-800 mb-1">
                                    {space.currentOccupancyStatus === 'OVERSTAY'
                                        ? '⏰ Overstay In Progress'
                                        : '🚗 Space is Occupied'}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {space.currentOccupancyStatus === 'OVERSTAY'
                                        ? 'The space will be released only after the driver completes the Closing OTP checkout.'
                                        : 'This space is currently in use. Check back later.'}
                                </p>
                            </div>
                            {/* PRD v1.0: Booking window reminder */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                                📅 Bookings available for <strong>today</strong> and <strong>tomorrow</strong> only.
                            </div>
                            <p className="text-xs text-gray-400 text-center">
                                You can still submit a booking request — it will be queued for when the space becomes available.
                            </p>
                            {/* Still allow booking creation so the backend overlap guard handles it */}
                            <form onSubmit={handleBooking} className="space-y-3 pt-2 border-t border-gray-100">
                                {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
                                <div>
                                    <label className="block text-gray-700 font-medium mb-1 text-sm">Start Time</label>
                                    <input type="datetime-local" value={startTime} min={minDateTime} max={maxDateTime}
                                        onChange={(e) => setStartTime(e.target.value)} required
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-1 text-sm">End Time</label>
                                    <input type="datetime-local" value={endTime} min={startTime || minDateTime} max={maxDateTime}
                                        onChange={(e) => setEndTime(e.target.value)} required
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                </div>
                                {totalPrice > 0 && (
                                    <div className="border-t pt-3 flex justify-between items-center font-bold">
                                        <span className="text-sm">Total</span>
                                        <span>₹{totalPrice.toFixed(2)}</span>
                                    </div>
                                )}
                                <button type="submit"
                                    disabled={totalPrice <= 0 || user?.role === 'OWNER'}
                                    className="w-full bg-gray-500 text-white py-3 rounded-lg font-bold hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                                    {user?.role === 'OWNER' ? 'Owners Cannot Book' : 'Request Anyway (Space Occupied)'}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <>
                            {/* PRD v1.0: Booking window reminder */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700">
                                📅 Bookings available for <strong>today</strong> and <strong>tomorrow</strong> only.
                            </div>

                            {bookingSuccess ? (
                                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                                    Booking confirmed! Redirecting...
                                </div>
                            ) : (
                                <form onSubmit={handleBooking} className="space-y-4">
                                    {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}

                                    <div>
                                        <label className="block text-gray-700 font-medium mb-1">Start Time</label>
                                        <input
                                            type="datetime-local"
                                            value={startTime}
                                            min={minDateTime}
                                            max={maxDateTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            required
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 font-medium mb-1">End Time</label>
                                        <input
                                            type="datetime-local"
                                            value={endTime}
                                            min={startTime || minDateTime}
                                            max={maxDateTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            required
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>

                                    {totalPrice > 0 && (
                                        <div className="border-t pt-2 flex justify-between items-center font-bold text-lg">
                                            <span>Total Price</span>
                                            <span className="text-blue-600">₹{totalPrice.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={totalPrice <= 0 || !space.available || user?.role === 'OWNER'}
                                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {user?.role === 'OWNER' ? 'Owners Cannot Book' : 'Reserve Now'}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParkingSpaceDetails;
