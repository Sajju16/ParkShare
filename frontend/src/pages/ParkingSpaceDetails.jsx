import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const ParkingSpaceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [space, setSpace] = useState(null);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [error, setError] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);

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

    return (
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
            <div className="md:col-span-2 space-y-6">
                <h1 className="text-4xl font-extrabold text-gray-800">{space.title}</h1>
                <p className="text-gray-500 text-lg">{space.address}, {space.city} {space.zipCode}</p>
                
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
                        <li><span className="font-semibold">Covered:</span> {space.isCovered ? "Yes" : "No"}</li>
                        <li><span className="font-semibold">EV Charging:</span> {space.hasEvCharging ? "Yes" : "No"}</li>
                        <li><span className="font-semibold">Owner:</span> {space.ownerName}</li>
                    </ul>
                </div>
            </div>

            <div className="md:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-xl sticky top-6 border border-gray-100">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">${space.pricePerHour} <span className="text-gray-500 text-lg font-normal">/ hour</span></h3>
                    {space.pricePerDay && <p className="text-gray-500 mb-6">${space.pricePerDay} / day</p>}

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
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {totalPrice > 0 && (
                                <div className="border-t pt-4 mt-4 flex justify-between items-center text-lg font-bold">
                                    <span>Total</span>
                                    <span>${totalPrice.toFixed(2)}</span>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={totalPrice <= 0 || !space.isAvailable || user?.role === 'OWNER'}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {user?.role === 'OWNER' ? 'Owners Cannot Book' : 'Reserve Now'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParkingSpaceDetails;
