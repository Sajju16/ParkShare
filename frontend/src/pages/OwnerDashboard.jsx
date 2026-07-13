import React, { useState, useEffect } from 'react';
import api from '../services/api';

const OwnerDashboard = () => {
    const [spaces, setSpaces] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '', description: '', address: '', city: '', zipCode: '',
        pricePerHour: '', pricePerDay: '', vehicleType: 'SEDAN', isCovered: false, hasEvCharging: false
    });
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchSpaces();
    }, []);

    const fetchSpaces = async () => {
        const res = await api.get('/parking/owner');
        if (res.success) setSpaces(res.data);
    };

    const handleFileChange = (e) => setFile(e.target.files[0]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        let images = [];
        if (file) {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            try {
                const uploadRes = await api.post('/parking/upload-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.success) images.push(uploadRes.data);
            } catch (err) {
                console.error("Upload failed", err);
            }
            setUploading(false);
        }

        const res = await api.post('/parking', { ...formData, images });
        if (res.success) {
            setShowForm(false);
            fetchSpaces();
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
                    <input className="border p-2 w-full rounded" placeholder="Title" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    <textarea className="border p-2 w-full rounded" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    <input className="border p-2 w-full rounded" placeholder="Address" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    <div className="flex gap-4">
                        <input className="border p-2 w-full rounded" placeholder="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                        <input className="border p-2 w-full rounded" placeholder="Zip Code" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} />
                    </div>
                    <div className="flex gap-4">
                        <input className="border p-2 w-full rounded" type="number" placeholder="Price per Hour" required value={formData.pricePerHour} onChange={e => setFormData({...formData, pricePerHour: e.target.value})} />
                        <input className="border p-2 w-full rounded" type="number" placeholder="Price per Day" value={formData.pricePerDay} onChange={e => setFormData({...formData, pricePerDay: e.target.value})} />
                    </div>
                    <select className="border p-2 w-full rounded" value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})}>
                        <option value="BIKE">Bike</option>
                        <option value="HATCHBACK">Hatchback</option>
                        <option value="SEDAN">Sedan</option>
                        <option value="SUV">SUV</option>
                    </select>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isCovered} onChange={e => setFormData({...formData, isCovered: e.target.checked})} /> Covered</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.hasEvCharging} onChange={e => setFormData({...formData, hasEvCharging: e.target.checked})} /> EV Charging</label>
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Image</label>
                        <input type="file" onChange={handleFileChange} className="border p-2 w-full rounded" />
                    </div>
                    <button type="submit" disabled={uploading} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">
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
                        <p className="text-gray-600">{space.address}</p>
                        <p className="font-bold mt-2 text-blue-600">${space.pricePerHour}/hr</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OwnerDashboard;
