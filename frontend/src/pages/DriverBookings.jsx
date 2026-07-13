import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const StatusBadge = ({ status }) => {
    switch(status) {
        case 'PENDING':
            return <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold"><Clock size={14}/> Pending</span>;
        case 'CONFIRMED':
            return <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold"><CheckCircle size={14}/> Confirmed</span>;
        case 'CANCELLED':
            return <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold"><XCircle size={14}/> Cancelled</span>;
        case 'REJECTED':
            return <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold"><AlertCircle size={14}/> Rejected</span>;
        case 'COMPLETED':
            return <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold"><CheckCircle size={14}/> Completed</span>;
        default:
            return <span>{status}</span>;
    }
};

const DriverBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [error, setError] = useState('');
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);

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
            if (res.success) {
                fetchBookings();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to cancel booking.");
        } finally {
            setCancelModalOpen(false);
            setSelectedBookingId(null);
        }
    };

    const now = new Date();
    const upcomingBookings = bookings.filter(b => new Date(b.startTime) > now && ['PENDING', 'CONFIRMED'].includes(b.status));
    const pastBookings = bookings.filter(b => new Date(b.startTime) <= now || ['CANCELLED', 'REJECTED', 'COMPLETED'].includes(b.status));

    const renderBookingCard = (booking, isUpcoming) => (
        <div key={booking.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition">
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
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">End</p>
                        <p className="font-semibold">{new Date(booking.endTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col items-end w-full md:w-auto">
                <p className="text-2xl font-extrabold text-blue-600 mb-4">${booking.totalPrice.toFixed(2)}</p>
                {isUpcoming && ['PENDING', 'CONFIRMED'].includes(booking.status) && (
                    <button 
                        onClick={() => handleCancelClick(booking.id)}
                        className="text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-bold transition w-full md:w-auto"
                    >
                        Cancel Booking
                    </button>
                )}
            </div>
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
