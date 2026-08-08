import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { CheckCircle, XCircle, DollarSign, Users, Bell, Key, AlertTriangle, LogOut } from 'lucide-react';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// ── OTP Verification Panel (owner-facing) ────────────────────────────────────

/**
 * PRD v1.0 Slice 2: Owner enters the 4-digit OTP the driver shows on arrival.
 * - otpAttempts from the booking response tracks remaining tries.
 * - Owner never sees the actual OTP value.
 */
const OtpVerifyPanel = ({ booking, onSuccess }) => {
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState('');
    const [otpSuccess, setOtpSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const remaining = 3 - (booking.otpAttempts || 0);
    const isLocked = remaining <= 0;

    const handleVerify = async () => {
        if (otpInput.length !== 4 || !/^\d{4}$/.test(otpInput)) {
            setOtpError('Please enter a valid 4-digit OTP.');
            return;
        }
        setOtpError('');
        setLoading(true);
        try {
            const res = await api.put(`/bookings/${booking.id}/verify-otp`, { otpCode: otpInput });
            if (res.success) {
                setOtpSuccess('✅ OTP verified! Booking is now ACTIVE.');
                onSuccess();
            }
        } catch (err) {
            setOtpError(err.response?.data?.message || 'OTP verification failed.');
            onSuccess(); // Refresh to get updated attempt count
        } finally {
            setLoading(false);
            setOtpInput('');
        }
    };

    if (isLocked) {
        return (
            <div className="mt-3 bg-red-50 border border-red-300 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle size={16} />
                OTP verification is locked after 3 incorrect attempts.
            </div>
        );
    }

    return (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
                <Key size={16} className="text-blue-600" />
                <p className="text-sm font-semibold text-blue-800">Verify Driver OTP</p>
                <span className="text-xs text-blue-500 ml-auto">{remaining} attempt{remaining !== 1 ? 's' : ''} remaining</span>
            </div>
            <p className="text-xs text-blue-600 mb-3">Ask the driver for their 4-digit OTP and enter it below.</p>

            <div className="flex gap-2">
                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    className="w-28 text-center font-mono text-xl font-bold border-2 border-blue-300 rounded-lg p-2 focus:outline-none focus:border-blue-500 tracking-widest"
                    disabled={loading}
                />
                <button
                    onClick={handleVerify}
                    disabled={loading || otpInput.length < 4}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold text-sm transition"
                >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
            </div>

            {otpError && (
                <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                    {otpError}
                </p>
            )}
            {otpSuccess && (
                <p className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                    {otpSuccess}
                </p>
            )}
        </div>
    );
};

// ── Closing OTP Verification Panel (owner-facing) ─────────────────────────────

/**
 * Owner verifies the driver's closing OTP to confirm physical departure.
 * Called only after driver has initiated checkout (closingOtpCode is set).
 * Uses /verify-closing-otp endpoint.
 */
const ClosingOtpVerifyPanel = ({ booking, onSuccess }) => {
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState('');
    const [otpSuccess, setOtpSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const remaining = 3 - (booking.closingOtpAttempts || 0);
    const isLocked = remaining <= 0;

    const handleVerify = async () => {
        if (otpInput.length !== 4 || !/^\d{4}$/.test(otpInput)) {
            setOtpError('Please enter a valid 4-digit closing OTP.');
            return;
        }
        setOtpError('');
        setLoading(true);
        try {
            const res = await api.put(`/bookings/${booking.id}/verify-closing-otp`, { otpCode: otpInput });
            if (res.success) {
                setOtpSuccess('✅ Closing OTP verified! Booking is now COMPLETED. Space released.');
                onSuccess();
            }
        } catch (err) {
            setOtpError(err.response?.data?.message || 'Closing OTP verification failed.');
            onSuccess(); // Refresh to get updated attempt count
        } finally {
            setLoading(false);
            setOtpInput('');
        }
    };

    if (isLocked) {
        return (
            <div className="mt-3 bg-red-50 border border-red-300 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle size={16} />
                Closing OTP verification is locked after 3 incorrect attempts. Contact support.
            </div>
        );
    }

    return (
        <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
                <LogOut size={16} className="text-orange-600" />
                <p className="text-sm font-semibold text-orange-800">Verify Closing OTP (Departure)</p>
                <span className="text-xs text-orange-500 ml-auto">{remaining} attempt{remaining !== 1 ? 's' : ''} remaining</span>
            </div>
            <p className="text-xs text-orange-600 mb-3">Ask the driver for their 4-digit closing OTP and enter it below to confirm departure.</p>

            <div className="flex gap-2">
                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    className="w-28 text-center font-mono text-xl font-bold border-2 border-orange-300 rounded-lg p-2 focus:outline-none focus:border-orange-500 tracking-widest"
                    disabled={loading}
                />
                <button
                    onClick={handleVerify}
                    disabled={loading || otpInput.length < 4}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold text-sm transition"
                >
                    {loading ? 'Verifying...' : 'Verify Closing OTP'}
                </button>
            </div>

            {otpError && (
                <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                    {otpError}
                </p>
            )}
            {otpSuccess && (
                <p className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                    {otpSuccess}
                </p>
            )}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

const OwnerBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState({ todayRevenueEstimate: 0, activeOccupancy: 0, pendingRequests: 0 });
    const [error, setError] = useState('');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', bookingId: null });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [bookRes, statsRes] = await Promise.all([
                api.get('/bookings/owner'),
                api.get('/bookings/owner/stats')
            ]);
            if (bookRes.success) setBookings(bookRes.data);
            if (statsRes.success) setStats(statsRes.data);
        } catch (err) {
            setError("Failed to load dashboard data.");
        }
    };

    const handleActionClick = (id, type) => setModalConfig({ isOpen: true, type, bookingId: id });

    const executeAction = async () => {
        const { type, bookingId } = modalConfig;
        try {
            const res = await api.put(`/bookings/${bookingId}/${type}`);
            if (res.success) fetchData();
        } catch (err) {
            alert(err.response?.data?.message || `Failed to ${type} booking.`);
        } finally {
            setModalConfig({ isOpen: false, type: '', bookingId: null });
        }
    };

    const calendarEvents = bookings
        .filter(b => ['CONFIRMED', 'ACTIVE', 'OVERSTAY', 'COMPLETED'].includes(b.status))
        .map(b => ({
            id: b.id,
            title: `${b.parkingSpaceTitle} — ${b.driverName}${b.status === 'OVERSTAY' ? ' ⚠ OVERSTAY' : ''}`,
            start: new Date(b.startTime),
            end: new Date(b.endTime),
            resource: b,
        }));

    const pendingBookings = bookings.filter(b => b.status === 'PENDING');
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
    const activeBookings = bookings.filter(b => b.status === 'ACTIVE');
    const overstayBookings = bookings.filter(b => b.status === 'OVERSTAY');

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-8">
            <h1 className="text-4xl font-extrabold mb-8 text-gray-800">Booking Management</h1>
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-4 bg-green-100 text-green-600 rounded-lg"><DollarSign size={32} /></div>
                    <div>
                        <p className="text-gray-500 text-sm uppercase tracking-wide">Today's Revenue</p>
                        <p className="text-3xl font-bold text-gray-800">${stats.todayRevenueEstimate.toFixed(2)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-4 bg-blue-100 text-blue-600 rounded-lg"><Users size={32} /></div>
                    <div>
                        <p className="text-gray-500 text-sm uppercase tracking-wide">Active Occupancy</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.activeOccupancy} <span className="text-lg font-medium text-gray-500">spaces</span></p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-4 bg-yellow-100 text-yellow-600 rounded-lg"><Bell size={32} /></div>
                    <div>
                        <p className="text-gray-500 text-sm uppercase tracking-wide">Pending Requests</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.pendingRequests}</p>
                    </div>
                </div>
            </div>

            {/* Pending Requests */}
            {pendingBookings.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-6">Booking Requests</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {pendingBookings.map(b => (
                            <div key={b.id} className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl flex justify-between items-center shadow-sm">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{b.parkingSpaceTitle}</h3>
                                    <p className="text-gray-600 text-sm mb-2">Requested by <span className="font-semibold">{b.driverName}</span></p>
                                    <p className="text-sm text-gray-700">
                                        {new Date(b.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} <br/>to<br/>
                                        {new Date(b.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </p>
                                    <p className="font-bold text-blue-600 mt-2">${b.totalPrice.toFixed(2)}</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => handleActionClick(b.id, 'accept')}
                                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold transition"
                                    >
                                        <CheckCircle size={18} /> Accept
                                    </button>
                                    <button
                                        onClick={() => handleActionClick(b.id, 'reject')}
                                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-semibold transition"
                                    >
                                        <XCircle size={18} /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PRD v1.0 Slice 2: Confirmed Bookings – Opening OTP Verification */}
            {confirmedBookings.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-6 flex items-center gap-2">
                        <Key size={24} className="text-blue-600" /> Awaiting Driver Arrival
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                        These bookings are paid and confirmed. When the driver arrives, ask for their opening OTP and verify it below.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {confirmedBookings.map(b => (
                            <div key={b.id} className="bg-green-50 border border-green-200 p-6 rounded-xl shadow-sm">
                                <h3 className="font-bold text-lg text-gray-800">{b.parkingSpaceTitle}</h3>
                                <p className="text-gray-600 text-sm mb-1">Driver: <span className="font-semibold">{b.driverName}</span></p>
                                <p className="text-sm text-gray-700 mb-1">
                                    {new Date(b.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} →{' '}
                                    {new Date(b.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                                <p className="font-bold text-blue-600 mb-2">${b.totalPrice.toFixed(2)}</p>
                                {/* Opening OTP panel – OTP value never shown to owner */}
                                <OtpVerifyPanel booking={b} onSuccess={fetchData} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ACTIVE Bookings – Driver is currently parked – awaiting departure */}
            {activeBookings.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-6 flex items-center gap-2">
                        <Key size={24} className="text-purple-600" /> Currently Occupied
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                        These drivers are currently parked. When they are ready to leave, they will initiate checkout and show you a closing OTP.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeBookings.map(b => (
                            <div key={b.id} className="bg-purple-50 border border-purple-200 p-6 rounded-xl shadow-sm">
                                <h3 className="font-bold text-lg text-gray-800">{b.parkingSpaceTitle}</h3>
                                <p className="text-gray-600 text-sm mb-1">Driver: <span className="font-semibold">{b.driverName}</span></p>
                                <p className="text-sm text-gray-700 mb-1">
                                    {new Date(b.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} →{' '}
                                    {new Date(b.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                                <p className="font-bold text-blue-600 mb-2">${b.totalPrice.toFixed(2)}</p>
                                {b.closingOtpAttempts !== undefined && b.closingOtpAttempts >= 0 && !b.closingOtpCode ? (
                                    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 flex items-center gap-2">
                                        <Key size={14} className="text-gray-400" />
                                        Waiting for driver to initiate departure...
                                    </div>
                                ) : (
                                    <ClosingOtpVerifyPanel booking={b} onSuccess={fetchData} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* OVERSTAY Bookings – Driver exceeded scheduled time */}
            {overstayBookings.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-red-800 border-b border-red-300 pb-3 mb-6 flex items-center gap-2">
                        <AlertTriangle size={24} className="text-red-600" /> Overstay — Immediate Attention Required
                    </h2>
                    <p className="text-sm text-red-600 mb-4">
                        These drivers have exceeded their scheduled departure time. Extra charges are accumulating. Ask them to provide their closing OTP immediately.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {overstayBookings.map(b => {
                            const overstayStarted = b.overstayStartedAt ? new Date(b.overstayStartedAt) : null;
                            const overstayMinutes = overstayStarted
                                ? Math.max(0, Math.floor((new Date() - overstayStarted) / 60000))
                                : 0;
                            const ratePerMinute = b.totalPrice / 60;
                            const liveCharge = (overstayMinutes * ratePerMinute).toFixed(2);

                            return (
                                <div key={b.id} className="bg-red-50 border-2 border-red-400 p-6 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-gray-800">{b.parkingSpaceTitle}</h3>
                                        <span className="px-2 py-0.5 bg-red-200 text-red-900 rounded-full text-xs font-bold">⚠ OVERSTAY</span>
                                    </div>
                                    <p className="text-gray-600 text-sm mb-1">Driver: <span className="font-semibold">{b.driverName}</span></p>
                                    <p className="text-sm text-gray-700 mb-1">
                                        Scheduled end: <strong>{new Date(b.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</strong>
                                    </p>
                                    <div className="flex items-center justify-between mt-2 mb-3">
                                        <div>
                                            <p className="text-xs text-red-600">Overstay: <strong>{overstayMinutes} min</strong></p>
                                            <p className="text-xs text-blue-700">Base: ${b.totalPrice.toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-red-500 uppercase">Extra Charge</p>
                                            <p className="text-2xl font-extrabold text-red-700">${liveCharge}</p>
                                        </div>
                                    </div>
                                    <ClosingOtpVerifyPanel booking={b} onSuccess={fetchData} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Calendar View */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-6">Reservation Calendar</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200" style={{ height: '600px' }}>
                    <Calendar
                        localizer={localizer}
                        events={calendarEvents}
                        startAccessor="start"
                        endAccessor="end"
                        views={['month', 'week', 'day']}
                        defaultView="month"
                        eventPropGetter={(event) => ({
                            style: {
                                backgroundColor: event.resource?.status === 'OVERSTAY' ? '#dc2626' : '#2563eb',
                                borderRadius: '4px',
                                opacity: 0.9,
                                color: 'white',
                                border: '0',
                                display: 'block'
                            }
                        })}
                    />
                </div>
            </div>

            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.type === 'accept' ? 'Accept Booking' : 'Reject Booking'}
                message={modalConfig.type === 'accept'
                    ? "Are you sure you want to accept this booking request? The driver will be notified and the dates will be locked."
                    : "Are you sure you want to reject this request? The driver will be notified."}
                onConfirm={executeAction}
                onCancel={() => setModalConfig({ isOpen: false, type: '', bookingId: null })}
                isDestructive={modalConfig.type === 'reject'}
                confirmText={modalConfig.type === 'accept' ? "Yes, Accept" : "Yes, Reject"}
            />
        </div>
    );
};

export default OwnerBookings;
