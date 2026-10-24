import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import {
    Calendar as CalendarIcon,
    CheckCircle,
    XCircle,
    Key,
    AlertTriangle,
    LogOut,
    Car,
    Clock,
    User,
    MapPin,
    RotateCw,
    TrendingUp,
    ShieldCheck,
    Check,
    X,
    CalendarDays,
    ListFilter,
    ChevronRight,
    Loader2
} from 'lucide-react';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

/** Formats a number as an Indian Rupee string: \u20B960.00 */
const formatINR = (amount) => `\u20B9${Number(amount || 0).toFixed(2)}`;

// Status Badge Component matching ParkShare design tokens
const StatusBadge = ({ status }) => {
    switch (status) {
        case 'PENDING':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Request Pending
                </span>
            );
        case 'AWAITING_PAYMENT':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Awaiting Payment
                </span>
            );
        case 'CONFIRMED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Awaiting Arrival
                </span>
            );
        case 'ACTIVE':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    Currently Parked
                </span>
            );
        case 'OVERSTAY':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Overstay Session
                </span>
            );
        case 'COMPLETED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Completed
                </span>
            );
        case 'CANCELLED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                    <XCircle className="w-3.5 h-3.5 text-gray-400" />
                    Cancelled
                </span>
            );
        case 'REJECTED':
        case 'AUTO_REJECTED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    Rejected
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {status}
                </span>
            );
    }
};

// Arrival OTP Verification Panel (Owner submits driver's arrival OTP)
const OtpVerifyPanel = ({ booking, onSuccess }) => {
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState('');
    const [otpSuccess, setOtpSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const remaining = 3 - (booking.otpAttempts || 0);
    const isLocked = remaining <= 0;

    const handleVerify = async () => {
        if (otpInput.length !== 4 || !/^\d{4}$/.test(otpInput)) {
            setOtpError('Please enter a valid 4-digit numeric OTP.');
            return;
        }
        setOtpError('');
        setLoading(true);
        try {
            const res = await api.put(`/bookings/${booking.id}/verify-otp`, { otpCode: otpInput });
            if (res.success) {
                setOtpSuccess('Arrival verified! Session is now ACTIVE.');
                setTimeout(() => {
                    onSuccess();
                }, 800);
            }
        } catch (err) {
            setOtpError(err.response?.data?.message || 'OTP verification failed. Please check the code.');
            onSuccess(); // Refresh attempt count from backend
        } finally {
            setLoading(false);
            setOtpInput('');
        }
    };

    if (isLocked) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Arrival OTP verification is locked after 3 incorrect attempts. Please contact support.</span>
            </div>
        );
    }

    return (
        <div className="bg-[#F8F8F6] border border-[#EAEAE7] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Key className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-[#1E2024]">Verify Driver Arrival OTP</h4>
                        <p className="text-[11px] text-[#666970]">Ask the arriving driver for their 4-digit check-in code</p>
                    </div>
                </div>
                <span className="text-[11px] font-semibold text-[#666970] bg-white px-2 py-0.5 rounded-md border border-[#EAEAE7]">
                    {remaining} attempt{remaining !== 1 ? 's' : ''} left
                </span>
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    disabled={loading}
                    className="w-28 text-center text-base font-bold font-mono tracking-widest bg-white border border-[#EAEAE7] rounded-xl py-2 px-3 text-[#1E2024] focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] transition-all disabled:opacity-50"
                />
                <button
                    type="button"
                    onClick={handleVerify}
                    disabled={loading || otpInput.length < 4}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#2554D7] hover:bg-[#1D44B8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>{loading ? 'Verifying...' : 'Verify Arrival OTP'}</span>
                </button>
            </div>

            {otpError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                    <span>{otpError}</span>
                </div>
            )}
            {otpSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>{otpSuccess}</span>
                </div>
            )}
        </div>
    );
};

