import React, { useState, useEffect } from 'react';
import api from '../services/api';

const OwnerBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings/owner');
            if (res.success) setBookings(res.data);
        } catch (err) {
            setError("Failed to load your space bookings.");
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
        <div className="max-w-5xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Reservations on your Spaces</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            
            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-4 font-semibold text-gray-600">Space</th>
                            <th className="p-4 font-semibold text-gray-600">Driver</th>
                            <th className="p-4 font-semibold text-gray-600">Time</th>
                            <th className="p-4 font-semibold text-gray-600">Total Price</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                            <th className="p-4 font-semibold text-gray-600">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map(booking => (
                            <tr key={booking.id} className="border-b hover:bg-gray-50 transition">
                                <td className="p-4">
                                    <p className="font-bold">{booking.parkingSpaceTitle}</p>
                                    <p className="text-sm text-gray-500">{booking.parkingSpaceAddress}</p>
                                </td>
                                <td className="p-4">{booking.driverName}</td>
                                <td className="p-4 text-sm">
                                    <p>{new Date(booking.startTime).toLocaleString()} -</p>
                                    <p>{new Date(booking.endTime).toLocaleString()}</p>
                                </td>
                                <td className="p-4 font-bold">${booking.totalPrice.toFixed(2)}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {booking.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {booking.status === 'CONFIRMED' && new Date(booking.startTime) > new Date() && (
                                        <button 
                                            onClick={() => cancelBooking(booking.id)}
                                            className="text-red-500 hover:underline text-sm font-semibold"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {bookings.length === 0 && <p className="p-6 text-center text-gray-500">No one has booked your spaces yet.</p>}
            </div>
        </div>
    );
};

export default OwnerBookings;
