import React, { useState, useEffect } from 'react';
import api from '../services/api';

const OwnerDashboard = () => {
    const [spaces, setSpaces] = useState([]);
    const [showForm, setShowForm] = useState(false);
    // FIX 1: renamed from 'formData' to 'spaceForm' to prevent shadowing by the FormData
    // object created for multipart file upload inside handleSubmit
    const [spaceForm, setSpaceForm] = useState({
        title: '', description: '', address: '', city: '', zipCode: '',
        pricePerHour: '', pricePerDay: '',
        // FIX 4: add latitude and longitude for map markers
        latitude: '', longitude: '',
        // FIX 5: use 'BIKE' to match the backend VehicleType enum
        vehicleType: 'SEDAN', isCovered: false, hasEvCharging: false
    });
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        fetchSpaces();
    }, []);

    // FIX: Added try/catch so failures don't silently break the component
    const fetchSpaces = async () => {
        try {
            const res = await api.get('/parking/owner');
            if (res.success) setSpaces(res.data);
        } catch (err) {
            console.error('Failed to fetch parking spaces', err);
        }
    };

    const handleFileChange = (e) => setFile(e.target.files[0]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        let images = [];

        if (file) {
            setUploading(true);
            // FIX 1: local variable renamed to 'uploadForm' to avoid shadowing 'spaceForm'
            const uploadForm = new FormData();
            uploadForm.append('file', file);
            try {
                const uploadRes = await api.post('/parking/upload-image', uploadForm, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.success) images.push(uploadRes.data);
            } catch (err) {
                console.error('Upload failed', err);
                setSubmitError('Image upload failed. Saving without image.');
            }
            setUploading(false);
        }

        // FIX 1: spread 'spaceForm' (the React state), not the shadowed 'formData'
        // FIX 4: latitude and longitude are now part of spaceForm and will be sent
        const payload = {
            ...spaceForm,
            pricePerHour: parseFloat(spaceForm.pricePerHour) || 0,
            pricePerDay: spaceForm.pricePerDay ? parseFloat(spaceForm.pricePerDay) : null,
            latitude: spaceForm.latitude ? parseFloat(spaceForm.latitude) : null,
            longitude: spaceForm.longitude ? parseFloat(spaceForm.longitude) : null,
            images
        };

        try {
            const res = await api.post('/parking', payload);
            if (res.success) {
                setShowForm(false);
                setSpaceForm({
                    title: '', description: '', address: '', city: '', zipCode: '',
                    pricePerHour: '', pricePerDay: '', latitude: '', longitude: '',
                    vehicleType: 'SEDAN', isCovered: false, hasEvCharging: false
                });
                setFile(null);
                fetchSpaces();
            }
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Failed to save parking space.');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Owner Dashboard</h1>
                <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded">
                    {showForm ? 'Cancel' : 'Add Parking Space'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-8 space-y-4 max-w-2xl">
                    {submitError && <div className="text-red-600 bg-red-50 p-3 rounded text-sm">{submitError}</div>}

                    <input className="border p-2 w-full rounded" placeholder="Title *" required
                        value={spaceForm.title} onChange={e => setSpaceForm({...spaceForm, title: e.target.value})} />

                    <textarea className="border p-2 w-full rounded" placeholder="Description"
                        value={spaceForm.description} onChange={e => setSpaceForm({...spaceForm, description: e.target.value})} />

                    <input className="border p-2 w-full rounded" placeholder="Address *" required
                        value={spaceForm.address} onChange={e => setSpaceForm({...spaceForm, address: e.target.value})} />

                    <div className="flex gap-4">
                        <input className="border p-2 w-full rounded" placeholder="City"
                            value={spaceForm.city} onChange={e => setSpaceForm({...spaceForm, city: e.target.value})} />
                        <input className="border p-2 w-full rounded" placeholder="Zip Code"
                            value={spaceForm.zipCode} onChange={e => setSpaceForm({...spaceForm, zipCode: e.target.value})} />
                    </div>

                    <div className="flex gap-4">
                        <input className="border p-2 w-full rounded" type="number" step="0.01" placeholder="Price per Hour *" required
                            value={spaceForm.pricePerHour} onChange={e => setSpaceForm({...spaceForm, pricePerHour: e.target.value})} />
                        <input className="border p-2 w-full rounded" type="number" step="0.01" placeholder="Price per Day"
                            value={spaceForm.pricePerDay} onChange={e => setSpaceForm({...spaceForm, pricePerDay: e.target.value})} />
                    </div>

                    {/* FIX 4: Latitude and Longitude inputs for map markers */}
                    <div className="flex gap-4">
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Latitude <span className="text-gray-400 font-normal">(for map pin)</span>
                            </label>
                            <input className="border p-2 w-full rounded" type="number" step="any" placeholder="e.g. 12.9716"
                                value={spaceForm.latitude} onChange={e => setSpaceForm({...spaceForm, latitude: e.target.value})} />
                        </div>
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Longitude <span className="text-gray-400 font-normal">(for map pin)</span>
                            </label>
                            <input className="border p-2 w-full rounded" type="number" step="any" placeholder="e.g. 77.5946"
                                value={spaceForm.longitude} onChange={e => setSpaceForm({...spaceForm, longitude: e.target.value})} />
                        </div>
                    </div>

                    {/* FIX 5: Vehicle types aligned with backend VehicleType enum (BIKE, HATCHBACK, SEDAN, SUV) */}
                    <select className="border p-2 w-full rounded"
                        value={spaceForm.vehicleType} onChange={e => setSpaceForm({...spaceForm, vehicleType: e.target.value})}>
                        <option value="BIKE">Bike / Two Wheeler</option>
                        <option value="HATCHBACK">Hatchback</option>
                        <option value="SEDAN">Sedan</option>
                        <option value="SUV">SUV</option>
                    </select>

                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={spaceForm.isCovered}
                                onChange={e => setSpaceForm({...spaceForm, isCovered: e.target.checked})} /> Covered Parking
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={spaceForm.hasEvCharging}
                                onChange={e => setSpaceForm({...spaceForm, hasEvCharging: e.target.checked})} /> EV Charging
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="border p-2 w-full rounded" />
                    </div>

                    <button type="submit" disabled={uploading}
                        className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-green-700 transition">
                        {uploading ? 'Uploading...' : 'Save Parking Space'}
                    </button>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {spaces.map(space => (
                    <div key={space.id} className="bg-white p-4 rounded shadow border border-gray-100">
                        {space.images?.length > 0 ? (
                            <img src={space.images[0]} alt="Parking" className="w-full h-48 object-cover rounded mb-4" />
                        ) : (
                            <div className="w-full h-48 bg-gray-200 rounded mb-4 flex items-center justify-center text-gray-500">No Image</div>
                        )}
                        <h3 className="font-bold text-xl">{space.title}</h3>
                        <p className="text-gray-600 text-sm">{space.address}, {space.city}</p>
                        <p className="font-bold mt-2 text-blue-600">${space.pricePerHour}/hr</p>
                        <p className="text-xs text-gray-400 mt-1">{space.vehicleType}</p>
                        {space.latitude && space.longitude && (
                            <p className="text-xs text-green-600 mt-1">📍 {space.latitude}, {space.longitude}</p>
                        )}
                    </div>
                ))}
                {spaces.length === 0 && <p className="text-gray-500 col-span-3 text-center py-8">No parking spaces yet. Click "Add Parking Space" to add one.</p>}
            </div>
        </div>
    );
};

export default OwnerDashboard;