// Closing OTP Verification Panel (Departure Confirmation)
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
                setOtpSuccess('Closing OTP verified! Space is now released and session is COMPLETED.');
                setTimeout(() => {
                    onSuccess();
                }, 800);
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
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Closing OTP verification is locked after 3 incorrect attempts. Please contact support.</span>
            </div>
        );
    }

    return (
        <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                        <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-orange-900">Verify Departure Closing OTP</h4>
                        <p className="text-[11px] text-orange-700">Driver is ready to depart. Enter the code they show you to release space.</p>
                    </div>
                </div>
                <span className="text-[11px] font-semibold text-orange-800 bg-white px-2 py-0.5 rounded-md border border-orange-200">
                    {remaining} attempt{remaining !== 1 ? 's' : ''} left
                </span>
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    disabled={loading}
                    className="w-28 text-center text-base font-bold font-mono tracking-widest bg-white border border-orange-200 rounded-xl py-2 px-3 text-[#1E2024] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all disabled:opacity-50"
                />
                <button
                    type="button"
                    onClick={handleVerify}
                    disabled={loading || otpInput.length < 4}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    <span>{loading ? 'Verifying...' : 'Verify Departure OTP'}</span>
                </button>
            </div>

            {otpError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                    <span>{otpError}</span>
                </div>
            )}
            {otpSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>{otpSuccess}</span>
                </div>
            )}
        </div>
    );
};

