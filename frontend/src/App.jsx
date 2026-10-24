import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import OwnerDashboard from './pages/OwnerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import ParkingSpaceDetails from './pages/ParkingSpaceDetails';
import DriverBookings from './pages/DriverBookings';
import OwnerBookings from './pages/OwnerBookings';
import EarningsDashboard from './pages/EarningsDashboard';
import Landing from './pages/Landing';

// Public layout wrapper with top navigation bar
const PublicLayout = ({ children }) => (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col text-[#1E2024]">
        <Navbar />
        <main className="flex-1">
            {children}
        </main>
    </div>
);

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public & Explore Routes (Top Navbar Layout) */}
                    <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
                    <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
                    <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
                    <Route path="/parking/:id" element={<PublicLayout><ParkingSpaceDetails /></PublicLayout>} />

                    {/* Authenticated Owner Workspace (Sidebar Dashboard Layout) */}
                    <Route
                        path="/owner-dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['OWNER']}>
                                <DashboardLayout title="My Parking Spaces">
                                    <OwnerDashboard />
                                </DashboardLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/owner/earnings"
                        element={
                            <ProtectedRoute allowedRoles={['OWNER']}>
                                <DashboardLayout title="Earnings & Settlements">
                                    <EarningsDashboard />
                                </DashboardLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/owner/bookings"
                        element={
                            <ProtectedRoute allowedRoles={['OWNER']}>
                                <DashboardLayout title="Booking Requests">
                                    <OwnerBookings />
                                </DashboardLayout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Authenticated Driver Workspace (Sidebar Dashboard Layout) */}
                    <Route
                        path="/driver-dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['DRIVER']}>
                                <DashboardLayout title="Explore Parking" fullBleed>
                                    <DriverDashboard />
                                </DashboardLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/driver/bookings"
                        element={
                            <ProtectedRoute allowedRoles={['DRIVER']}>
                                <DashboardLayout title="My Bookings">
                                    <DriverBookings />
                                </DashboardLayout>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;