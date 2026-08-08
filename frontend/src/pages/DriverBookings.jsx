import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { Clock, CheckCircle, XCircle, AlertCircle, Key, LogOut, AlertTriangle, DollarSign } from 'lucide-react';

const StatusBadge = ({ status }) => {
    switch(status) {
        case 'PENDING':
            return <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold"><Clock size={14}/> Pending</span>;
        case 'AWAITING_PAYMENT':
            return <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold"><Clock size={14}/> Awaiting Payment</span>;
        case 'CONFIRMED':
            return <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold"><CheckCircle size={14}/> Confirmed</span>;
        case 'ACTIVE':
            return <span className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold"><Key size={14}/> Active</span>;
        case 'OVERSTAY':
            return <span className="flex items-center gap-1 px-3 py-1 bg-red-200 text-red-900 rounded-full text-xs font-bold"><AlertTriangle size={14}/> Overstay</span>;
        case 'CANCELLED':
            return <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold"><XCircle size={14}/> Cancelled</span>;
        case 'REJECTED':
            return <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold"><AlertCircle size={14}/> Rejected</span>;
        case 'AUTO_REJECTED':
            return <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold"><AlertCircle size={14}/> Auto-Rejected (Timed Out)</span>;
        case 'PAYMENT_EXPIRED':
            return <span className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold"><AlertCircle size={14}/> Payment Expired</span>;
        case 'COMPLETED':
            return <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold"><CheckCircle size={14}/> Completed</span>;
        case 'NO_SHOW':
            return <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold"><XCircle size={14}/> No Show</span>;
        default:
            return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">{status}</span>;
    }
};

// ── Closing OTP / Checkout Panel (driver-facing) ─────────────────────────────

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

    // Closing OTP already generated — show it
    if (booking.closingOtpCode) {
        return (
            <div className="mt-2 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-300 rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full">
                    <LogOut size={24} className="text-orange-600" />
                </div>
                <div>
                    <p className="text-xs text-orange-700 font-semibold uppercase tracking-wider mb-1">
                        Your Closing OTP (Departure)
                    </p>
                    <p className="text-4xl font-mono font-extrabold text-orange-800 tracking-[0.3em] leading-none">
                        {booking.closingOtpCode}
                    </p>
                    <p className="text-sm text-orange-600 mt-2">
                        Show this OTP to the parking owner to confirm your departure.
                    </p>
                </div>
            </div>
        );
    }

    // Checkout not yet initiated — show button
    return (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
                <p className="text-sm font-semibold text-gray-700">Ready to leave?</p>
                <p className="text-xs text-gray-500 mt-1">Click the button to generate your closing OTP and confirm departure with the owner.</p>
            </div>
            <button
                onClick={handleInitiateCheckout}
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap flex items-center gap-2"
            >
                <LogOut size={16} />
                {loading ? 'Processing...' : "I'm Ready to Leave"}
            </button>
        </div>
    );
};