// Main Component
const OwnerBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState({ todayRevenueEstimate: 0, activeOccupancy: 0, pendingRequests: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('ALL');
    const [viewMode, setViewMode] = useState('CARDS'); // 'CARDS' or 'CALENDAR'
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', bookingId: null });
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [bookRes, statsRes] = await Promise.all([
                api.get('/bookings/owner'),
                api.get('/bookings/owner/stats')
            ]);
            if (bookRes.success) setBookings(bookRes.data || []);
            if (statsRes.success) setStats(statsRes.data || { todayRevenueEstimate: 0, activeOccupancy: 0, pendingRequests: 0 });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load booking requests.');
        } finally {
            setLoading(false);
        }
    };

    const handleActionClick = (id, type) => {
        setModalConfig({ isOpen: true, type, bookingId: id });
    };

    const executeAction = async () => {
        const { type, bookingId } = modalConfig;
        setIsSubmittingAction(true);
        try {
            const res = await api.put(`/bookings/${bookingId}/${type}`);
            if (res.success) {
                setModalConfig({ isOpen: false, type: '', bookingId: null });
                fetchData();
            } else {
                alert(res.message || `Failed to ${type} booking.`);
            }
        } catch (err) {
            alert(err.response?.data?.message || `Failed to ${type} booking.`);
        } finally {
            setIsSubmittingAction(false);
        }
    };

    // Filter categories
    const pendingBookings = bookings.filter((b) => b.status === 'PENDING');
    const awaitingPaymentBookings = bookings.filter((b) => b.status === 'AWAITING_PAYMENT');
    const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');
    const activeBookings = bookings.filter((b) => b.status === 'ACTIVE');
    const overstayBookings = bookings.filter((b) => b.status === 'OVERSTAY');
    const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
    const otherBookings = bookings.filter((b) => ['CANCELLED', 'REJECTED', 'AUTO_REJECTED'].includes(b.status));

    const filteredBookings = bookings.filter((b) => {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'PENDING') return b.status === 'PENDING';
        if (activeTab === 'CONFIRMED') return b.status === 'CONFIRMED' || b.status === 'AWAITING_PAYMENT';
        if (activeTab === 'ACTIVE') return b.status === 'ACTIVE' || b.status === 'OVERSTAY';
        if (activeTab === 'COMPLETED') return b.status === 'COMPLETED';
        if (activeTab === 'OTHER') return ['CANCELLED', 'REJECTED', 'AUTO_REJECTED'].includes(b.status);
        return true;
    });

    // Calendar events
    const calendarEvents = bookings
        .filter((b) => ['CONFIRMED', 'ACTIVE', 'OVERSTAY', 'COMPLETED'].includes(b.status))
        .map((b) => ({
            id: b.id,
            title: `${b.parkingSpaceTitle} \u2014 ${b.driverName}${b.status === 'OVERSTAY' ? ' \u26A0 OVERSTAY' : ''}`,
            start: new Date(b.startTime),
            end: new Date(b.endTime),
            resource: b
        }));

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#1E2024]">Booking Requests & Schedule</h1>
                    <p className="text-xs text-[#666970] mt-1">
                        Review incoming requests, verify driver arrival & closing OTPs, and track space occupancy.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    {/* View Switcher */}
                    <div className="flex items-center p-1 bg-[#EAEAE7]/60 rounded-xl border border-[#EAEAE7]">
                        <button
                            type="button"
                            onClick={() => setViewMode('CARDS')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                viewMode === 'CARDS' ? 'bg-white text-[#1E2024] shadow-xs' : 'text-[#666970] hover:text-[#1E2024]'
                            }`}
                        >
                            <ListFilter className="w-3.5 h-3.5" />
                            <span>Cards</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('CALENDAR')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                viewMode === 'CALENDAR' ? 'bg-white text-[#1E2024] shadow-xs' : 'text-[#666970] hover:text-[#1E2024]'
                            }`}
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>Calendar</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 rounded-xl border border-[#EAEAE7] bg-white hover:bg-gray-50 text-[#1E2024] transition-colors cursor-pointer"
                        title="Refresh Bookings"
                    >
                        <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2554D7]' : 'text-gray-500'}`} />
                    </button>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={fetchData}
                        className="underline font-semibold hover:text-red-800 cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* KPI Metric Summary Cards (Real Backend Data) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-[#EAEAE7] p-5 shadow-xs flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] font-semibold text-[#666970] uppercase tracking-wider block">
                            Pending Requests
                        </span>
                        <p className="text-xl font-bold text-[#1E2024] truncate">
                            {stats.pendingRequests ?? pendingBookings.length}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#EAEAE7] p-5 shadow-xs flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                        <Car className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] font-semibold text-[#666970] uppercase tracking-wider block">
                            Active Occupancy
                        </span>
                        <p className="text-xl font-bold text-[#1E2024] truncate">
                            {stats.activeOccupancy ?? (activeBookings.length + overstayBookings.length)}{' '}
                            <span className="text-xs font-normal text-[#666970]">spaces</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#EAEAE7] p-5 shadow-xs flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] font-semibold text-[#666970] uppercase tracking-wider block">
                            Today's Revenue
                        </span>
                        <p className="text-xl font-bold text-[#1E2024] truncate">
                            {formatINR(stats.todayRevenueEstimate)}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#EAEAE7] p-5 shadow-xs flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2554D7] shrink-0">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] font-semibold text-[#666970] uppercase tracking-wider block">
                            Total Bookings
                        </span>
                        <p className="text-xl font-bold text-[#1E2024] truncate">
                            {bookings.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {viewMode === 'CALENDAR' ? (
                /* Calendar View */
                <div className="bg-white rounded-2xl border border-[#EAEAE7] p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-[#1E2024]">Space Reservation Calendar</h3>
                            <p className="text-xs text-[#666970]">Visualize scheduled and active driver bookings across your parking slots</p>
                        </div>
                    </div>
                    <div style={{ height: '620px' }}>
                        <Calendar
                            localizer={localizer}
                            events={calendarEvents}
                            startAccessor="start"
                            endAccessor="end"
                            views={['month', 'week', 'day']}
                            defaultView="month"
                            eventPropGetter={(event) => ({
                                style: {
                                    backgroundColor: event.resource?.status === 'OVERSTAY' ? '#DC2626' : '#2554D7',
                                    borderRadius: '6px',
                                    padding: '2px 6px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#FFFFFF',
                                    border: 'none'
                                }
                            })}
                        />
                    </div>
                </div>
            ) : (
                /* Cards View */
                <div className="space-y-4">
                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-[#EAEAE7]/60 rounded-2xl border border-[#EAEAE7] overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setActiveTab('ALL')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'ALL' ? 'bg-[#2554D7] text-white shadow-xs' : 'text-[#666970] hover:text-[#1E2024] hover:bg-white'
                            }`}
                        >
                            All ({bookings.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('PENDING')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                                activeTab === 'PENDING' ? 'bg-[#2554D7] text-white shadow-xs' : 'text-[#666970] hover:text-[#1E2024] hover:bg-white'
                            }`}
                        >
                            <span>Requests</span>
                            {pendingBookings.length > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    activeTab === 'PENDING' ? 'bg-white text-[#2554D7]' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {pendingBookings.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('CONFIRMED')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'CONFIRMED' ? 'bg-[#2554D7] text-white shadow-xs' : 'text-[#666970] hover:text-[#1E2024] hover:bg-white'
                            }`}
                        >
                            Awaiting Arrival ({confirmedBookings.length + awaitingPaymentBookings.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('ACTIVE')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'ACTIVE' ? 'bg-[#2554D7] text-white shadow-xs' : 'text-[#666970] hover:text-[#1E2024] hover:bg-white'
                            }`}
                        >
                            Parked / Active ({activeBookings.length + overstayBookings.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('COMPLETED')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'COMPLETED' ? 'bg-[#2554D7] text-white shadow-xs' : 'text-[#666970] hover:text-[#1E2024] hover:bg-white'
                            }`}
                        >
                            Completed ({completedBookings.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('OTHER')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'OTHER' ? 'bg-[#2554D7] text-white shadow-xs' : 'text-[#666970] hover:text-[#1E2024] hover:bg-white'
                            }`}
                        >
                            Other ({otherBookings.length})
                        </button>
                    </div>

                    {/* Booking Cards Listing */}
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="bg-white rounded-2xl border border-[#EAEAE7] p-6 space-y-4 animate-pulse">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2 w-1/2">
                                            <div className="h-5 bg-[#F8F8F6] rounded-md w-3/4" />
                                            <div className="h-4 bg-[#F8F8F6] rounded-md w-1/2" />
                                        </div>
                                        <div className="h-6 bg-[#F8F8F6] rounded-full w-24" />
                                    </div>
                                    <div className="h-16 bg-[#F8F8F6] rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        /* Empty State */
                        <div className="bg-white rounded-2xl border border-[#EAEAE7] p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#EEF2FD] border border-[#D5E0FA] flex items-center justify-center mx-auto text-[#2554D7]">
                                <CalendarIcon className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-[#1E2024]">No Bookings Found</h3>
                            <p className="text-xs text-[#666970] leading-relaxed max-w-sm mx-auto">
                                {activeTab === 'ALL'
                                    ? "You haven't received any booking requests yet. Once drivers book your spaces, their sessions will appear here."
                                    : `There are currently no bookings under the ${activeTab.toLowerCase()} category.`}
                            </p>
                        </div>
                    ) : (
                        /* Populated Booking Cards */
                        <div className="space-y-4">
                            {filteredBookings.map((b) => {
                                const isPending = b.status === 'PENDING';
                                const isConfirmed = b.status === 'CONFIRMED';
                                const isActive = b.status === 'ACTIVE';
                                const isOverstay = b.status === 'OVERSTAY';
                                const isCompleted = b.status === 'COMPLETED';

                                // Overstay calculation
                                const overstayStarted = b.overstayStartedAt ? new Date(b.overstayStartedAt) : null;
                                const overstayMinutes = overstayStarted
                                    ? Math.max(0, Math.floor((new Date() - overstayStarted) / 60000))
                                    : 0;
                                const ratePerMinute = (b.totalPrice || 50) / 60;
                                const liveOverstayCharge = (overstayMinutes * ratePerMinute).toFixed(2);

                                return (
                                    <div
                                        key={b.id}
                                        className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all space-y-4 ${
                                            isPending
                                                ? 'border-amber-300 ring-1 ring-amber-100'
                                                : isOverstay
                                                ? 'border-rose-300 ring-1 ring-rose-100'
                                                : 'border-[#EAEAE7]'
                                        }`}
                                    >
                                        {/* Card Top Row */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-base text-[#1E2024]">
                                                        {b.parkingSpaceTitle}
                                                    </h3>
                                                    <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                        #BK-{b.id}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#666970] flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    <span>Driver: <strong className="text-[#1E2024]">{b.driverName}</strong></span>
                                                    {b.parkingSpaceAddress && (
                                                        <>
                                                            <span className="text-gray-300">\u2022</span>
                                                            <span className="truncate max-w-xs">{b.parkingSpaceAddress}</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 self-start sm:self-auto">
                                                <StatusBadge status={b.status} />
                                            </div>
                                        </div>

                                        {/* Details Row: Timing & Financials */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#F8F8F6] p-3.5 rounded-xl border border-[#EAEAE7]/80 text-xs">
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-gray-600 tracking-wider flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-gray-400" /> Reserved Time
                                                </span>
                                                <p className="font-semibold text-[#1E2024]">
                                                    {new Date(b.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </p>
                                                <p className="text-[#666970]">
                                                    to {new Date(b.endTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">
                                                    Total Booking Price
                                                </span>
                                                <p className="text-base font-extrabold text-[#2554D7]">
                                                    {formatINR(b.totalPrice)}
                                                </p>
                                                <p className="text-[11px] text-[#666970]">
                                                    Rate: 10% platform fee applicable
                                                </p>
                                            </div>

                                            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                                                <span className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">
                                                    Session State
                                                </span>
                                                <p className="text-xs text-[#1E2024] font-medium">
                                                    {isPending && 'Waiting for your acceptance'}
                                                    {b.status === 'AWAITING_PAYMENT' && 'Accepted \u2014 waiting for driver payment'}
                                                    {isConfirmed && 'Paid \u2014 awaiting driver check-in'}
                                                    {isActive && (b.checkoutInitiated ? 'Checkout initiated by driver' : 'Vehicle currently parked')}
                                                    {isOverstay && `Overstay: ${overstayMinutes} min past scheduled time`}
                                                    {isCompleted && 'Session closed & settled'}
                                                    {['CANCELLED', 'REJECTED', 'AUTO_REJECTED'].includes(b.status) && 'Closed / Released'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Contextual Action Panels */}
                                        {b.status === 'AWAITING_PAYMENT' && (
                                            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-800">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                    <span>You accepted this request. Waiting for the driver to complete payment to lock arrival OTP.</span>
                                                </div>
                                                <span className="text-[11px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
                                                    Awaiting Payment
                                                </span>
                                            </div>
                                        )}

                                        {/* 1. Pending: Accept / Reject Buttons */}
                                        {isPending && (
                                            <div className="pt-2 border-t border-[#EAEAE7] flex flex-wrap items-center justify-between gap-3">
                                                <p className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                    <span>Accept request to lock dates and allow driver payment.</span>
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleActionClick(b.id, 'reject')}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        <span>Reject</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleActionClick(b.id, 'accept')}
                                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                        <span>Accept Booking</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. Confirmed: Awaiting Driver Arrival OTP */}
                                        {isConfirmed && (
                                            <OtpVerifyPanel booking={b} onSuccess={fetchData} />
                                        )}

                                        {/* 3. Active: Occupied Space */}
                                        {isActive && (
                                            <div>
                                                {!b.checkoutInitiated ? (
                                                    <div className="bg-[#F8F8F6] border border-[#EAEAE7] rounded-xl p-3.5 flex items-center justify-between text-xs text-[#666970]">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span>Vehicle is parked. Scheduled checkout: <strong>{new Date(b.endTime).toLocaleTimeString([], { timeStyle: 'short' })}</strong></span>
                                                        </div>
                                                        <span className="text-[11px] text-gray-500">Waiting for driver departure...</span>
                                                    </div>
                                                ) : (
                                                    <ClosingOtpVerifyPanel booking={b} onSuccess={fetchData} />
                                                )}
                                            </div>
                                        )}

                                        {/* 4. Overstay: Urgent Attention */}
                                        {isOverstay && (
                                            <div className="space-y-3">
                                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                    <div className="space-y-0.5">
                                                        <span className="font-bold text-rose-900 flex items-center gap-1.5">
                                                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                                                            Driver Exceeded Scheduled Time ({overstayMinutes} min)
                                                        </span>
                                                        <p className="text-rose-700 text-[11px]">
                                                            Scheduled departure was {new Date(b.endTime).toLocaleTimeString([], { timeStyle: 'short' })}.
                                                        </p>
                                                    </div>
                                                    <div className="text-left sm:text-right">
                                                        <span className="text-[10px] uppercase font-bold text-rose-600 block">Accumulated Extra</span>
                                                        <span className="text-base font-extrabold text-rose-900">{formatINR(liveOverstayCharge)}</span>
                                                    </div>
                                                </div>
                                                <ClosingOtpVerifyPanel booking={b} onSuccess={fetchData} />
                                            </div>
                                        )}

                                        {/* 5. Completed: Financial Settlement Breakdown */}
                                        {isCompleted && (
                                            <div className="bg-[#F8F8F6] border border-[#EAEAE7] rounded-xl p-3.5 space-y-2 text-xs">
                                                <div className="flex justify-between items-center text-[#666970]">
                                                    <span>Original Booking Paid:</span>
                                                    <span className="font-semibold text-[#1E2024]">{formatINR(b.totalPrice)}</span>
                                                </div>
                                                {b.actualUsageCharge != null && (
                                                    <div className="flex justify-between items-center text-[#666970]">
                                                        <span>Actual Usage Charge:</span>
                                                        <span className="font-semibold text-[#2554D7]">{formatINR(b.actualUsageCharge)}</span>
                                                    </div>
                                                )}
                                                {b.refundAdjustment != null && b.refundAdjustment > 0.01 && (
                                                    <div className="flex justify-between items-center text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-md">
                                                        <span>Early Checkout Refund:</span>
                                                        <span className="font-semibold">+{formatINR(b.refundAdjustment)}</span>
                                                    </div>
                                                )}
                                                {b.overstayExtraCharge > 0 && (
                                                    <div className="flex justify-between items-center text-rose-700 bg-rose-50/80 px-2.5 py-1 rounded-md">
                                                        <span>Overstay Charge ({b.overstayPaymentStatus || 'PENDING'}):</span>
                                                        <span className="font-semibold">+{formatINR(b.overstayExtraCharge)}</span>
                                                    </div>
                                                )}
                                                {b.actualClosedAt && (
                                                    <div className="text-[11px] text-gray-500 pt-1 border-t border-[#EAEAE7]">
                                                        Closed at: {new Date(b.actualClosedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Confirmation Modal for Accept/Reject */}
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.type === 'accept' ? 'Accept Booking Request' : 'Reject Booking Request'}
                message={
                    modalConfig.type === 'accept'
                        ? 'Are you sure you want to accept this reservation? The driver will be notified immediately to complete payment, locking the slot.'
                        : 'Are you sure you want to reject this reservation? The driver will be notified and the reservation will be marked as rejected.'
                }
                onConfirm={executeAction}
                onCancel={() => setModalConfig({ isOpen: false, type: '', bookingId: null })}
                isDestructive={modalConfig.type === 'reject'}
                confirmText={modalConfig.type === 'accept' ? 'Yes, Accept Booking' : 'Yes, Reject Booking'}
            />
        </div>
    );
};

export default OwnerBookings;
