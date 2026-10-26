import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Key,
    LogOut,
    AlertTriangle,
    Calendar,
    MapPin,
    ArrowRight,
    Download,
    RefreshCw,
    Car,
    FileText,
    ExternalLink,
    Loader2
} from 'lucide-react';

/** Formats a number as an Indian Rupee string: â‚¹150.00 */
const formatINR = (amount) => '\u20B9' + Number(amount || 0).toFixed(2);

const StatusBadge = ({ status }) => {
    switch (status) {
        case 'PENDING':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pending Approval</span>
                </span>
            );
        case 'AWAITING_PAYMENT':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <span>Awaiting Payment</span>
                </span>
            );
        case 'CONFIRMED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Confirmed</span>
                </span>
            );
        case 'ACTIVE':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EEF2FD] text-[#2554D7] border border-[#D5E0FA]">
                    <span className="w-2 h-2 rounded-full bg-[#2554D7] animate-pulse" />
                    <span>Active (Parked)</span>
                </span>
            );
        case 'OVERSTAY':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Overstay in Progress</span>
                </span>
            );
        case 'COMPLETED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Completed</span>
                </span>
            );
        case 'CANCELLED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    <XCircle className="w-3.5 h-3.5 text-gray-500" />
                    <span>Cancelled</span>
                </span>
            );
        case 'REJECTED':
        case 'AUTO_REJECTED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span>Rejected</span>
                </span>
            );
        case 'PAYMENT_EXPIRED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Payment Expired</span>
                </span>
            );
        case 'NO_SHOW':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    <XCircle className="w-3.5 h-3.5 text-gray-500" />
                    <span>No Show</span>
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    {status}
                </span>
            );
    }
};

