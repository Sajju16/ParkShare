import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', role: 'DRIVER' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await register(formData);
            if (res.success) {
                if (res.data.role === 'OWNER') navigate('/owner-dashboard');
                else navigate('/driver-dashboard');
            } else {
                setError(res.message || 'Registration failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">Register</h2>
                {error && <div className="mb-4 text-red-600 bg-red-100 p-3 rounded">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" required className="mt-1 w-full p-2 border rounded-md" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" required className="mt-1 w-full p-2 border rounded-md" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" required className="mt-1 w-full p-2 border rounded-md" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input type="text" className="mt-1 w-full p-2 border rounded-md" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">I want to:</label>
                        <select className="mt-1 w-full p-2 border rounded-md" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                            <option value="DRIVER">Find Parking (Driver)</option>
                            <option value="OWNER">Rent out my space (Owner)</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition">Register</button>
                </form>
                <p className="mt-4 text-center text-sm">
                    Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Login here</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
