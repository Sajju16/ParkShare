import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Car, Menu, X, LogOut, Compass, Calendar, DollarSign, LayoutDashboard, ArrowRight } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        setMobileOpen(false);
        navigate('/');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <header className="sticky top-0 z-40 bg-[#F8F8F6]/90 backdrop-blur-md border-b border-[#EAEAE7] transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Brand Logo */}
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl bg-[#2554D7] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                            <Car className="w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[#1E2024]">
                            Park<span className="text-[#2554D7]">Share</span>
                        </span>
                    </Link>

                    {/* Desktop Center Navigation */}
                    <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
                        <Link
                            to="/driver-dashboard"
                            className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                                isActive('/driver-dashboard')
                                    ? 'bg-[#EEF2FD] text-[#2554D7] font-semibold'
                                    : 'text-[#1E2024]/80 hover:text-[#1E2024] hover:bg-black/5'
                            }`}
                        >
                            <Compass className="w-4 h-4" />
                            Explore Parking
                        </Link>

                        {user?.role === 'OWNER' && (
                            <>
                                <Link
                                    to="/owner-dashboard"
                                    className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                                        isActive('/owner-dashboard')
                                            ? 'bg-[#EEF2FD] text-[#2554D7] font-semibold'
                                            : 'text-[#1E2024]/80 hover:text-[#1E2024] hover:bg-black/5'
                                    }`}
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    My Spaces
                                </Link>
                                <Link
                                    to="/owner/bookings"
                                    className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                                        isActive('/owner/bookings')
                                            ? 'bg-[#EEF2FD] text-[#2554D7] font-semibold'
                                            : 'text-[#1E2024]/80 hover:text-[#1E2024] hover:bg-black/5'
                                    }`}
                                >
                                    <Calendar className="w-4 h-4" />
                                    Bookings
                                </Link>
                                <Link
                                    to="/owner/earnings"
                                    className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                                        isActive('/owner/earnings')
                                            ? 'bg-[#EEF2FD] text-[#2554D7] font-semibold'
                                            : 'text-[#1E2024]/80 hover:text-[#1E2024] hover:bg-black/5'
                                    }`}
                                >
                                    <DollarSign className="w-4 h-4" />
                                    Earnings
                                </Link>
                            </>
                        )}

                        {user?.role === 'DRIVER' && (
                            <Link
                                to="/driver/bookings"
                                className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                                    isActive('/driver/bookings')
                                        ? 'bg-[#EEF2FD] text-[#2554D7] font-semibold'
                                        : 'text-[#1E2024]/80 hover:text-[#1E2024] hover:bg-black/5'
                                }`}
                            >
                                <Calendar className="w-4 h-4" />
                                My Bookings
                            </Link>
                        )}
                    </nav>

                    {/* Right User Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        {!user ? (
                            <>
                                <Link
                                    to="/login"
                                    className="px-4 py-2 text-sm font-semibold text-[#1E2024] hover:text-[#2554D7] transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-4 py-2 text-sm font-semibold text-white bg-[#2554D7] hover:bg-[#1D44B8] rounded-xl shadow-xs transition-all flex items-center gap-1.5 hover:shadow-md"
                                >
                                    Sign Up
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-[#EAEAE7] rounded-xl shadow-xs">
                                    <div className="w-6 h-6 rounded-full bg-[#EEF2FD] text-[#2554D7] flex items-center justify-center font-bold text-xs">
                                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <span className="text-xs font-semibold text-[#1E2024] max-w-[120px] truncate">
                                        {user.name}
                                    </span>
                                    <span className="text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                        {user.role}
                                    </span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Sign Out"
                                    aria-label="Sign out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Hamburger Button */}
                    <div className="flex md:hidden">
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="p-2 rounded-lg text-[#1E2024] hover:bg-black/5 transition-colors cursor-pointer"
                            aria-label="Toggle navigation menu"
                        >
                            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {mobileOpen && (
                <div className="md:hidden border-b border-[#EAEAE7] bg-[#F8F8F6] px-4 pt-2 pb-6 space-y-2">
                    <Link
                        to="/driver-dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E2024] hover:bg-black/5"
                    >
                        <Compass className="w-4 h-4 text-[#2554D7]" />
                        Explore Parking
                    </Link>

                    {user?.role === 'OWNER' && (
                        <>
                            <Link
                                to="/owner-dashboard"
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E2024] hover:bg-black/5"
                            >
                                <LayoutDashboard className="w-4 h-4 text-[#2554D7]" />
                                My Spaces
                            </Link>
                            <Link
                                to="/owner/bookings"
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E2024] hover:bg-black/5"
                            >
                                <Calendar className="w-4 h-4 text-[#2554D7]" />
                                Bookings
                            </Link>
                            <Link
                                to="/owner/earnings"
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E2024] hover:bg-black/5"
                            >
                                <DollarSign className="w-4 h-4 text-[#2554D7]" />
                                Earnings
                            </Link>
                        </>
                    )}

                    {user?.role === 'DRIVER' && (
                        <Link
                            to="/driver/bookings"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#1E2024] hover:bg-black/5"
                        >
                            <Calendar className="w-4 h-4 text-[#2554D7]" />
                            My Bookings
                        </Link>
                    )}

                    <div className="pt-4 border-t border-[#EAEAE7] flex flex-col gap-2">
                        {!user ? (
                            <>
                                <Link
                                    to="/login"
                                    onClick={() => setMobileOpen(false)}
                                    className="w-full text-center py-2.5 text-sm font-semibold text-[#1E2024] border border-[#EAEAE7] rounded-xl bg-white"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    onClick={() => setMobileOpen(false)}
                                    className="w-full text-center py-2.5 text-sm font-semibold text-white bg-[#2554D7] rounded-xl"
                                >
                                    Sign Up
                                </Link>
                            </>
                        ) : (
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#EEF2FD] text-[#2554D7] flex items-center justify-center font-bold text-xs">
                                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[#1E2024]">{user.name}</p>
                                        <p className="text-[10px] text-gray-500 uppercase">{user.role}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="text-xs font-semibold text-red-600 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;