// Closing OTP / Departure Panel (driver-facing)
const CheckoutPanel = ({ booking, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    const handleInitiateCheckout = async () => {
        setLoading(true);
        try {
            const res = await api.post(`/bookings/${booking.id}/initiate-checkout`);
            if (res.success) onSuccess();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to initiate checkout.');
        } finally {
            setLoading(false);
        }
    };

    // Closing OTP already generated
    if (booking.closingOtpCode) {
        return (
            <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 shrink-0">
                        <LogOut className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">
                            Departure Closing OTP
                        </p>
                        <p className="text-2xl sm:text-3xl font-mono font-extrabold text-orange-900 tracking-[0.25em] leading-tight">
                            {booking.closingOtpCode}
                        </p>
                        <p className="text-xs text-orange-700 mt-0.5">
                            Show this code to the space host to verify your departure.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Checkout not yet initiated
    return (
        <div className="mt-3 p-4 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <p className="text-xs font-bold text-[#1E2024]">Ready to depart?</p>
                <p className="text-xs text-[#666970] mt-0.5">
                    Generate your closing OTP and show it to the host to release the space and settle billing.
                </p>
            </div>
            <button
                type="button"
                onClick={handleInitiateCheckout}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
                <LogOut className="w-3.5 h-3.5" />
                <span>{loading ? 'Generating...' : "I'm Ready to Leave"}</span>
            </button>
        </div>
    );
};

// Overstay extra charge live display
const OverstayChargeDisplay = ({ booking }) => {
    const [liveMinutes, setLiveMinutes] = useState(0);

    useEffect(() => {
        if (!booking.overstayStartedAt) return;
        const update = () => {
            const started = new Date(booking.overstayStartedAt);
            const now = new Date();
            const minutes = Math.max(0, Math.floor((now - started) / 60000));
            setLiveMinutes(minutes);
        };
        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [booking.overstayStartedAt]);

    if (!booking.overstayStartedAt) return null;

    const liveCharge = (liveMinutes * (booking.totalPrice / 60)).toFixed(2);

    return (
        <div className="mt-3 p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-xs font-bold text-rose-900">Overstay Charges Accumulating</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                        Duration: <strong>{liveMinutes} min</strong> past scheduled time ({new Date(booking.overstayStartedAt).toLocaleTimeString([], { timeStyle: 'short' })})
                    </p>
                </div>
            </div>
            <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider block">Live Extra</span>
                <span className="text-lg font-extrabold text-rose-900">{formatINR(liveCharge)}</span>
            </div>
        </div>
    );
};

// Main Driver Bookings Component
const DriverBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('ALL');
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [mockPaymentModal, setMockPaymentModal] = useState(null);
    const [isConfirmingMockPayment, setIsConfirmingMockPayment] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/bookings/driver');
            if (res.success) {
                setBookings(res.data || []);
            } else {
                setError('Could not load your bookings.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load bookings. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelClick = (id) => {
        setSelectedBookingId(id);
        setCancelModalOpen(true);
    };

    const executeCancel = async () => {
        setIsCancelling(true);
        try {
            const res = await api.put(`/bookings/${selectedBookingId}/cancel`);
            if (res.success) {
                fetchBookings();
                setCancelModalOpen(false);
                setSelectedBookingId(null);
            } else {
                alert(res.message || 'Failed to cancel booking.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel booking.');
        } finally {
            setIsCancelling(false);
        }
    };

    const handlePayment = async (bookingId) => {
        setIsProcessingPayment(true);
        try {
            const orderRes = await api.post(`/payments/create-order/${bookingId}`);
            if (orderRes.success) {
                const { razorpayOrderId, amount, currency, keyId } = orderRes.data;

                // Mock Mode check for dev/test environment
                if (keyId === 'rzp_test_placeholder') {
                    setMockPaymentModal({
                        type: 'BOOKING',
                        bookingId: bookingId,
                        razorpayOrderId: razorpayOrderId,
                        amount: amount,
                        currency: currency,
                        title: 'Parking Reservation Payment'
                    });
                    setIsProcessingPayment(false);
                    return;
                }

                if (typeof window.Razorpay === 'undefined') {
                    alert('Razorpay payment gateway failed to load. Please verify your internet connection or reload.');
                    return;
                }

                const options = {
                    key: keyId,
                    amount: amount * 100,
                    currency: currency,
                    name: 'ParkShare',
                    description: 'Parking Reservation Payment',
                    order_id: razorpayOrderId,
                    modal: {
                        ondismiss: function () {
                            setIsProcessingPayment(false);
                        }
                    },
                    handler: async function (response) {
                        try {
                            const verifyRes = await api.post('/payments/verify', {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature
                            });
                            if (verifyRes.success) {
                                alert('Payment successful! Your reservation is confirmed.');
                                fetchBookings();
                            }
                        } catch (err) {
                            alert('Payment verification failed.');
                        }
                    },
                    prefill: { name: 'Driver', email: 'driver@example.com' },
                    theme: { color: '#2554D7' }
                };
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response) {
                    alert('Payment failed: ' + response.error.description);
                });
                rzp.open();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to initiate payment.');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleOverstayPayment = async (bookingId) => {
        setIsProcessingPayment(true);
        try {
            const orderRes = await api.post(`/payments/overstay/create-order/${bookingId}`);
            if (orderRes.success) {
                const { razorpayOrderId, amount, currency, keyId } = orderRes.data;

                // Mock Mode check for dev/test environment
                if (keyId === 'rzp_test_placeholder') {
                    setMockPaymentModal({
                        type: 'OVERSTAY',
                        bookingId: bookingId,
                        razorpayOrderId: razorpayOrderId,
                        amount: amount,
                        currency: currency,
                        title: 'Overstay Charge Payment'
                    });
                    setIsProcessingPayment(false);
                    return;
                }

                if (typeof window.Razorpay === 'undefined') {
                    alert('Razorpay payment gateway failed to load. Please verify your internet connection or reload.');
                    return;
                }

                const options = {
                    key: keyId,
                    amount: amount * 100,
                    currency: currency,
                    name: 'ParkShare',
                    description: 'Overstay Charge Payment',
                    order_id: razorpayOrderId,
                    modal: {
                        ondismiss: function () {
                            setIsProcessingPayment(false);
                        }
                    },
                    handler: async function (response) {
                        try {
                            const verifyRes = await api.post('/payments/overstay/verify', {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature
                            });
                            if (verifyRes.success) {
                                alert('Overstay payment verified! Status updated to PAID.');
                                fetchBookings();
                            }
                        } catch (err) {
                            alert('Overstay payment verification failed.');
                        }
                    },
                    prefill: { name: 'Driver', email: 'driver@example.com' },
                    theme: { color: '#2554D7' }
                };
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response) {
                    alert('Overstay payment failed: ' + response.error.description);
                });
                rzp.open();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to initiate overstay payment.');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleConfirmMockPayment = async () => {
        if (!mockPaymentModal) return;
        setIsConfirmingMockPayment(true);
        try {
            if (mockPaymentModal.type === 'OVERSTAY') {
                const verifyRes = await api.post('/payments/overstay/verify', {
                    razorpayOrderId: mockPaymentModal.razorpayOrderId,
                    razorpayPaymentId: 'pay_mock_overstay_' + Date.now(),
                    razorpaySignature: 'mock_signature'
                });
                if (verifyRes.success) {
                    alert('TEST MODE — Simulated payment confirmed! Overstay payment status updated to PAID.');
                    setMockPaymentModal(null);
                    fetchBookings();
                } else {
                    alert(verifyRes.message || 'Overstay payment verification failed.');
                }
            } else {
                const verifyRes = await api.post('/payments/verify', {
                    razorpayOrderId: mockPaymentModal.razorpayOrderId,
                    razorpayPaymentId: 'pay_mock_' + Date.now(),
                    razorpaySignature: 'mock_signature'
                });
                if (verifyRes.success) {
                    alert('TEST MODE — Simulated payment confirmed! Your booking is now confirmed with your arrival OTP.');
                    setMockPaymentModal(null);
                    fetchBookings();
                } else {
                    alert(verifyRes.message || 'Payment verification failed.');
                }
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Payment verification failed.');
        } finally {
            setIsConfirmingMockPayment(false);
            setIsProcessingPayment(false);
        }
    };

    const downloadReceipt = async (bookingId) => {
        try {
            const response = await api.get(`/payments/receipt/booking/${bookingId}`, { responseType: 'blob' });
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `receipt_booking_${bookingId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert('Failed to download PDF receipt.');
        }
    };

    // Derived category counts
    const UPCOMING_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'OVERSTAY'];
    const TERMINAL_CANCELLED = ['CANCELLED', 'REJECTED', 'AUTO_REJECTED', 'PAYMENT_EXPIRED', 'NO_SHOW'];

    const upcomingBookings = bookings.filter(b => UPCOMING_STATUSES.includes(b.status));
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
    const cancelledBookings = bookings.filter(b => TERMINAL_CANCELLED.includes(b.status));

    // Filtered bookings based on activeTab
    const filteredBookings = bookings.filter(b => {
        if (activeTab === 'UPCOMING') return UPCOMING_STATUSES.includes(b.status);
        if (activeTab === 'COMPLETED') return b.status === 'COMPLETED';
        if (activeTab === 'CANCELLED') return TERMINAL_CANCELLED.includes(b.status);
        return true;
    });

    return (
        <div className="w-full space-y-6 sm:space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E2024]">
                        My Bookings
                    </h1>
                    <p className="text-sm text-[#666970] mt-1">
                        Track reservations, payments and parking sessions.
                    </p>
                </div>

                <Link
                    to="/driver-dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2554D7] hover:bg-[#1D44B8] text-white text-xs font-semibold shadow-xs hover:shadow transition-all self-start sm:self-auto cursor-pointer"
                >
                    <Car className="w-4 h-4" />
                    <span>Find New Parking</span>
                </Link>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={fetchBookings}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold transition-colors cursor-pointer"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                    </button>
                </div>
            )}

            {/* Metric Summary Cards (derived from actual data) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-[#EAEAE7] shadow-xs">
                    <span className="text-xs font-semibold text-[#666970] block">Total Bookings</span>
                    <span className="text-2xl font-bold text-[#1E2024] mt-1 block">{bookings.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#EAEAE7] shadow-xs">
                    <span className="text-xs font-semibold text-[#666970] block">Active & Upcoming</span>
                    <span className="text-2xl font-bold text-[#2554D7] mt-1 block">{upcomingBookings.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#EAEAE7] shadow-xs">
                    <span className="text-xs font-semibold text-[#666970] block">Completed</span>
                    <span className="text-2xl font-bold text-emerald-700 mt-1 block">{completedBookings.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#EAEAE7] shadow-xs">
                    <span className="text-xs font-semibold text-[#666970] block">Cancelled / Other</span>
                    <span className="text-2xl font-bold text-gray-600 mt-1 block">{cancelledBookings.length}</span>
                </div>
            </div>

            {/* Filter Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#EAEAE7] pb-3 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('ALL')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'ALL'
                            ? 'bg-[#2554D7] text-white shadow-xs'
                            : 'text-[#666970] hover:text-[#1E2024] hover:bg-white'
                    }`}
                >
                    All ({bookings.length})
                </button>
                <button
                    onClick={() => setActiveTab('UPCOMING')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'UPCOMING'
                            ? 'bg-[#2554D7] text-white shadow-xs'
                            : 'text-[#666970] hover:text-[#1E2024] hover:bg-white'
                    }`}
                >
                    Active & Upcoming ({upcomingBookings.length})
                </button>
                <button
                    onClick={() => setActiveTab('COMPLETED')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'COMPLETED'
                            ? 'bg-[#2554D7] text-white shadow-xs'
                            : 'text-[#666970] hover:text-[#1E2024] hover:bg-white'
                    }`}
                >
                    Completed ({completedBookings.length})
                </button>
                <button
                    onClick={() => setActiveTab('CANCELLED')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'CANCELLED'
                            ? 'bg-[#2554D7] text-white shadow-xs'
                            : 'text-[#666970] hover:text-[#1E2024] hover:bg-white'
                    }`}
                >
                    Cancelled ({cancelledBookings.length})
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
                        <Calendar className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-[#1E2024]">No Bookings Found</h2>
                    <p className="text-xs text-[#666970] leading-relaxed max-w-sm mx-auto">
                        {activeTab === 'ALL'
                            ? "You haven't made any parking reservations yet. Search and reserve a verified spot anytime."
                            : `There are currently no bookings under the ${activeTab.toLowerCase()} category.`}
                    </p>
                    <Link
                        to="/driver-dashboard"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2554D7] hover:bg-[#1D44B8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                        <Car className="w-4 h-4" />
                        <span>Find Parking</span>
                    </Link>
                </div>
            ) : (
                /* Populated Booking Cards */
                <div className="space-y-4">
                    {filteredBookings.map((booking) => {
                        const isUpcoming = UPCOMING_STATUSES.includes(booking.status);
                        const canCancel = isUpcoming && ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(booking.status);
                        const canDownloadReceipt = ['CONFIRMED', 'COMPLETED', 'ACTIVE', 'OVERSTAY'].includes(booking.status);

                        return (
                            <div
                                key={booking.id}
                                className="bg-white rounded-2xl border border-[#EAEAE7] p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all space-y-4"
                            >
                                {/* Card Top Row */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {booking.parkingSpaceId ? (
                                                <Link
                                                    to={`/parking/${booking.parkingSpaceId}`}
                                                    className="font-bold text-base text-[#1E2024] hover:text-[#2554D7] transition-colors flex items-center gap-1.5 group"
                                                >
                                                    <span>{booking.parkingSpaceTitle}</span>
                                                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#2554D7]" />
                                                </Link>
                                            ) : (
                                                <h3 className="font-bold text-base text-[#1E2024]">
                                                    {booking.parkingSpaceTitle}
                                                </h3>
                                            )}
                                            <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                #BK-{booking.id}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#666970] flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span>{booking.parkingSpaceAddress}</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 self-start sm:self-auto">
                                        <StatusBadge status={booking.status} />
                                    </div>
                                </div>

                                {/* Schedule & Pricing Details Box */}
                                <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                            Start Time
                                        </span>
                                        <span className="font-semibold text-[#1E2024] mt-0.5 block">
                                            {new Date(booking.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                            Scheduled End
                                        </span>
                                        <span className="font-semibold text-[#1E2024] mt-0.5 block">
                                            {new Date(booking.endTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </span>
                                    </div>

                                    <div className="md:text-right">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                            Total Price
                                        </span>
                                        <span className="text-base font-bold text-[#2554D7] mt-0.5 block">
                                            {formatINR(booking.totalPrice)}
                                        </span>
                                    </div>
                                </div>

                                {/* Arrival OTP Card (CONFIRMED status) */}
                                {booking.status === 'CONFIRMED' && booking.otpCode && (
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                                                <Key className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                                                    Arrival Check-In OTP
                                                </p>
                                                <p className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-900 tracking-[0.25em] leading-tight">
                                                    {booking.otpCode}
                                                </p>
                                                <p className="text-xs text-emerald-700 mt-0.5">
                                                    Show this 4-digit code to the space host upon arrival to check in.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ACTIVE status: Checkout panel + Arrival OTP info */}
                                {booking.status === 'ACTIVE' && (
                                    <div className="space-y-2">
                                        {booking.otpCode && (
                                            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-800">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <span>Arrival verified with OTP <strong className="font-mono">{booking.otpCode}</strong>. You are currently parked.</span>
                                            </div>
                                        )}
                                        <CheckoutPanel booking={booking} onSuccess={fetchBookings} />
                                    </div>
                                )}

                                {/* OVERSTAY status: Live accumulation + Checkout panel */}
                                {booking.status === 'OVERSTAY' && (
                                    <div className="space-y-2">
                                        <OverstayChargeDisplay booking={booking} />
                                        <CheckoutPanel booking={booking} onSuccess={fetchBookings} />
                                    </div>
                                )}

                                {/* COMPLETED status: Session Completion & Settlement Details */}
                                {booking.status === 'COMPLETED' && (() => {
                                    const isOverstayPaid = booking.overstayPaymentStatus === 'SUCCESS' || booking.overstayPaymentStatus === 'PAID';
                                    const hasUnpaidOverstay = (booking.overstayExtraCharge || 0) > 0 && !isOverstayPaid;
                                    const hasRefundRecorded = (booking.refundAdjustment || 0) > 0.01;
                                    const totalSessionCost = (booking.actualUsageCharge ?? booking.totalPrice) + (booking.overstayExtraCharge || 0);

                                    return (
                                        <div className="p-4 rounded-xl bg-gray-50 border border-[#EAEAE7] space-y-2.5 text-xs">
                                            {/* Settlement Status Banner */}
                                            <div className="flex items-center justify-between pb-2 border-b border-[#EAEAE7]">
                                                <span className="font-semibold text-[#1E2024]">Physical Session: Completed</span>
                                                {hasUnpaidOverstay ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                        Overstay Payment Pending
                                                    </span>
                                                ) : hasRefundRecorded ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                                        <Clock className="w-3 h-3 text-blue-600" />
                                                        Refund Credit Pending
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        Fully Settled
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-[#666970]">Initial Booking Paid:</span>
                                                <span className="font-semibold text-[#1E2024]">{formatINR(booking.totalPrice)}</span>
                                            </div>

                                            {booking.actualUsageCharge != null && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[#666970]">Actual Usage Charge:</span>
                                                    <span className="font-semibold text-[#2554D7]">{formatINR(booking.actualUsageCharge)}</span>
                                                </div>
                                            )}

                                            {hasRefundRecorded && (
                                                <div className="p-2 rounded-lg bg-blue-50/80 border border-blue-100 text-blue-900 space-y-0.5">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium">Early Checkout Credit (Ledger Credit):</span>
                                                        <span className="font-bold">+{formatINR(booking.refundAdjustment)}</span>
                                                    </div>
                                                    <p className="text-[10px] text-blue-700">
                                                        Recorded in internal ledger; gateway refund has not been initiated.
                                                    </p>
                                                </div>
                                            )}

                                            {(booking.overstayExtraCharge || 0) > 0 && (
                                                <div className={`p-2 rounded-lg border space-y-0.5 ${
                                                    isOverstayPaid
                                                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                                        : 'bg-rose-50/80 border-rose-200 text-rose-900'
                                                }`}>
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium">
                                                            Overstay Surcharge {isOverstayPaid ? '(Paid)' : '(Unpaid — Payment Due)'}:
                                                        </span>
                                                        <span className="font-bold">+{formatINR(booking.overstayExtraCharge)}</span>
                                                    </div>
                                                    {!isOverstayPaid && (
                                                        <p className="text-[10px] text-rose-700">
                                                            Overstay payment is pending. Please complete payment below.
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Financial Accounting: Total Session Value vs Actual Cash Paid */}
                                            <div className="pt-2 border-t border-[#EAEAE7] space-y-1">
                                                <div className="flex justify-between items-center text-xs text-[#666970]">
                                                    <span>Total Session Value:</span>
                                                    <span className="font-semibold text-[#1E2024]">{formatINR(totalSessionCost)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm font-bold text-[#1E2024]">
                                                    <span>Actual Cash Paid:</span>
                                                    <span className="text-base text-[#2554D7]">
                                                        {formatINR(booking.totalPrice + (isOverstayPaid ? (booking.overstayExtraCharge || 0) : 0))}
                                                    </span>
                                                </div>
                                                {hasUnpaidOverstay && (
                                                    <div className="flex justify-between items-center text-xs font-semibold text-rose-700">
                                                        <span>Balance Due (Unpaid Overstay):</span>
                                                        <span>{formatINR(booking.overstayExtraCharge)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {booking.actualClosedAt && (
                                                <p className="text-[11px] text-gray-500 pt-1">
                                                    Checked out: {new Date(booking.actualClosedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Card Bottom Action Buttons */}
                                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#EAEAE7]">
                                    <div className="flex items-center gap-2">
                                        {booking.status === 'AWAITING_PAYMENT' && (
                                            <button
                                                type="button"
                                                onClick={() => handlePayment(booking.id)}
                                                disabled={isProcessingPayment}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2554D7] hover:bg-[#1D44B8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {isProcessingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                                <span>Pay Now</span>
                                            </button>
                                        )}

                                        {booking.status === 'COMPLETED' && booking.overstayExtraCharge > 0 &&
                                            (booking.overstayPaymentStatus === 'PENDING' || booking.overstayPaymentStatus === 'CREATED' || !booking.overstayPaymentStatus) && (
                                            <button
                                                type="button"
                                                onClick={() => handleOverstayPayment(booking.id)}
                                                disabled={isProcessingPayment}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                <span>Pay Overstay {formatINR(booking.overstayExtraCharge)}</span>
                                            </button>
                                        )}

                                        {canDownloadReceipt && (
                                            <button
                                                type="button"
                                                onClick={() => downloadReceipt(booking.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EAEAE7] hover:bg-gray-50 text-[#1E2024] text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                <Download className="w-3.5 h-3.5 text-gray-500" />
                                                <span>Download Receipt</span>
                                            </button>
                                        )}
                                    </div>

                                    {canCancel && (
                                        <button
                                            type="button"
                                            onClick={() => handleCancelClick(booking.id)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            <span>Cancel Booking</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {cancelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl border border-[#EAEAE7] shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[#1E2024]">Cancel Parking Reservation</h2>
                            <p className="text-xs text-[#666970] mt-1 leading-relaxed">
                                Are you sure you want to cancel this booking? This action cannot be undone and will release your reserved slot immediately.
                            </p>
                        </div>
                        <div className="pt-2 flex justify-end gap-3 border-t border-[#EAEAE7]">
                            <button
                                type="button"
                                onClick={() => setCancelModalOpen(false)}
                                disabled={isCancelling}
                                className="px-4 py-2 rounded-xl border border-[#EAEAE7] text-xs font-semibold text-[#1E2024] hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Keep Booking
                            </button>
                            <button
                                type="button"
                                onClick={executeCancel}
                                disabled={isCancelling}
                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                <span>Yes, Cancel Booking</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Mode Mock Payment Confirmation Modal */}
            {mockPaymentModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mock-payment-title"
                >
                    <div className="bg-white rounded-2xl border border-[#EAEAE7] shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Test Mode — Simulated Gateway
                                </span>
                                <h2 id="mock-payment-title" className="text-base font-bold text-[#1E2024] mt-1">
                                    {mockPaymentModal.type === 'OVERSTAY' ? 'Confirm Overstay Charge Payment' : 'Confirm Reservation Payment'}
                                </h2>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7] space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-[#666970]">Payment Type:</span>
                                <span className="font-semibold text-[#1E2024]">{mockPaymentModal.title}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-[#666970]">Amount Due:</span>
                                <span className="text-base font-bold text-[#2554D7]">{formatINR(mockPaymentModal.amount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-[#666970]">
                                <span>Simulated Order ID:</span>
                                <span className="font-mono text-[11px] text-gray-600">{mockPaymentModal.razorpayOrderId}</span>
                            </div>
                        </div>

                        <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 text-xs text-blue-900 space-y-1">
                            <p className="font-semibold flex items-center gap-1.5 text-blue-800">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Simulated Payment (No Real Funds Deducted)</span>
                            </p>
                            <p className="text-[11px] text-blue-700 leading-relaxed">
                                Razorpay test placeholder key (<code className="font-mono text-[10px] bg-blue-100/70 px-1 py-0.5 rounded">rzp_test_placeholder</code>) is configured. This is a simulation for development and testing. Confirming will simulate a successful payment gateway response and update the status.
                            </p>
                        </div>

                        <div className="pt-2 flex justify-end gap-3 border-t border-[#EAEAE7]">
                            <button
                                type="button"
                                onClick={() => {
                                    setMockPaymentModal(null);
                                    setIsProcessingPayment(false);
                                }}
                                disabled={isConfirmingMockPayment}
                                className="px-4 py-2 rounded-xl border border-[#EAEAE7] text-xs font-semibold text-[#1E2024] hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmMockPayment}
                                disabled={isConfirmingMockPayment}
                                className="px-4 py-2 rounded-xl bg-[#2554D7] hover:bg-[#1D44B8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {isConfirmingMockPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                <span>{isConfirmingMockPayment ? 'Processing...' : 'Confirm Test Payment'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverBookings;
