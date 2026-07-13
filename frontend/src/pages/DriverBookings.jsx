import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DriverBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [error, setError] = useState('');

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

    const cancelBooking = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this booking?")) return;
        try {
            const res = await api.put(`/bookings/${id}/cancel`);
            if (res.success) {
                fetchBookings();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to cancel booking.");
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">My Bookings</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            
            <div className="space-y-4">
                {bookings.map(booking => (
                    <div key={booking.id} className="bg-white p-6 rounded-lg shadow border border-gray-200 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">{booking.parkingSpaceTitle}</h2>
                            <p className="text-gray-600">{booking.parkingSpaceAddress}</p>
                            <div className="mt-2 text-sm text-gray-700">
                                <p><span className="font-semibold">Start:</span> {new Date(booking.startTime).toLocaleString()}</p>
                                <p><span className="font-semibold">End:</span> {new Date(booking.endTime).toLocaleString()}</p>
                            </div>
                            <p className={`mt-2 font-bold ${booking.status === 'CONFIRMED' ? 'text-green-600' : 'text-red-500'}`}>
                                Status: {booking.status}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-gray-800">${booking.totalPrice.toFixed(2)}</p>
                            {booking.status === 'CONFIRMED' && new Date(booking.startTime) > new Date() && (
                                <button 
                                    onClick={() => cancelBooking(booking.id)}
                                    className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                                >
                                    Cancel Booking
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {bookings.length === 0 && <p className="text-gray-500">You have no bookings yet.</p>}
            </div>
        </div>
    );
};

export default DriverBookings;
