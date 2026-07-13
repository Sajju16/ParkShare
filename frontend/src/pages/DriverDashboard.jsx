import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../services/api';

// Fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DriverDashboard = () => {
    const [spaces, setSpaces] = useState([]);
    const [cityFilter, setCityFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => {
        fetchSpaces();
    }, [cityFilter, typeFilter]);

    const fetchSpaces = async () => {
        try {
            let url = '/parking/public/search?';
            if (cityFilter) url += `city=${cityFilter}&`;
            if (typeFilter) url += `vehicleType=${typeFilter}&`;
            
            const res = await api.get(url);
            if (res.success) setSpaces(res.data);
        } catch (error) {
            console.error("Failed to search spaces", error);
        }
    };

    return (
        <div className="flex h-[calc(100vh-70px)]">
            {/* Sidebar Filters & List */}
            <div className="w-1/3 bg-white p-6 overflow-y-auto border-r border-gray-200">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Find Parking</h1>
                
                <div className="mb-6 space-y-4">
                    <div>
                        <label className="block text-gray-700 font-medium mb-1">City</label>
                        <input 
                            type="text" 
                            placeholder="Enter city..." 
                            value={cityFilter}
                            onChange={(e) => setCityFilter(e.target.value)}
                            className="w-full border p-2 rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-1">Vehicle Type</label>
                        <select 
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full border p-2 rounded"
                        >
                            <option value="">Any</option>
                            <option value="HATCHBACK">Hatchback</option>
                            <option value="SEDAN">Sedan</option>
                            <option value="SUV">SUV</option>
                            <option value="TWO_WHEELER">Two Wheeler</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    {spaces.map(space => (
                        <div key={space.id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition">
                            {space.images?.length > 0 && (
                                <img src={space.images[0]} alt="Parking" className="w-full h-32 object-cover rounded mb-3" />
                            )}
                            <h3 className="font-bold text-lg">{space.title}</h3>
                            <p className="text-gray-600 text-sm mb-2">{space.address}, {space.city}</p>
                            <div className="flex justify-between items-center mt-2">
                                <span className="font-bold text-blue-600">${space.pricePerHour}/hr</span>
                                <Link to={`/parking/${space.id}`} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">View Details</Link>
                            </div>
                        </div>
                    ))}
                    {spaces.length === 0 && <p className="text-gray-500 text-center">No spaces found.</p>}
                </div>
            </div>

            {/* Map View */}
            <div className="w-2/3 h-full z-0">
                <MapContainer center={[40.7128, -74.0060]} zoom={12} className="w-full h-full">
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {spaces.map(space => (
                        space.latitude && space.longitude ? (
                            <Marker key={space.id} position={[space.latitude, space.longitude]}>
                                <Popup>
                                    <div className="text-center">
                                        <h3 className="font-bold">{space.title}</h3>
                                        <p>${space.pricePerHour}/hr</p>
                                        <Link to={`/parking/${space.id}`} className="text-blue-600 underline text-sm mt-1 inline-block">Book</Link>
                                    </div>
                                </Popup>
                            </Marker>
                        ) : null
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default DriverDashboard;