// ── Overstay extra charge display ────────────────────────────────────────────

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
        const interval = setInterval(update, 60000); // update every minute
        return () => clearInterval(interval);
    }, [booking.overstayStartedAt]);

    if (!booking.overstayStartedAt) return null;

    const ratePerMinute = (booking.totalPrice / 60); // approximate per-minute rate
    const liveCharge = (liveMinutes * (booking.totalPrice / 60)).toFixed(2);

    return (
        <div className="mt-2 bg-red-50 border border-red-300 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-600" />
                <p className="text-sm font-bold text-red-800">Overstay Charges Accumulating</p>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-red-600">
                        Overstay since: <strong>{new Date(booking.overstayStartedAt).toLocaleTimeString([], { timeStyle: 'short' })}</strong>
                    </p>
                    <p className="text-xs text-red-600">
                        Duration: <strong>{liveMinutes} min</strong>
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-red-500 uppercase tracking-wide">Live Extra Charge</p>
                    <p className="text-2xl font-extrabold text-red-700">${liveCharge}</p>
                </div>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

const DriverBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [error, setError] = useState('');
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings/driver');
            if (res.success) setBookings(res.data);
        } catch (err) {
            setError("Failed to load your bookings.");
        }
    };

    const handleCancelClick = (id) => {
        setSelectedBookingId(id);
        setCancelModalOpen(true);
    };

    const executeCancel = async () => {
        try {
            const res = await api.put(`/bookings/${selectedBookingId}/cancel`);
            if (res.success) fetchBookings();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to cancel booking.");
        } finally {
            setCancelModalOpen(false);
            setSelectedBookingId(null);
        }
    };

    const handlePayment = async (bookingId) => {
        setIsProcessingPayment(true);
        try {
            const orderRes = await api.post(`/payments/create-order/${bookingId}`);
            if (orderRes.success) {
                const { razorpayOrderId, amount, currency, keyId } = orderRes.data;

                // Mock Mode check for dev/test environment with dummy keys
                if (keyId === 'rzp_test_placeholder') {
                    const verifyRes = await api.post('/payments/verify', {
                        razorpayOrderId: razorpayOrderId,
                        razorpayPaymentId: 'pay_mock_' + Date.now(),
                        razorpaySignature: 'mock_signature'
                    });
                    if (verifyRes.success) {
                        alert("Payment successful (Test Mock)! Your booking is now confirmed. Check your OTP below.");
                        fetchBookings();
                    }
                    return;
                }

                const options = {
                    key: keyId,
                    amount: amount * 100,
                    currency: currency,
                    name: 'ParkShare',
                    description: 'Parking Reservation Payment',
                    order_id: razorpayOrderId,
                    handler: async function (response) {
                        try {
                            const verifyRes = await api.post('/payments/verify', {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature
                            });
                            if (verifyRes.success) {
                                alert("Payment successful! Your booking is now confirmed. Check your OTP below.");
                                fetchBookings();
                            }
                        } catch (err) {
                            alert("Payment verification failed.");
                        }
                    },
                    prefill: { name: 'Driver', email: 'driver@example.com' },
                    theme: { color: '#2563eb' }
                };
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response) {
                    alert("Payment failed: " + response.error.description);
                });
                rzp.open();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to initiate payment.");
        } finally {
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
            alert("Failed to download receipt.");
        }
    };

    const now = new Date();
    const TERMINAL_STATUSES = ['CANCELLED', 'REJECTED', 'AUTO_REJECTED', 'PAYMENT_EXPIRED', 'COMPLETED', 'NO_SHOW'];

    // OVERSTAY bookings are always "upcoming" (space still physically occupied)
    const upcomingBookings = bookings.filter(b =>
        ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'OVERSTAY'].includes(b.status) &&
        (new Date(b.endTime) > now || b.status === 'OVERSTAY')
    );
    const pastBookings = bookings.filter(b =>
        new Date(b.endTime) <= now && TERMINAL_STATUSES.includes(b.status)
    );

    const renderBookingCard = (booking, isUpcoming) => (
        <div key={booking.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 hover:shadow-md transition">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-bold text-gray-800">{booking.parkingSpaceTitle}</h2>
                        <StatusBadge status={booking.status} />
                    </div>
                    <p className="text-gray-500 text-sm mb-3">{booking.parkingSpaceAddress}</p>

                    <div className="flex items-center gap-6 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 inline-block w-full md:w-auto">
                        <div>
                            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Start</p>
                            <p className="font-semibold">{new Date(booking.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-300"></div>
                        <div>
                            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Scheduled End</p>
                            <p className="font-semibold">{new Date(booking.endTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end w-full md:w-auto gap-3">
                    <div className="text-right">
                        <p className="text-2xl font-extrabold text-blue-600">${booking.totalPrice.toFixed(2)}</p>
                        {booking.overstayExtraCharge > 0 && (
                            <p className="text-sm text-red-600 font-semibold flex items-center gap-1 justify-end">
                                <DollarSign size={12}/> +${booking.overstayExtraCharge.toFixed(2)} overstay
                            </p>
                        )}
                    </div>

                    {booking.status === 'AWAITING_PAYMENT' && (
                        <button
                            onClick={() => handlePayment(booking.id)}
                            disabled={isProcessingPayment}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition w-full md:w-auto shadow-sm"
                        >
                            {isProcessingPayment ? "Processing..." : "Pay Now"}
                        </button>
                    )}

                    {['CONFIRMED', 'COMPLETED', 'ACTIVE', 'OVERSTAY'].includes(booking.status) && (
                        <button
                            onClick={() => downloadReceipt(booking.id)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition w-full md:w-auto shadow-sm border border-gray-300"
                        >
                            Download Receipt
                        </button>
                    )}

                    {isUpcoming && ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(booking.status) && (
                        <button
                            onClick={() => handleCancelClick(booking.id)}
                            className="text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-bold transition w-full md:w-auto"
                        >
                            Cancel Booking
                        </button>
                    )}
                </div>
            </div>

            {/* Opening OTP — CONFIRMED bookings, visible to driver */}
            {booking.status === 'CONFIRMED' && booking.otpCode && (
                <div className="mt-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl p-4 flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full">
                        <Key size={24} className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-xs text-green-700 font-semibold uppercase tracking-wider mb-1">
                            Your Parking OTP (Arrival)
                        </p>
                        <p className="text-4xl font-mono font-extrabold text-green-800 tracking-[0.3em] leading-none">
                            {booking.otpCode}
                        </p>
                        <p className="text-sm text-green-600 mt-2">
                            Show this OTP to the parking owner when you arrive.
                        </p>
                    </div>
                </div>
            )}

            {/* ACTIVE: show checkout panel + opening OTP still visible */}
            {booking.status === 'ACTIVE' && (
                <>
                    {booking.otpCode && (
                        <div className="mt-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl p-3 flex items-center gap-3">
                            <Key size={18} className="text-green-600 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-green-700 font-semibold">Arrival OTP: <span className="font-mono text-lg text-green-800">{booking.otpCode}</span></p>
                                <p className="text-xs text-green-500">You are currently parked.</p>
                            </div>
                        </div>
                    )}
                    <CheckoutPanel booking={booking} onSuccess={fetchBookings} />
                </>
            )}

            {/* OVERSTAY: show overstay charges + checkout panel */}
            {booking.status === 'OVERSTAY' && (
                <>
                    <OverstayChargeDisplay booking={booking} />
                    <CheckoutPanel booking={booking} onSuccess={fetchBookings} />
                </>
            )}

            {/* COMPLETED: show final overstay charge if any */}
            {booking.status === 'COMPLETED' && booking.overstayExtraCharge > 0 && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={16} className="text-amber-600" />
                        <p className="text-sm font-bold text-amber-800">Overstay Charge Applied</p>
                    </div>
                    <p className="text-xs text-amber-700">
                        Original booking: <strong>${booking.totalPrice.toFixed(2)}</strong> +
                        Overstay: <strong>${booking.overstayExtraCharge.toFixed(2)}</strong> =
                        Total: <strong>${(booking.totalPrice + booking.overstayExtraCharge).toFixed(2)}</strong>
                    </p>
                    {booking.actualClosedAt && (
                        <p className="text-xs text-amber-600 mt-1">
                            Departed: {new Date(booking.actualClosedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-8">
            <h1 className="text-4xl font-extrabold mb-8 text-gray-800">My Bookings</h1>
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

            <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-700 border-b pb-3 mb-6">Upcoming Reservations</h2>
                <div className="space-y-4">
                    {upcomingBookings.map(b => renderBookingCard(b, true))}
                    {upcomingBookings.length === 0 && <p className="text-gray-500 italic bg-gray-50 p-6 rounded-lg text-center border border-dashed">You have no upcoming bookings.</p>}
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-700 border-b pb-3 mb-6">Past & Cancelled</h2>
                <div className="space-y-4">
                    {pastBookings.map(b => renderBookingCard(b, false))}
                    {pastBookings.length === 0 && <p className="text-gray-500 italic bg-gray-50 p-6 rounded-lg text-center border border-dashed">No past bookings.</p>}
                </div>
            </div>

            <ConfirmationModal
                isOpen={cancelModalOpen}
                title="Cancel Booking"
                message="Are you sure you want to cancel this booking? This action cannot be undone."
                onConfirm={executeCancel}
                onCancel={() => setCancelModalOpen(false)}
                isDestructive={true}
                confirmText="Yes, Cancel Booking"
            />
        </div>
    );
};

export default DriverBookings;
