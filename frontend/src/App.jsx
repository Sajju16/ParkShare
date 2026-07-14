import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import OwnerDashboard from './pages/OwnerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import ParkingSpaceDetails from './pages/ParkingSpaceDetails';
import DriverBookings from './pages/DriverBookings';
import OwnerBookings from './pages/OwnerBookings';
import EarningsDashboard from './pages/EarningsDashboard';

const Navigation = () => {
    const { user, logout } = React.useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
            <Link to="/" className="text-2xl font-extrabold text-blue-600">ParkShare</Link>
            <nav className="flex gap-4 items-center">
                {!user ? (
                    <>
                        <Link to="/login" className="text-gray-600 hover:text-blue-600">Login</Link>
                        <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded">Sign Up</Link>
                    </>
                ) : (
                    <>
                        <span className="font-medium text-gray-800">Hi, {user.name}</span>
                        {user.role === 'OWNER' && (
                            <>
                                <Link to="/owner-dashboard" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">My Spaces</Link>
                                <Link to="/owner/bookings" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Bookings</Link>
                                <Link to="/owner/earnings" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium">Earnings</Link>
                            </>
                        )}
                        {user.role === 'DRIVER' && (
                            <>
                                <Link to="/driver-dashboard" className="text-blue-600 hover:underline">Find Parking</Link>
                                <Link to="/driver/bookings" className="text-blue-600 hover:underline">My Bookings</Link>
                            </>
                        )}
                        <button onClick={handleLogout} className="text-red-500 hover:underline">Logout</button>
                    </>
                )}
            </nav>
        </header>
    );
};

const Home = () => (
    <div className="text-center mt-20 px-4">
        <h1 className="text-5xl font-extrabold text-blue-600 mb-4">Welcome to ParkShare</h1>
        <p className="text-xl text-gray-600 mb-8">Rent your unused space, or find the perfect parking spot.</p>
        <Link to="/register" className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-bold shadow-lg hover:bg-blue-700 transition">Get Started</Link>
    </div>
);

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen bg-gray-50 flex flex-col">
                    <Navigation />
                    <main className="flex-1">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/owner-dashboard" element={
                                <ProtectedRoute allowedRoles={['OWNER']}>
                                    <OwnerDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/owner/earnings" element={
                                <ProtectedRoute allowedRoles={['OWNER']}>
                                    <EarningsDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/driver-dashboard" element={
                                <ProtectedRoute allowedRoles={['DRIVER']}>
                                    <DriverDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/parking/:id" element={
                                <ParkingSpaceDetails />
                            } />
                            <Route path="/driver/bookings" element={
                                <ProtectedRoute allowedRoles={['DRIVER']}>
                                    <DriverBookings />
                                </ProtectedRoute>
                            } />
                            <Route path="/owner/bookings" element={
                                <ProtectedRoute allowedRoles={['OWNER']}>
                                    <OwnerBookings />
                                </ProtectedRoute>
                            } />
                        </Routes>
                    </main>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
