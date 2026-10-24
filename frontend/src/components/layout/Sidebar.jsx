import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
    Car,
    Compass,
    Calendar,
    DollarSign,
    LayoutDashboard,
    LogOut,
    X,
    ChevronRight
} from 'lucide-react';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        if (setMobileOpen) setMobileOpen(false);
        navigate('/');
    };

    const isActive = (path) => location.pathname === path;

    const navItems = user?.role === 'OWNER'
        ? [
            { label: 'My Spaces', path: '/owner-dashboard', icon: LayoutDashboard },
            { label: 'Booking Requests', path: '/owner/bookings', icon: Calendar },
            { label: 'Earnings & Settlements', path: '/owner/earnings', icon: DollarSign },
        ]
        : [
            { label: 'Explore Spots', path: '/driver-dashboard', icon: Compass },
            { label: 'My Bookings', path: '/driver/bookings', icon: Calendar },
        ];

    const sidebarContent = (
        <div className="flex flex-col h-full bg-white border-r border-[#EAEAE7]">
            {/* Brand Header */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-[#EAEAE7]">
                <Link to="/" className="flex items-center gap-2.5 group">
                    <div className="w-9 h-9 rounded-xl bg-[#2554D7] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                        <Car className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-lg font-bold tracking-tight text-[#1E2024]">
                            Park<span className="text-[#2554D7]">Share</span>
                        </span>
                        <span className="block text-[10px] font-semibold text-gray-600 tracking-wide uppercase">
                            {user?.role === 'OWNER' ? 'Owner Portal' : 'Driver App'}
                        </span>
                    </div>
                </Link>
                {setMobileOpen && (
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Navigation Links */}
            <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
                <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-gray-600 uppercase">
                    Menu
                </div>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileOpen && setMobileOpen(false)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                                active
                                    ? 'bg-[#EEF2FD] text-[#2554D7] font-semibold shadow-xs'
                                    : 'text-[#1E2024]/75 hover:text-[#1E2024] hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={`w-4 h-4 transition-colors ${
                                    active ? 'text-[#2554D7]' : 'text-gray-600 group-hover:text-[#1E2024]'
                                }`} />
                                <span>{item.label}</span>
                            </div>
                            {active && <ChevronRight className="w-4 h-4 text-[#2554D7]" />}
                        </Link>
                    );
                })}
            </div>

            {/* User Profile & Sign Out Footer */}
            <div className="p-4 border-t border-[#EAEAE7] bg-gray-50/50">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#EAEAE7] shadow-xs mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#EEF2FD] text-[#2554D7] flex items-center justify-center font-bold text-xs shrink-0">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#1E2024] truncate">{user?.name || 'User'}</p>
                            <p className="text-[10px] text-gray-600 truncate">{user?.email || ''}</p>
                        </div>
                    </div>
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-[#2554D7]">
                        {user?.role || 'Guest'}
                    </span>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-100"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar (Permanent) */}
            <aside className="hidden md:block w-64 h-screen sticky top-0 shrink-0 z-30">
                {sidebarContent}
            </aside>

            {/* Mobile Sidebar (Drawer Overlay) */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10">
                        {sidebarContent}
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;